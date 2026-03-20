import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const isProtectedRoute = (request: NextRequest) => request.nextUrl.pathname.startsWith("/workspace");

export const authMiddleware = async (request: NextRequest) => {
  const session = hasSessionCookie(request);

  if (isProtectedRoute(request) && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
};

export function hasSessionCookie(request: Request | Headers) {
  return Boolean(getSessionCookie(request));
}
