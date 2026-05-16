export function formatWorkspaceCaptionTimestamp(ms: number) {
  const totalMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function buildWorkspaceCaptionsVtt(
  cues: Array<{
    endMs: number;
    startMs: number;
    text: string;
  }>
) {
  if (cues.length === 0) {
    return "WEBVTT\n\n";
  }

  return [
    "WEBVTT",
    "",
    ...cues.map((cue, index) => {
      const start = formatWorkspaceCaptionTimestamp(cue.startMs);
      const end = formatWorkspaceCaptionTimestamp(
        Math.max(cue.startMs + 500, cue.endMs)
      );
      const text = cue.text.replace(/\r/g, " ").trim();
      return `${index + 1}\n${start} --> ${end}\n${text}\n`;
    }),
  ].join("\n");
}

export function resolveWorkspaceSupportRouteError(
  error: unknown,
  options: {
    fallback: string;
    status?: number;
  }
) {
  return {
    error: error instanceof Error ? error.message : options.fallback,
    status: options.status ?? 500,
  };
}
