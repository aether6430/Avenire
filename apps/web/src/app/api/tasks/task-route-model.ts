import { Schema } from "effect-v4";

export const taskDueAtSchema = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isPattern(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
  )
);

export const taskResourceSchema = Schema.Struct({
  href: Schema.String.check(Schema.isMinLength(1)),
  resourceId: Schema.String.check(Schema.isMinLength(1)),
  resourceType: Schema.Literals(["file", "folder", "chat"]),
  subtitle: Schema.NullOr(Schema.String),
  title: Schema.String.check(Schema.isMinLength(1)),
});

const taskMutationFields = {
  assigneeUserId: Schema.optional(
    Schema.NullOr(Schema.String.check(Schema.isMinLength(1)))
  ),
  description: Schema.optional(Schema.NullOr(Schema.String)),
  dueAt: Schema.optional(Schema.NullOr(taskDueAtSchema)),
  priority: Schema.optional(Schema.Literals(["low", "normal", "high"])),
  resources: Schema.optional(Schema.Array(taskResourceSchema)),
  status: Schema.optional(
    Schema.Literals(["planned", "drafting", "polishing", "completed"])
  ),
  title: Schema.optional(Schema.String),
};

export const taskMutationSchema = Schema.Struct(taskMutationFields);
export const taskCreateSchema = Schema.Struct({
  ...taskMutationFields,
  title: Schema.Trim.check(Schema.isMinLength(1)),
});
