import { NextResponse } from "next/server";
import {
  getWaitlistAccessStateByEmail,
  getWaitlistEntryByEmail,
  normalizeEmail,
} from "@avenire/database";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim() ?? "";

  if (!email) {
    return NextResponse.json({ status: "none" }, { status: 200 });
  }

  try {
    const normalizedEmail = normalizeEmail(email);
    const status = await getWaitlistAccessStateByEmail(normalizedEmail);
    const waitlistEntry = await getWaitlistEntryByEmail(normalizedEmail);

    return NextResponse.json({
      status,
      waitlist: waitlistEntry,
    });
  } catch (error) {
    console.error("[api/waitlist/status] failed", { error });
    return NextResponse.json({ status: "none" }, { status: 200 });
  }
}
