import { hasSessionCookie } from "@avenire/auth/middleware";
import { type NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/workspace", "/settings", "/chat", "/chats"];
const signedOutOnlyRoutes = ["/login", "/register", "/waitlist"];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some((route) => pathname.startsWith(route));
}

function isSignedOutOnlyRoute(pathname: string) {
  return signedOutOnlyRoutes.some((route) => pathname.startsWith(route));
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/uploadthing")) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const sessionCookie = hasSessionCookie(request);

  if ((pathname === "/" || isSignedOutOnlyRoute(pathname)) && sessionCookie) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  if (isProtectedRoute(pathname) && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/workspace/:path*",
    "/settings/:path*",
    "/chat/:path*",
    "/chats/:path*",
    "/",
    "/login",
    "/register",
    "/waitlist/:path*",
  ],
};
