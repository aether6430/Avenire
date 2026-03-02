import { eq } from "drizzle-orm";
import { db } from "./client";
import { userSettings } from "./schema";

export interface UserSettingsRecord {
  emailReceipts: boolean;
}

const DEFAULT_USER_SETTINGS: UserSettingsRecord = {
  emailReceipts: true,
};

export async function getUserSettings(userId: string): Promise<UserSettingsRecord> {
  const [settings] = await db
    .select({
      emailReceipts: userSettings.emailReceipts,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!settings) {
    return DEFAULT_USER_SETTINGS;
  }

  return {
    emailReceipts: settings.emailReceipts,
  };
}

export async function upsertUserSettings(
  userId: string,
  updates: Partial<UserSettingsRecord>,
): Promise<UserSettingsRecord> {
  const now = new Date();
  const nextEmailReceipts =
    typeof updates.emailReceipts === "boolean"
      ? updates.emailReceipts
      : DEFAULT_USER_SETTINGS.emailReceipts;

  const [settings] = await db
    .insert(userSettings)
    .values({
      userId,
      emailReceipts: nextEmailReceipts,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        emailReceipts: nextEmailReceipts,
        updatedAt: now,
      },
    })
    .returning({
      emailReceipts: userSettings.emailReceipts,
    });

  return {
    emailReceipts: settings.emailReceipts,
  };
}
