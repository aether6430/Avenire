import { NextResponse } from "next/server";
import { getUserSettings, upsertUserSettings } from "@/lib/user-settings";
import { getSessionUser } from "@/lib/workspace";

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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = payload as {
    emailReceipts?: unknown;
    completedTasksAtTop?: unknown;
    onboardingCompleted?: unknown;
    petName?: unknown;
    petAccessory?: unknown;
  };

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
      ? { emailReceipts: raw.emailReceipts as boolean }
      : {}),
    ...(hasCompletedTasksAtTop
      ? { completedTasksAtTop: raw.completedTasksAtTop as boolean }
      : {}),
    ...(hasOnboardingCompleted
      ? { onboardingCompleted: raw.onboardingCompleted as boolean }
      : {}),
    ...(hasPetName
      ? { petName: (raw.petName as string).trim().slice(0, 32) }
      : {}),
    ...(hasPetAccessory
      ? { petAccessory: (raw.petAccessory as string).trim() }
      : {}),
  });

  return NextResponse.json({ settings });
}
