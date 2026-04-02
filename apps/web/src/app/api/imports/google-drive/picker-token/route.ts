import { NextResponse } from "next/server";
import { getGooglePickerToken } from "@/lib/imports";
import { getSessionUser } from "@/lib/workspace";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await getGooglePickerToken(user.id);
    return NextResponse.json(token);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to get a Google Drive access token.",
      },
      { status: 409 },
    );
  }
}
