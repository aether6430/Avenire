import {
  approveWaitlistEntry,
  getWaitlistEntryByEmail,
  normalizeEmail,
} from "@avenire/database";
import { Emailer, renderWaitlistApprovalEmail } from "@avenire/emailer";
import { NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/app-base-url";
import {
  parseMaintenanceWaitlistEmail,
  resolveMaintenancePublicEmailBaseUrl,
  resolveMaintenanceRouteError,
} from "../maintenance-route-model";

const emailer = new Emailer();

export async function handleMaintenanceWaitlistRoutePost(input: {
  request: Request;
}) {
  const parsed = parseMaintenanceWaitlistEmail(
    await input.request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const normalizedEmail = normalizeEmail(parsed.email);
    const previousEntry = await getWaitlistEntryByEmail(normalizedEmail);
    const entry = await approveWaitlistEntry(normalizedEmail);

    if (entry.status === "approved" && previousEntry?.status !== "approved") {
      try {
        const baseUrl = resolveMaintenancePublicEmailBaseUrl(
          resolveAppBaseUrl(input.request)
        );
        await emailer.send({
          to: [entry.email],
          subject: "You're approved for Avenire",
          html: await renderWaitlistApprovalEmail({
            name: entry.email.split("@")[0] ?? "there",
            loginUrl: `${baseUrl}/register`,
          }),
          replyTo: "support@avenire.space",
        });
      } catch (error) {
        console.error(
          "[api/maintenance/waitlist] failed to send approval email",
          {
            error,
            email: parsed.email,
          }
        );
      }
    }

    return NextResponse.json({ ok: true, waitlist: entry });
  } catch (error) {
    const failure = resolveMaintenanceRouteError(error, {
      fallback: "Unable to approve waitlist entry.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
