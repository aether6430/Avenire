import { z } from "zod";

export const flashcardReviewSchema = z.object({
  answerText: z.string().nullable().optional(),
  cardId: z.string().min(1),
  rating: z.enum(["again", "hard", "good", "easy"]),
});

export const flashcardSetMutationSchema = z.object({
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  title: z.string().optional(),
});

export const flashcardCardCreateSchema = z.object({
  backMarkdown: z.string().optional(),
  frontMarkdown: z.string().optional(),
  notesMarkdown: z.string().nullable().optional(),
  source: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const flashcardCardUpdateSchema = z.object({
  backMarkdown: z.string().optional(),
  frontMarkdown: z.string().optional(),
  notesMarkdown: z.string().nullable().optional(),
  source: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const flashcardEnrollmentSchema = z.object({
  newCardsPerDay: z.number().int().min(1).max(100).optional(),
  status: z.enum(["active", "paused"]).optional(),
});
