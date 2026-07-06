import { z } from "zod";

export const taskDueAtSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => Number.isFinite(new Date(value).getTime()), {
    message: "dueAt must be a valid date",
  });

export const taskResourceSchema = z.object({
  href: z.string().min(1),
  resourceId: z.string().min(1),
  resourceType: z.enum(["file", "folder", "chat"]),
  subtitle: z.string().nullable(),
  title: z.string().min(1),
});

export const taskMutationSchema = z.object({
  assigneeUserId: z.string().min(1).nullable().optional(),
  description: z.string().nullable().optional(),
  dueAt: taskDueAtSchema.nullable().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  resources: z.array(taskResourceSchema).optional(),
  status: z.enum(["planned", "drafting", "polishing", "completed"]).optional(),
  title: z.string().optional(),
});

export const taskCreateSchema = taskMutationSchema.extend({
  title: z.string().trim().min(1),
});
