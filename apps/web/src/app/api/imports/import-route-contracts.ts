import { Schema } from "effect-v4";

const nonEmptyId = Schema.String.check(Schema.isMinLength(1));

export const importDestinationRequestSchema = Schema.Struct({
  folderId: Schema.String.check(Schema.isUUID(4)),
  workspaceId: Schema.String.check(Schema.isUUID(4)),
});

export const notionImportRequestSchema = Schema.Struct({
  pageIds: Schema.Array(nonEmptyId).check(Schema.isLengthBetween(1, 50)),
});

export const googleDriveImportRequestSchema = Schema.Struct({
  fileIds: Schema.Array(nonEmptyId).check(Schema.isLengthBetween(1, 50)),
});
