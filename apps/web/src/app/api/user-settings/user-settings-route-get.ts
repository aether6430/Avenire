import { NextResponse } from "next/server";
import { getUserSettings } from "@/lib/user-settings";

export async function handleUserSettingsRouteGet(userId: string) {
  const settings = await getUserSettings(userId);
  return NextResponse.json({ settings });
}
