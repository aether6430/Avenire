import { Context, Effect, Layer, Schema } from "effect-v4";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

export type AuthenticatedUser = NonNullable<
  Awaited<ReturnType<typeof getSessionUser>>
>;

export class AuthenticationRequired extends Schema.TaggedErrorClass<AuthenticationRequired>()(
  "AuthenticationRequired",
  { message: Schema.String }
) {}

export class AuthenticationLookupFailed extends Schema.TaggedErrorClass<AuthenticationLookupFailed>()(
  "AuthenticationLookupFailed",
  { message: Schema.String }
) {}

export class WorkspaceAccessDenied extends Schema.TaggedErrorClass<WorkspaceAccessDenied>()(
  "WorkspaceAccessDenied",
  {
    message: Schema.String,
    workspaceId: Schema.String,
  }
) {}

export class WorkspaceAccessLookupFailed extends Schema.TaggedErrorClass<WorkspaceAccessLookupFailed>()(
  "WorkspaceAccessLookupFailed",
  {
    message: Schema.String,
    workspaceId: Schema.String,
  }
) {}

export type WorkspaceAuthorizationError =
  | AuthenticationRequired
  | AuthenticationLookupFailed
  | WorkspaceAccessDenied
  | WorkspaceAccessLookupFailed;

export class AuthenticatedSession extends Context.Service<
  AuthenticatedSession,
  {
    readonly requireUser: Effect.Effect<
      AuthenticatedUser,
      AuthenticationRequired | AuthenticationLookupFailed
    >;
  }
>()("AuthenticatedSession") {}

export class WorkspaceAccess extends Context.Service<
  WorkspaceAccess,
  {
    readonly requireAccess: (
      userId: string,
      workspaceId: string
    ) => Effect.Effect<
      void,
      WorkspaceAccessDenied | WorkspaceAccessLookupFailed
    >;
  }
>()("WorkspaceAccess") {}

export const requireAuthenticatedUser = Effect.fn(
  "workspace.requireAuthenticatedUser"
)(function* () {
  const session = yield* AuthenticatedSession;
  return yield* session.requireUser;
});

export const requireWorkspaceAuthorization = Effect.fn(
  "workspace.requireAuthorization"
)(function* (workspaceId: string) {
  const session = yield* AuthenticatedSession;
  const access = yield* WorkspaceAccess;
  const user = yield* session.requireUser;
  yield* access.requireAccess(user.id, workspaceId);
  return user;
});

export const AuthenticatedSessionLive = Layer.succeed(AuthenticatedSession)({
  requireUser: Effect.tryPromise({
    catch: () =>
      AuthenticationLookupFailed.make({
        message: "Unable to resolve authenticated session",
      }),
    try: getSessionUser,
  }).pipe(
    Effect.flatMap((user) =>
      user
        ? Effect.succeed(user)
        : Effect.fail(AuthenticationRequired.make({ message: "Unauthorized" }))
    )
  ),
});

export const WorkspaceAccessLive = Layer.succeed(WorkspaceAccess)({
  requireAccess: (userId, workspaceId) =>
    Effect.tryPromise({
      catch: () =>
        WorkspaceAccessLookupFailed.make({
          message: "Unable to verify workspace access",
          workspaceId,
        }),
      try: () => ensureWorkspaceAccessForUser(userId, workspaceId),
    }).pipe(
      Effect.flatMap((allowed) =>
        allowed
          ? Effect.void
          : Effect.fail(
              WorkspaceAccessDenied.make({
                message: "Forbidden",
                workspaceId,
              })
            )
      )
    ),
});

export const WorkspaceServicesLive = Layer.mergeAll(
  AuthenticatedSessionLive,
  WorkspaceAccessLive
);
