import { Schema } from "effect-v4";

export const misconceptionScopeSchema = Schema.Struct({
  concept: Schema.Trim.check(Schema.isMinLength(1)),
  subject: Schema.Trim.check(Schema.isMinLength(1)),
  topic: Schema.Trim.check(Schema.isMinLength(1)),
});

export const misconceptionImproveSchema = Schema.Struct({
  ...misconceptionScopeSchema.fields,
  decay: Schema.optional(Schema.Finite),
  delta: Schema.optional(Schema.Finite),
  resolveThreshold: Schema.optional(Schema.Finite),
});
