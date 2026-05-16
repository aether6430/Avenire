import { z } from "zod";

const USER_SETTINGS_PET_ACCESSORIES = [
  "none",
  "flower",
  "pencil",
  "duck",
  "bamboo-copter",
] as const;

const USER_SETTINGS_PET_NAME_MAX_LENGTH = 32;

const optionalTrimmedPetName = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim().slice(0, USER_SETTINGS_PET_NAME_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const optionalTrimmedPetAccessory = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.enum(USER_SETTINGS_PET_ACCESSORIES).optional());

const userSettingsUpdateSchema = z
  .object({
    emailReceipts: z.boolean().optional(),
    completedTasksAtTop: z.boolean().optional(),
    onboardingCompleted: z.boolean().optional(),
    petName: optionalTrimmedPetName,
    petAccessory: optionalTrimmedPetAccessory,
  })
  .refine(
    (value) =>
      value.emailReceipts !== undefined ||
      value.completedTasksAtTop !== undefined ||
      value.onboardingCompleted !== undefined ||
      value.petName !== undefined ||
      value.petAccessory !== undefined
  );

export const USER_SETTINGS_UPDATE_ERROR =
  "Provide at least one setting: emailReceipts, completedTasksAtTop, onboardingCompleted, petName, petAccessory";

export function parseUserSettingsUpdatePayload(payload: unknown) {
  return userSettingsUpdateSchema.safeParse(payload);
}
