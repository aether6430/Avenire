import { Emailer, renderWaitlistApprovalEmail } from "@avenire/emailer";
import {
  approveWaitlistEntry,
  getWaitlistEntryByEmail,
  listWaitlistEntries,
  normalizeEmail,
} from "@avenire/database";
import { NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/app-base-url";

const emailer = new Emailer();

function isAuthorized(request: Request) {
  const token = process.env.MAINTENANCE_CRON_TOKEN;
  if (!token) {
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${token}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const waitlist = await listWaitlistEntries({
    status: ["pending", "approved"],
    limit: 200,
  });

  return NextResponse.json({ ok: true, waitlist });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim() ?? "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const previousEntry = await getWaitlistEntryByEmail(normalizeEmail(email));
  const entry = await approveWaitlistEntry(normalizeEmail(email));
  if (entry.status === "approved" && previousEntry?.status !== "approved") {
    try {
      const baseUrl = resolveAppBaseUrl(request);
      await emailer.send({
        to: [entry.email],
        subject: "You're approved for Avenire",
        html: await renderWaitlistApprovalEmail({
          name: entry.email.split("@")[0] ?? "there",
          loginUrl: `${baseUrl}/register`,
        }),
      });
    } catch (error) {
      console.error("[api/maintenance/waitlist] failed to send approval email", {
        error,
        email,
      });
    }
  }

  return NextResponse.json({ ok: true, waitlist: entry });
}
