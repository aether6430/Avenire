import { APIError, type BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import {
  getWaitlistAccessStateByEmail,
  getWaitlistAccessStateByUserId,
  hasWaitlistAccess,
  markWaitlistRegistered,
  normalizeEmail,
  type WaitlistAccessState,
} from "@avenire/database";
import {
  WAITLIST_ERROR_NONE,
  WAITLIST_ERROR_PENDING,
} from "./waitlist-shared";

function getEmailFromBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const maybeEmail = (body as Record<string, unknown>).email;
  return typeof maybeEmail === "string" ? maybeEmail : null;
}

function getWaitlistErrorCode(status: WaitlistAccessState) {
  return status === "pending" ? WAITLIST_ERROR_PENDING : WAITLIST_ERROR_NONE;
}

export function waitlistPlugin(): BetterAuthPlugin {
  return {
    id: "waitlist",
    init() {
      return {
        options: {
          databaseHooks: {
            user: {
              create: {
                before: async (newUser) => {
                  const status = await getWaitlistAccessStateByEmail(newUser.email);
                  if (!hasWaitlistAccess(status)) {
                    throw new APIError("FORBIDDEN", {
                      message: getWaitlistErrorCode(status),
                    });
                  }
                },
              },
            },
            session: {
              create: {
                before: async (newSession) => {
                  const status = await getWaitlistAccessStateByUserId(newSession.userId);
                  if (!hasWaitlistAccess(status)) {
                    throw new APIError("FORBIDDEN", {
                      message: getWaitlistErrorCode(status),
                    });
                  }
                },
              },
            },
          },
        },
      };
    },
    hooks: {
      before: [
        {
          matcher: (ctx) => {
            const path = ctx.path ?? "";
            return path.startsWith("/sign-up/email");
          },
          handler: createAuthMiddleware(async (ctx) => {
            const email = getEmailFromBody(ctx.body);
            if (!email) {
              throw new APIError("BAD_REQUEST", { message: "Email is required." });
            }

            const status = await getWaitlistAccessStateByEmail(normalizeEmail(email));
            if (!hasWaitlistAccess(status)) {
              throw new APIError("FORBIDDEN", {
                message: getWaitlistErrorCode(status),
              });
            }
          }),
        },
      ],
      after: [
        {
          matcher: (ctx) => {
            const path = ctx.path ?? "";
            return (
              path.startsWith("/sign-up/email") ||
              path.includes("/callback/") ||
              path.includes("/sign-in/")
            );
          },
          handler: createAuthMiddleware(async (ctx) => {
            const newSession = ctx.context.newSession;
            if (!newSession?.user) {
              return;
            }

            const status = await getWaitlistAccessStateByUserId(newSession.user.id);
            if (!hasWaitlistAccess(status)) {
              ctx.context.setNewSession(null);
              throw new APIError("FORBIDDEN", {
                message: getWaitlistErrorCode(status),
              });
            }

            if (status === "approved") {
              try {
                await markWaitlistRegistered(newSession.user.email);
              } catch (error) {
                console.error("[waitlist] failed to mark registered", {
                  email: newSession.user.email,
                  error,
                });
              }
            }
          }),
        },
      ],
    },
  };
}
