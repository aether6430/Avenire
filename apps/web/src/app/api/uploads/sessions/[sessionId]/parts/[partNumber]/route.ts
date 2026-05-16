import { handleUploadSessionPartPut } from "./upload-session-part-put";

export async function PUT(
  request: Request,
  context: { params: Promise<{ sessionId: string; partNumber: string }> }
) {
  const { sessionId, partNumber } = await context.params;

  return await handleUploadSessionPartPut({
    request,
    sessionId,
    partNumberRaw: partNumber,
  });
}
