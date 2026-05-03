import { NextResponse } from "next/server";
import { apollo, experimental_transcribe as transcribe } from "@avenire/ai";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const workspaceUuid = formData.get("workspaceUuid");
  if (typeof workspaceUuid !== "string" || workspaceUuid.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing workspaceUuid" },
      { status: 400 }
    );
  }

  const hasAccess = await ensureWorkspaceAccessForUser(
    user.id,
    workspaceUuid.trim()
  );
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio blob" }, { status: 400 });
  }

  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Audio payload is empty or too large" },
      { status: 400 }
    );
  }

  try {
    const transcript = await transcribe({
      model: apollo.transcriptionModel("apollo-transcript"),
      audio: new Uint8Array(await audio.arrayBuffer()),
      providerOptions: {
        groq: {
          responseFormat: "verbose_json",
          timestampGranularities: ["segment"],
        },
      },
    });

    return NextResponse.json({
      segments: (transcript.segments ?? [])
        .map((segment) => ({
          endMs: Math.floor((segment.endSecond ?? 0) * 1000),
          startMs: Math.floor((segment.startSecond ?? 0) * 1000),
          text: segment.text,
        }))
        .filter((segment) => segment.text.trim().length > 0),
      text: transcript.text?.trim() ?? "",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to transcribe audio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
