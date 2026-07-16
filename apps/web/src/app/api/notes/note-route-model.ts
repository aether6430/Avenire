import { Schema } from "effect-v4";

const notePageSchema = Schema.Struct({
  bannerUrl: Schema.optional(Schema.NullOr(Schema.String)),
  icon: Schema.optional(Schema.NullOr(Schema.String)),
  properties: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});

export const noteUpdateSchema = Schema.Struct({
  content: Schema.optional(Schema.String),
  page: Schema.optional(notePageSchema),
});

export const noteSyncSchema = Schema.Struct({
  base: Schema.String,
  current: Schema.String,
});
