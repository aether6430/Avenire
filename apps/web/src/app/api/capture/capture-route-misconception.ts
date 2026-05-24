import {
  recomputeConceptMastery,
  upsertMisconception,
} from "@avenire/database";
import { NextResponse } from "next/server";
import type { CaptureRequestBody } from "./capture-route-model";
import {
  CAPTURE_MISCONCEPTION_ERROR,
  resolveCaptureRouteError,
  resolveMisconceptionCapturePayload,
} from "./capture-route-model";

export async function handleCaptureMisconception(input: {
  body: CaptureRequestBody;
  userId: string;
  workspaceId: string;
}) {
  const payload = resolveMisconceptionCapturePayload(input.body);
  if (
    !(payload.subject && payload.topic && payload.concept && payload.reason)
  ) {
    return NextResponse.json(
      { error: "Subject, topic, concept, and reason are required" },
      { status: 400 }
    );
  }

  try {
    const misconception = await upsertMisconception({
      confidence: payload.confidence,
      concept: payload.concept,
      evidenceClass: "manual",
      reason: payload.reason,
      source: "manual",
      sourceSessionId: null,
      status: "confirmed",
      subject: payload.subject,
      topic: payload.topic,
      userId: input.userId,
      workspaceId: input.workspaceId,
    });

    await recomputeConceptMastery({
      concept: payload.concept,
      subject: payload.subject,
      topic: payload.topic,
      userId: input.userId,
      workspaceId: input.workspaceId,
    });

    return NextResponse.json(
      { kind: "misconception", misconception },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveCaptureRouteError(error, CAPTURE_MISCONCEPTION_ERROR),
      },
      { status: 500 }
    );
  }
}
