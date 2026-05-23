import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleUserSettingsRouteGet } from "./user-settings-route-get";
import {
  resolveUserSettingsRouteError,
  USER_SETTINGS_LOAD_ERROR,
  USER_SETTINGS_SAVE_ERROR,
} from "./user-settings-route-model";
import { handleUserSettingsRoutePut } from "./user-settings-route-put";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleUserSettingsRouteGet(user.id);
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveUserSettingsRouteError(error, USER_SETTINGS_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleUserSettingsRoutePut({
      request,
      userId: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveUserSettingsRouteError(error, USER_SETTINGS_SAVE_ERROR),
      },
      { status: 500 }
    );
  }
}
