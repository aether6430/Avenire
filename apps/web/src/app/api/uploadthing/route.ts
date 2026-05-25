import { createRouteHandler } from "@avenire/storage";
import type { NextRequest } from "next/server";
import { router } from "@/lib/upload";

function getUploadThingCallbackUrl() {
  const explicit = process.env.UPLOADTHING_CALLBACK_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : "");

  if (!appUrl) {
    return undefined;
  }

  return `${appUrl.replace(/\/+$/, "")}/api/uploadthing`;
}

export const runtime = "nodejs";

const handlers = createRouteHandler({
  router,
  config: {
    callbackUrl: getUploadThingCallbackUrl(),
  },
});

function resolveUploadThingRouteError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to handle upload request.";
}

export async function GET(request: NextRequest) {
  try {
    return await handlers.GET(request);
  } catch (error) {
    return Response.json(
      {
        error: resolveUploadThingRouteError(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handlers.POST(request);
  } catch (error) {
    return Response.json(
      {
        error: resolveUploadThingRouteError(error),
      },
      { status: 500 }
    );
  }
}
