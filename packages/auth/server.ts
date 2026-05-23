import { db } from "@avenire/database";
import {
  account,
  invitation,
  member,
  organization as organizationTable,
  passkey as passkeyTable,
  session,
  user,
  verification,
} from "@avenire/database/auth-schema";
import { passkey } from "@better-auth/passkey";
import { checkout, polar, portal } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";
import { lastLoginMethod, organization } from "better-auth/plugins";
import { username } from "better-auth/plugins/username";
import { parseOriginList, resolveTrustedOrigins } from "./origin-policy";
import {
  sendDeleteAccountVerificationEmail,
  sendFileShareEmail,
  sendResetPasswordEmail,
  sendSudoVerificationCodeEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendWorkspaceShareEmail,
} from "./server-mailers";
import { provisionWelcomeWorkspaceForUser } from "./server-workspace-bootstrap";
import { waitlistPlugin } from "./waitlist";

const appUrl = process.env.BETTER_AUTH_URL?.trim();
if (!appUrl) {
  throw new Error(
    "Missing BETTER_AUTH_URL. Set BETTER_AUTH_URL for auth server configuration."
  );
}
function getRequestOrigin(request: unknown) {
  const headers =
    request && typeof request === "object" && "headers" in request
      ? Reflect.get(request, "headers")
      : null;

  if (!headers) {
    return null;
  }

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return headers.get("origin");
  }

  if (typeof headers === "object" && headers !== null) {
    const originHeader =
      Reflect.get(headers, "origin") ?? Reflect.get(headers, "Origin");

    return typeof originHeader === "string" ? originHeader : null;
  }

  return null;
}

const trustedOriginsFromEnv = parseOriginList(
  process.env.BETTER_AUTH_TRUSTED_ORIGINS
);
const extensionOriginsFromEnv = parseOriginList(
  process.env.BETTER_AUTH_EXTENSION_ORIGINS
);
const polarAccessToken = process.env.POLAR_ACCESS_TOKEN?.trim();
const polarServer =
  process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
const polarClient = polarAccessToken
  ? new Polar({
      accessToken: polarAccessToken,
      server: polarServer,
    })
  : null;
const polarCheckoutProducts = [
  {
    env: "POLAR_PRODUCT_ID_CORE_MONTHLY",
    slug: "core-monthly",
  },
  {
    env: "POLAR_PRODUCT_ID_CORE_YEARLY",
    slug: "core-yearly",
  },
  {
    env: "POLAR_PRODUCT_ID_SCHOLAR_MONTHLY",
    slug: "scholar-monthly",
  },
  {
    env: "POLAR_PRODUCT_ID_SCHOLAR_YEARLY",
    slug: "scholar-yearly",
  },
]
  .map((product) => {
    const productId = process.env[product.env]?.trim();
    if (!productId) {
      return null;
    }

    return {
      productId,
      slug: product.slug,
    };
  })
  .filter((product): product is { productId: string; slug: string } =>
    Boolean(product)
  );
const generatedBetterAuthSchema = {
  user,
  session,
  account,
  verification,
  organization: organizationTable,
  member,
  invitation,
  passkey: passkeyTable,
};

export const auth = betterAuth({
  trustedOrigins: async (request) => {
    const requestOrigin = getRequestOrigin(request);

    return resolveTrustedOrigins({
      appUrl,
      extensionOriginsFromEnv,
      nodeEnv: process.env.NODE_ENV,
      requestOrigin,
      trustedOriginsFromEnv,
    });
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: generatedBetterAuthSchema,
  }),
  session: {
    updateAge: 60 * 60,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail({
        email: user.email,
        name: user.name,
        resetLink: url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        confirmationLink: url,
        email: user.email,
        name: user.name,
      });
    },
  },
  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        await sendDeleteAccountVerificationEmail({
          confirmationLink: url,
          email: user.email,
          name: user.name,
        });
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
      trustedProviders: ["google", "github", "notion"],
    },
  },
  socialProviders: {
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? {
          google: {
            accessType: "offline",
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            prompt: "select_account consent",
            mapProfileToUser: (profile) => ({
              name: profile.given_name ?? profile.name,
              username: profile.name,
            }),
          },
        }
      : {}),
    ...(process.env.AUTH_NOTION_ID && process.env.AUTH_NOTION_SECRET
      ? {
          notion: {
            clientId: process.env.AUTH_NOTION_ID,
            clientSecret: process.env.AUTH_NOTION_SECRET,
          },
        }
      : {}),
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? {
          github: {
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
            mapProfileToUser: (profile) => ({
              name: profile.name,
              username: profile.name,
            }),
          },
        }
      : {}),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await sendWelcomeEmail({
              email: user.email,
              name: user.name,
            });
          } catch (error) {
            console.error("[auth] failed to send welcome email", {
              error,
              email: user.email,
            });
          }
          try {
            await provisionWelcomeWorkspaceForUser({
              email: user.email,
              name: user.name,
              userId: user.id,
            });
          } catch (error) {
            console.error("Failed to create default workspace", error);
          }
        },
      },
    },
  },
  plugins: [
    lastLoginMethod(),
    waitlistPlugin(),
    ...(polarClient
      ? [
          polar({
            client: polarClient,
            createCustomerOnSignUp: true,
            use: [
              portal(),
              ...(polarCheckoutProducts.length
                ? [
                    checkout({
                      products: polarCheckoutProducts,
                      authenticatedUsersOnly: true,
                      returnUrl:
                        "/workspace?overlay=settings&settingsTab=billing",
                      successUrl:
                        "/workspace?overlay=settings&settingsTab=billing&checkout=success",
                    }),
                  ]
                : []),
            ],
          }),
        ]
      : []),
    username({
      usernameValidator: () => true,
    }),
    organization(),
    passkey({
      rpName: "Avenire",
      origin: appUrl,
    }),
    nextCookies(),
  ],
  onAPIError: {
    throw: false,
    errorURL: `${appUrl.replace(/\/$/, "")}/login`,
  },
});

export const authRouteHandlers = toNextJsHandler(auth);

export type Session = typeof auth.$Infer.Session;
export {
  sendFileShareEmail,
  sendSudoVerificationCodeEmail,
  sendWorkspaceShareEmail,
};
