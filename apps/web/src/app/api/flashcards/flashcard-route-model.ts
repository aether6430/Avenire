import { Schema } from "effect-v4";

export const flashcardReviewSchema = Schema.Struct({
  answerText: Schema.optional(Schema.NullOr(Schema.String)),
  cardId: Schema.String.check(Schema.isMinLength(1)),
  rating: Schema.Literals(["again", "hard", "good", "easy"]),
});

export const flashcardSetMutationSchema = Schema.Struct({
  description: Schema.optional(Schema.NullOr(Schema.String)),
  tags: Schema.optional(Schema.Array(Schema.String)),
  title: Schema.optional(Schema.String),
});

export const flashcardCardCreateSchema = Schema.Struct({
  backMarkdown: Schema.optional(Schema.String),
  frontMarkdown: Schema.optional(Schema.String),
  notesMarkdown: Schema.optional(Schema.NullOr(Schema.String)),
  source: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  tags: Schema.optional(Schema.Array(Schema.String)),
});

export const flashcardCardUpdateSchema = Schema.Struct({
  backMarkdown: Schema.optional(Schema.String),
  frontMarkdown: Schema.optional(Schema.String),
  notesMarkdown: Schema.optional(Schema.NullOr(Schema.String)),
  source: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  tags: Schema.optional(Schema.Array(Schema.String)),
});

export const flashcardEnrollmentSchema = Schema.Struct({
  newCardsPerDay: Schema.optional(
    Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 100 }))
  ),
  status: Schema.optional(Schema.Literals(["active", "paused"])),
});
