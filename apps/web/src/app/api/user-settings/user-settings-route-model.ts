import { Schema } from "effect-v4";

export const userSettingsMutationSchema = Schema.Struct({
  emailReceipts: Schema.optional(Schema.Boolean),
  completedTasksAtTop: Schema.optional(Schema.Boolean),
  onboardingCompleted: Schema.optional(Schema.Boolean),
  petName: Schema.optional(Schema.Trim.check(Schema.isMinLength(1))),
  petAccessory: Schema.optional(Schema.Trim.check(Schema.isMinLength(1))),
});
