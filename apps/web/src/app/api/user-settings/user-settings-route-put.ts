import { NextResponse } from "next/server";
import { upsertUserSettings } from "@/lib/user-settings";
import {
  parseUserSettingsUpdatePayload,
  USER_SETTINGS_UPDATE_ERROR,
} from "./user-settings-route-model";

export async function handleUserSettingsRoutePut(input: {
  request: Request;
  userId: string;
}) {
  let payload: unknown;
  try {
    payload = await input.request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseUserSettingsUpdatePayload(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: USER_SETTINGS_UPDATE_ERROR },
      { status: 400 }
    );
  }

  const settings = await upsertUserSettings(input.userId, parsed.data);
  return NextResponse.json({ settings });
}
