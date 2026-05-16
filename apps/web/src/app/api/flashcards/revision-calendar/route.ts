import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { handleFlashcardsRevisionCalendarRouteGet } from "./flashcards-revision-calendar-route-get";
import { resolveFlashcardsRevisionCalendarActiveOrganizationId } from "./flashcards-revision-calendar-route-model";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleFlashcardsRevisionCalendarRouteGet({
    activeOrganizationId:
      resolveFlashcardsRevisionCalendarActiveOrganizationId(session),
    request,
    userId: session.user.id,
  });
}
