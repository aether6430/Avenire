import { Schema } from "effect-v4";

export const extensionDestinationRequestSchema = Schema.Struct({
  folderId: Schema.String.check(Schema.isUUID(4)),
  label: Schema.optional(Schema.Trim.check(Schema.isMaxLength(80))),
  workspaceId: Schema.String.check(Schema.isUUID(4)),
});
