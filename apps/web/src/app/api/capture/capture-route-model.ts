import { z } from "zod";
import { taskResourceSchema } from "../tasks/task-route-model";

const optionalDateStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => Number.isFinite(new Date(value).getTime()), {
    message: "dueAt must be a valid date",
  });

export const captureKindSchema = z.object({
  kind: z.enum(["task", "note", "misconception"]),
});

export const taskCaptureSchema = z.object({
  assigneeUserId: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  dueAt: optionalDateStringSchema.optional(),
  kind: z.literal("task"),
  resources: z.array(taskResourceSchema).optional(),
  title: z.string().optional(),
});

export const noteCaptureSchema = z.object({
  content: z.string().optional(),
  kind: z.literal("note"),
  title: z.string().optional(),
});

export const misconceptionCaptureSchema = z.object({
  concept: z.string().optional(),
  confidence: z.coerce.number().finite().min(0).max(1).optional(),
  kind: z.literal("misconception"),
  reason: z.string().optional(),
  subject: z.string().optional(),
  topic: z.string().optional(),
});

export const capturePayloadSchema = z.discriminatedUnion("kind", [
  taskCaptureSchema,
  noteCaptureSchema,
  misconceptionCaptureSchema,
]);
