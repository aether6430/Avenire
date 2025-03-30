import { betterAuth, BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { createClient } from "redis";
import { database } from "@avenire/database";

import * as schema from "@avenire/database/schema";
import { Emailer, renderEmail } from "@avenire/emailer";
import { EmailConfirmation, DeleteAccountConfirmation, PasswordReset, WelcomeUserMessage } from "@avenire/email";
import { passkey } from "better-auth/plugins/passkey";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins/username";
import { createAuthMiddleware } from "better-auth/api";

const redis = createClient({
  url: process.env.REDIS_DB_URL,
});
(async () => {
  await redis.connect();
})();

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  trustedOrigins: ["http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async (
      {
        user,   // The user object
        url, // The auto-generated URL for deletion
        token  // The verification token  (can be used to generate custom URL)
      },
      request  // The original request object (optional)
    ) => {
      const emailer = new Emailer();
      emailer.send(
        "Avenire <hello@avenire.com>",
        [user.email],
        "Reset your password",
        await renderEmail(
          PasswordReset({ resetLink: `${url}&token=${token}`, name: (user as any).username })
        )
      );
    },
  },
  session: {
    preserveSessionInDatabase: false,
    updateAge: 60 * 60
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      console.info(ctx.path)
      if (ctx.path.startsWith("/api/auth/sign-up")) {
        const newSession = ctx.context.newSession;
        if (newSession) {
          const emailer = new Emailer();
          emailer.send(
            "Avenire <hello@avenire.com>",
            [newSession.user.email],
            "Welcome to Avenire!",
            await renderEmail(
              WelcomeUserMessage({ name: (newSession.user as any).username })
            )
          );
        }
      }
    }),
  },
  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async (
        {
          user,   // The user object
          url, // The auto-generated URL for deletion
          token  // The verification token  (can be used to generate custom URL)
        },
        request  // The original request object (optional)
      ) => {
        const emailer = new Emailer();
        emailer.send(
          "Avenire <hello@avenire.com>",
          [user.email],
          "ACCOUNT DELETION VERIFICATION",
          await renderEmail(
            DeleteAccountConfirmation({ confirmationLink: `${url}?callbackURL=/dashboard&token=${token}`, name: (user as any).username })
          )
        );
      },

    }
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      const emailer = new Emailer();
      emailer.send(
        "Avenire <hello@avenire.com>",
        [user.email],
        "Verify your email",
        await renderEmail(
          EmailConfirmation({ confirmationLink: `${url}/dashboard&token=${token}`, name: (user as any).username })
        )
      );
    },
  },
  account: {
    accountLinking: {
      allowDifferentEmails: true,
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      mapProfileToUser: (profile) => {
        return {
          name: profile.given_name,
          username: profile.name,
        };
      },
    },
    github: {
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      mapProfileToUser: (profile) => {
        return {
          name: profile.name,
          username: profile.name,
        };
      },
    },
  },
  database: drizzleAdapter(database, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await database.insert(schema.settings).values({
            userId: user.id,
          });
        },
      },
    },
  },
  secondaryStorage: {
    get: async (key) => {
      const value = await redis.get(key);
      return value ? value : null;
    },
    set: async (key, value, ttl) => {
      if (ttl) { await redis.set(key, value, { EX: ttl }) }
      else { await redis.set(key, value) };
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
  plugins: [
    username({
      usernameValidator: () => true
    }),
    passkey({
      rpName: "Avenire",
      origin: "http://localhost:3000",
    }),
    nextCookies(),
  ],
  onAPIError: {
    throw: false,
  },
});
