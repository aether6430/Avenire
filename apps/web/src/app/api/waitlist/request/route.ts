import { requestWaitlistEntry } from "@avenire/database";
import { Emailer, renderWaitlistWelcomeEmail } from "@avenire/emailer";
import { NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/app-base-url";

const emailer = new Emailer();

function resolvePublicEmailBaseUrl(request: Request) {
  const baseUrl = resolveAppBaseUrl(request);
  return baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")
    ? "https://avenire.space"
    : baseUrl;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim() ?? "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    const entry = await requestWaitlistEntry(email);
    if (entry.status === "pending") {
      try {
        const baseUrl = resolvePublicEmailBaseUrl(request);
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
          email,
        });
      }
    }

    return NextResponse.json({ status: entry.status, waitlist: entry });
  } catch (error) {
    console.error("[api/waitlist/request] failed", { error });
    return NextResponse.json(
      { error: "Unable to add email to the waitlist." },
      { status: 500 }
    );
  }
}
