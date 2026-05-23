import { authRouteHandlers } from "@avenire/auth/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function shouldLogAuthRoute(pathname: string) {
  return pathname.includes("/customer/") || pathname.includes("/checkout");
}

async function logAuthHandlerResult(
  method: "GET" | "POST",
  request: NextRequest,
  handler: (request: NextRequest) => Promise<Response>
) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const logRoute = shouldLogAuthRoute(url.pathname);

  if (logRoute) {
    console.info("[api/auth] billing provider request", {
      method,
      pathname: url.pathname,
      search: url.search,
    });
  }

  try {
    const response = await handler(request);

    if (logRoute || response.status >= 500) {
      console.info("[api/auth] billing provider response", {
        elapsedMs: Date.now() - startedAt,
        method,
        pathname: url.pathname,
        status: response.status,
      });
    }

    if (response.status >= 500) {
      const responseForLog = response.clone();
      const body = await responseForLog.text().catch(() => "");
      console.error("[api/auth] provider route returned 500", {
        body: body.slice(0, 2000),
        method,
        pathname: url.pathname,
        status: response.status,
      });
    }

    return response;
  } catch (error) {
    console.error("[api/auth] provider route threw", {
      error,
      method,
      pathname: url.pathname,
    });
    throw error;
  }
}

export function GET(request: NextRequest) {
  return logAuthHandlerResult("GET", request, authRouteHandlers.GET);
}

export function POST(request: NextRequest) {
  return logAuthHandlerResult("POST", request, authRouteHandlers.POST);
}
