export async function readAiRouteTextResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    text?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error?.trim() || "AI request failed");
  }

  const generated = payload.text?.trim();
  if (!generated) {
    throw new Error("No text generated");
  }

  return generated;
}
