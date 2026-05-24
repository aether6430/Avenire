import { getUserSettings } from "@avenire/database";
import { NextResponse } from "next/server";
import {
  resolveUserSettingsRouteError,
  USER_SETTINGS_LOAD_ERROR,
} from "./user-settings-route-model";

export async function handleUserSettingsRouteGet(userId: string) {
  try {
    const settings = await getUserSettings(userId);
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveUserSettingsRouteError(error, USER_SETTINGS_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}
