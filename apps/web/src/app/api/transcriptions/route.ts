import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleTranscriptionsPost } from "./transcriptions-route-post";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleTranscriptionsPost({
      request,
      userId: user.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to transcribe audio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
