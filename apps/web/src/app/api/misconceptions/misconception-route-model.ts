import { z } from "zod";

export const misconceptionScopeSchema = z.object({
  concept: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  topic: z.string().trim().min(1),
});

export const misconceptionImproveSchema = misconceptionScopeSchema.extend({
  decay: z.number().finite().optional(),
  delta: z.number().finite().optional(),
  resolveThreshold: z.number().finite().optional(),
});
