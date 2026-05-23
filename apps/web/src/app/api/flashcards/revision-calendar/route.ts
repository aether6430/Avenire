import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { handleFlashcardsRevisionCalendarRouteGet } from "./flashcards-revision-calendar-route-get";
import {
  FLASHCARDS_REVISION_CALENDAR_LOAD_ERROR,
  resolveFlashcardsRevisionCalendarActiveOrganizationId,
  resolveFlashcardsRevisionCalendarRouteError,
} from "./flashcards-revision-calendar-route-model";

export async function GET(request: Request) {
  try {
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
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardsRevisionCalendarRouteError(
          error,
          FLASHCARDS_REVISION_CALENDAR_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
