export const MAX_TRANSCRIPTION_AUDIO_BYTES = 25 * 1024 * 1024;

export const TRANSCRIPTION_INVALID_FORM_DATA_ERROR = "Invalid form data";
export const TRANSCRIPTION_MISSING_WORKSPACE_ERROR = "Missing workspaceUuid";
export const TRANSCRIPTION_MISSING_AUDIO_ERROR = "Missing audio blob";
export const TRANSCRIPTION_AUDIO_SIZE_ERROR =
  "Audio payload is empty or too large";

export function normalizeTranscriptionWorkspaceId(workspaceUuid: string) {
  return workspaceUuid.trim();
}

export function parseTranscriptionFormDataPayload(formData: FormData):
  | {
      success: true;
      data: {
        audio: Blob;
        workspaceUuid: string;
      };
    }
  | {
      success: false;
      error: string;
    } {
  const workspaceUuid = formData.get("workspaceUuid");
  if (typeof workspaceUuid !== "string") {
    return {
      success: false,
      error: TRANSCRIPTION_MISSING_WORKSPACE_ERROR,
    };
  }

  const normalizedWorkspaceUuid =
    normalizeTranscriptionWorkspaceId(workspaceUuid);
  if (!normalizedWorkspaceUuid) {
    return {
      success: false,
      error: TRANSCRIPTION_MISSING_WORKSPACE_ERROR,
    };
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob)) {
    return {
      success: false,
      error: TRANSCRIPTION_MISSING_AUDIO_ERROR,
    };
  }

  if (audio.size === 0 || audio.size > MAX_TRANSCRIPTION_AUDIO_BYTES) {
    return {
      success: false,
      error: TRANSCRIPTION_AUDIO_SIZE_ERROR,
    };
  }

  return {
    success: true,
    data: {
      audio,
      workspaceUuid: normalizedWorkspaceUuid,
    },
  };
}

export function buildTranscriptionResponsePayload(input: {
  segments?: Array<{
    endSecond?: number | null;
    startSecond?: number | null;
    text: string;
  }> | null;
  text?: string | null;
}) {
  return {
    segments: (input.segments ?? [])
      .map((segment) => ({
        endMs: Math.floor((segment.endSecond ?? 0) * 1000),
        startMs: Math.floor((segment.startSecond ?? 0) * 1000),
        text: segment.text,
      }))
      .filter((segment) => segment.text.trim().length > 0),
    text: input.text?.trim() ?? "",
  };
}
