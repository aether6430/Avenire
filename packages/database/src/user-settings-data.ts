import { eq } from "drizzle-orm";
import { db } from "./client";
import { userSettings } from "./schema";

export interface UserSettingsRecord {
  emailReceipts: boolean;
  completedTasksAtTop: boolean;
  onboardingCompleted: boolean;
  petName: string;
  petAccessory: string;
}

const DEFAULT_USER_SETTINGS: UserSettingsRecord = {
  emailReceipts: true,
  completedTasksAtTop: true,
  onboardingCompleted: false,
  petName: "Auri",
  petAccessory: "none",
};

export async function getUserSettings(userId: string): Promise<UserSettingsRecord> {
  const [settings] = await db
    .select({
      emailReceipts: userSettings.emailReceipts,
      completedTasksAtTop: userSettings.completedTasksAtTop,
      onboardingCompleted: userSettings.onboardingCompleted,
      petName: userSettings.petName,
      petAccessory: userSettings.petAccessory,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!settings) {
    return DEFAULT_USER_SETTINGS;
  }

  return {
    emailReceipts: settings.emailReceipts,
    completedTasksAtTop: settings.completedTasksAtTop,
    onboardingCompleted: settings.onboardingCompleted,
    petName: settings.petName,
    petAccessory: settings.petAccessory,
  };
}

export async function upsertUserSettings(
  userId: string,
  updates: Partial<UserSettingsRecord>,
): Promise<UserSettingsRecord> {
  const now = new Date();
  const hasValidEmailReceipts = typeof updates.emailReceipts === "boolean";
  const hasValidCompletedTasksAtTop =
    typeof updates.completedTasksAtTop === "boolean";
  const hasValidOnboardingCompleted =
    typeof updates.onboardingCompleted === "boolean";
  const hasValidPetName =
    typeof updates.petName === "string" && updates.petName.trim().length > 0;
  const hasValidPetAccessory =
    typeof updates.petAccessory === "string" &&
    updates.petAccessory.trim().length > 0;

  const insertValues: typeof userSettings.$inferInsert = {
    userId,
    createdAt: now,
    updatedAt: now,
    ...(hasValidEmailReceipts ? { emailReceipts: updates.emailReceipts } : {}),
    ...(hasValidCompletedTasksAtTop
      ? { completedTasksAtTop: updates.completedTasksAtTop }
      : {}),
    ...(hasValidOnboardingCompleted
      ? { onboardingCompleted: updates.onboardingCompleted }
      : {}),
    ...(hasValidPetName ? { petName: updates.petName?.trim().slice(0, 32) } : {}),
    ...(hasValidPetAccessory
      ? { petAccessory: updates.petAccessory?.trim() }
      : {}),
  };

  const conflictSet: Partial<typeof userSettings.$inferInsert> = {
    updatedAt: now,
    ...(hasValidEmailReceipts ? { emailReceipts: updates.emailReceipts } : {}),
    ...(hasValidCompletedTasksAtTop
      ? { completedTasksAtTop: updates.completedTasksAtTop }
      : {}),
    ...(hasValidOnboardingCompleted
      ? { onboardingCompleted: updates.onboardingCompleted }
      : {}),
    ...(hasValidPetName ? { petName: updates.petName?.trim().slice(0, 32) } : {}),
    ...(hasValidPetAccessory
      ? { petAccessory: updates.petAccessory?.trim() }
      : {}),
  };

  const [settings] = await db
    .insert(userSettings)
    .values(insertValues)
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: conflictSet,
    })
    .returning({
      emailReceipts: userSettings.emailReceipts,
      completedTasksAtTop: userSettings.completedTasksAtTop,
      onboardingCompleted: userSettings.onboardingCompleted,
      petName: userSettings.petName,
      petAccessory: userSettings.petAccessory,
    });

  return {
    emailReceipts: settings.emailReceipts,
    completedTasksAtTop: settings.completedTasksAtTop,
    onboardingCompleted: settings.onboardingCompleted,
    petName: settings.petName,
    petAccessory: settings.petAccessory,
  };
}
