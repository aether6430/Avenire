import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { getUserSettings, upsertUserSettings } from "@/lib/user-settings";

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

  const raw = payload as { emailReceipts?: unknown };
  if (typeof raw.emailReceipts !== "boolean") {
    return NextResponse.json(
      { error: "emailReceipts must be a boolean" },
      { status: 400 },
    );
  }

  const settings = await upsertUserSettings(user.id, {
    emailReceipts: raw.emailReceipts,
  });

  return NextResponse.json({ settings });
}
