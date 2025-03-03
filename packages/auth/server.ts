import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { createClient } from "redis";
import { database } from "@avenire/database";

import * as schema from "@avenire/database/schema";
import { Emailer, renderEmail } from "@avenire/emailer";
import { VerificationLink } from "@avenire/email";
import { passkey } from "better-auth/plugins/passkey";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins/username";

const redis = createClient({
  url: process.env.REDIS_DB_URL,
});
await redis.connect();

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  trustedOrigins: ["http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }: any, request) => {
      const emailer = new Emailer();
      await emailer.send(
        "Avenire <hello@avenire.com>",
        [user.email],
        "Verify your email",
        await renderEmail(
          VerificationLink({ verificationLink: url, username: user.username })
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
            userId: user.id, // The current user's ID
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
      if (ttl) {
        await redis.set(key, value, { EX: ttl });
      } else {
        await redis.set(key, value);
      }
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
  plugins: [
    username(),
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
