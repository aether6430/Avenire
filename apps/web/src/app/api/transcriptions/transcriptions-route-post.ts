import { apollo, experimental_transcribe as transcribe } from "@avenire/ai";
import { NextResponse } from "next/server";
import { ensureWorkspaceAccessForUser } from "@/lib/workspace";
import {
  buildTranscriptionResponsePayload,
  parseTranscriptionFormDataPayload,
  TRANSCRIPTION_INVALID_FORM_DATA_ERROR,
} from "./transcriptions-route-model";

export async function handleTranscriptionsPost(input: {
  request: Request;
  userId: string;
}) {
  const formData = await input.request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: TRANSCRIPTION_INVALID_FORM_DATA_ERROR },
      { status: 400 }
    );
  }

  const parsed = parseTranscriptionFormDataPayload(formData);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const hasAccess = await ensureWorkspaceAccessForUser(
    input.userId,
    parsed.data.workspaceUuid
  );
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const transcript = await transcribe({
      model: apollo.transcriptionModel("apollo-transcript"),
      audio: new Uint8Array(await parsed.data.audio.arrayBuffer()),
      providerOptions: {
        groq: {
          responseFormat: "verbose_json",
          timestampGranularities: ["segment"],
        },
      },
    });

    return NextResponse.json(
      buildTranscriptionResponsePayload({
        segments: transcript.segments,
        text: transcript.text,
      })
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to transcribe audio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
