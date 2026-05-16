import { createHmac, timingSafeEqual } from "node:crypto";

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

function getHeader(headers: Record<string, string>, key: string) {
  return headers[key] ?? headers[key.toLowerCase()] ?? null;
}

function verifyTimestamp(timestampHeader: string) {
  const now = Math.floor(Date.now() / 1000);
  const timestamp = Number.parseInt(timestampHeader, 10);

  if (Number.isNaN(timestamp)) {
    throw new WebhookVerificationError("Invalid Signature Headers");
  }

  if (now - timestamp > WEBHOOK_TOLERANCE_SECONDS) {
    throw new WebhookVerificationError("Message timestamp too old");
  }

  if (timestamp > now + WEBHOOK_TOLERANCE_SECONDS) {
    throw new WebhookVerificationError("Message timestamp too new");
  }

  return timestamp;
}

function verifyPayload(
  payload: string,
  headers: Record<string, string>,
  secret: string
) {
  const messageId = getHeader(headers, "webhook-id");
  const signatureHeader = getHeader(headers, "webhook-signature");
  const timestampHeader = getHeader(headers, "webhook-timestamp");

  if (!(messageId && signatureHeader && timestampHeader)) {
    throw new WebhookVerificationError("Missing required headers");
  }

  const timestamp = verifyTimestamp(timestampHeader);
  const computedSignature = createHmac("sha256", secret)
    .update(`${messageId}.${timestamp}.${payload}`)
    .digest("base64");

  for (const versionedSignature of signatureHeader.split(" ")) {
    const [version, signature] = versionedSignature.split(",");

    if (!(version === "v1" && signature)) {
      continue;
    }

    const actual = Buffer.from(signature);
    const expected = Buffer.from(computedSignature);

    if (
      actual.length === expected.length &&
      timingSafeEqual(actual, expected)
    ) {
      return JSON.parse(payload) as {
        data?: Record<string, unknown>;
        type: string;
      };
    }
  }

  throw new WebhookVerificationError("No matching signature found");
}

export async function validatePolarWebhook(
  payload: string,
  headers: Record<string, string>
) {
  return handlePolarWebhook(payload, headers);
}

export async function handlePolarWebhook(
  payload: string,
  headers: Record<string, string>
) {
  const secret = (process.env.POLAR_WEBHOOK_SECRET ?? "").trim();

  if (!secret) {
    return null;
  }

  try {
    return verifyPayload(payload, headers, secret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return null;
    }
    throw error;
  }
}
