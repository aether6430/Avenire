import { Schema } from "effect-v4";

const nonEmptyString = Schema.String.check(Schema.isMinLength(1));
const taskResourceSchema = Schema.Struct({
  href: nonEmptyString,
  resourceId: nonEmptyString,
  resourceType: Schema.Literals(["file", "folder", "chat"]),
  subtitle: Schema.NullOr(Schema.String),
  title: nonEmptyString,
});

const taskCaptureSchema = Schema.Struct({
  assigneeUserId: Schema.optional(Schema.Trim.check(Schema.isMinLength(1))),
  description: Schema.optional(Schema.String),
  dueAt: Schema.optional(nonEmptyString),
  kind: Schema.Literal("task"),
  resources: Schema.optional(Schema.Array(taskResourceSchema)),
  title: Schema.optional(Schema.String),
});

const noteCaptureSchema = Schema.Struct({
  content: Schema.optional(Schema.String),
  kind: Schema.Literal("note"),
  title: Schema.optional(Schema.String),
});

const misconceptionCaptureSchema = Schema.Struct({
  concept: Schema.optional(Schema.String),
  confidence: Schema.optional(
    Schema.Number.check(Schema.isFinite(), Schema.isBetween(0, 1))
  ),
  kind: Schema.Literal("misconception"),
  reason: Schema.optional(Schema.String),
  subject: Schema.optional(Schema.String),
  topic: Schema.optional(Schema.String),
});

export const capturePayloadSchema = Schema.Union([
  taskCaptureSchema,
  noteCaptureSchema,
  misconceptionCaptureSchema,
]);
