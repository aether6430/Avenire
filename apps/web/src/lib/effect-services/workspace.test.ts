import { Effect, Exit, Layer } from "effect-v4";
import { describe, expect, it } from "vitest";
import {
  AuthenticatedSession,
  requireAuthenticatedUser,
  requireWorkspaceAuthorization,
  WorkspaceAccess,
  WorkspaceAccessDenied,
} from "./workspace";

const authenticatedUser = {
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  email: "person@example.com",
  emailVerified: true,
  id: "user-1",
  image: null,
  name: "Person",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("workspace Effect services", () => {
  it("substitutes the authenticated session at the workflow boundary", async () => {
    const session = Layer.succeed(AuthenticatedSession)({
      requireUser: Effect.succeed(authenticatedUser),
    });

    await expect(
      Effect.runPromise(
        requireAuthenticatedUser().pipe(Effect.provide(session))
      )
    ).resolves.toEqual(authenticatedUser);
  });

  it("returns the user after workspace access is authorized", async () => {
    const session = Layer.succeed(AuthenticatedSession)({
      requireUser: Effect.succeed(authenticatedUser),
    });
    const access = Layer.succeed(WorkspaceAccess)({
      requireAccess: () => Effect.void,
    });

    await expect(
      Effect.runPromise(
        requireWorkspaceAuthorization("workspace-1").pipe(
          Effect.provide(Layer.mergeAll(session, access))
        )
      )
    ).resolves.toEqual(authenticatedUser);
  });

  it("keeps denied workspace access in the typed error channel", async () => {
    const session = Layer.succeed(AuthenticatedSession)({
      requireUser: Effect.succeed(authenticatedUser),
    });
    const access = Layer.succeed(WorkspaceAccess)({
      requireAccess: (_userId, workspaceId) =>
        Effect.fail(
          WorkspaceAccessDenied.make({
            message: "Forbidden",
            workspaceId,
          })
        ),
    });

    const exit = await Effect.runPromiseExit(
      requireWorkspaceAuthorization("workspace-1").pipe(
        Effect.provide(Layer.mergeAll(session, access))
      )
    );

    expect(Exit.isFailure(exit)).toBe(true);
  });
});
