import { betterFetch } from "@better-fetch/fetch";
import type { auth } from "@avenire/auth/server";
import { NextRequest, NextResponse } from "next/server";

type Session = typeof auth.$Infer.Session;

const ROUTES = {
  protected: ["/dashboard", "/profile", "/chat", "/settings"],
  public: ["/login", "/register"],
  redirects: {
    authenticated: "/dashboard",
    unauthenticated: "/login",
  },
} as const;

const isProtectedRoute = (pathname: string): boolean =>
  ROUTES.protected.some((route) => pathname.startsWith(route));

const isPublicRoute = (pathname: string): boolean =>
  ROUTES.public.some((route) => pathname.startsWith(route));

const createRedirectResponse = (
  url: string,
  request: NextRequest
): NextResponse => NextResponse.redirect(new URL(url, request.url));

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/uploadthing")) {
    return;
  }
  try {
    const { data: session } = await betterFetch<Session>(
      "/api/auth/get-session",
      {
        baseURL: request.nextUrl.origin,
        headers: {
          cookie: request.headers.get("cookie") || "", // Forward the cookies from the request
        },
      }
    );
    const pathname = request.nextUrl.pathname;

    if (isPublicRoute(pathname)) {
      return session
        ? createRedirectResponse(ROUTES.redirects.authenticated, request)
        : NextResponse.next();
    }

    if (isProtectedRoute(pathname)) {
      return session
        ? NextResponse.next()
        : createRedirectResponse(ROUTES.redirects.unauthenticated, request);
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return createRedirectResponse(ROUTES.redirects.unauthenticated, request);
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/login",
    "/chat/:path*",
    "/register",
  ],
};
