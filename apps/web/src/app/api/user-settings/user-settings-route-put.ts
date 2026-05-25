import { upsertUserSettings } from "@avenire/database";
import { NextResponse } from "next/server";
import {
  parseUserSettingsUpdatePayload,
  resolveUserSettingsRouteError,
  USER_SETTINGS_SAVE_ERROR,
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

  try {
    const settings = await upsertUserSettings(input.userId, parsed.data);
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveUserSettingsRouteError(error, USER_SETTINGS_SAVE_ERROR),
      },
      { status: 500 }
    );
  }
}
