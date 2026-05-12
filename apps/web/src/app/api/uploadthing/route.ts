import { createRouteHandler } from "@avenire/storage";
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

export const { GET, POST } = createRouteHandler({
  router,
  config: {
    callbackUrl: getUploadThingCallbackUrl(),
  },
});
