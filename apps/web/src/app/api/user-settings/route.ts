import { NextResponse } from "next/server";
import { getUserSettings, upsertUserSettings } from "@/lib/user-settings";
import { getSessionUser } from "@/lib/workspace";
import { parseJsonRequest } from "@/lib/api-request";
import { userSettingsMutationSchema } from "./user-settings-route-model";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getUserSettings(user.id);
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonRequest(request, userSettingsMutationSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const raw = parsed.data;

  const hasEmailReceipts = typeof raw.emailReceipts === "boolean";
  const hasCompletedTasksAtTop = typeof raw.completedTasksAtTop === "boolean";
  const hasOnboardingCompleted = typeof raw.onboardingCompleted === "boolean";
  const hasPetName =
    typeof raw.petName === "string" && raw.petName.trim().length > 0;
  const hasPetAccessory =
    typeof raw.petAccessory === "string" && raw.petAccessory.trim().length > 0;
  if (
    !(
      hasEmailReceipts ||
      hasCompletedTasksAtTop ||
      hasOnboardingCompleted ||
      hasPetName ||
      hasPetAccessory
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Provide at least one setting: emailReceipts, completedTasksAtTop, onboardingCompleted, petName, petAccessory",
      },
      { status: 400 }
    );
  }

  const settings = await upsertUserSettings(user.id, {
    ...(hasEmailReceipts
      ? { emailReceipts: raw.emailReceipts }
      : {}),
    ...(hasCompletedTasksAtTop
      ? { completedTasksAtTop: raw.completedTasksAtTop }
      : {}),
    ...(hasOnboardingCompleted
      ? { onboardingCompleted: raw.onboardingCompleted }
      : {}),
    ...(hasPetName
      ? { petName: raw.petName?.slice(0, 32) }
      : {}),
    ...(hasPetAccessory
      ? { petAccessory: raw.petAccessory }
      : {}),
  });

  return NextResponse.json({ settings });
}
