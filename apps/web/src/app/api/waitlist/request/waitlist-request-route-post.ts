import { requestWaitlistEntry } from "@avenire/database";
import { Emailer, renderWaitlistWelcomeEmail } from "@avenire/emailer";
import { NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/app-base-url";
import {
  parseWaitlistRequestEmail,
  resolveWaitlistPublicEmailBaseUrl,
  resolveWaitlistRouteError,
} from "../waitlist-route-model";

const emailer = new Emailer();

export async function handleWaitlistRequestPost(input: { request: Request }) {
  const parsed = parseWaitlistRequestEmail(
    await input.request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const entry = await requestWaitlistEntry(parsed.email);
    if (entry.status === "pending") {
      try {
        const baseUrl = resolveWaitlistPublicEmailBaseUrl(
          resolveAppBaseUrl(input.request)
        );
        await emailer.send({
          to: [entry.email],
          subject: "Welcome to the Avenire waitlist",
          html: await renderWaitlistWelcomeEmail({
            email: entry.email,
            loginUrl: `${baseUrl}/waitlist`,
          }),
          replyTo: "support@avenire.space",
        });
      } catch (error) {
        console.error("[api/waitlist/request] failed to send welcome email", {
          error,
          email: parsed.email,
        });
      }
    }

    return NextResponse.json({ status: entry.status, waitlist: entry });
  } catch (error) {
    const failure = resolveWaitlistRouteError(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
