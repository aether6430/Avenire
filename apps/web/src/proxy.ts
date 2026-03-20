import { NextRequest, NextResponse } from "next/server";
import { hasSessionCookie } from "@avenire/auth/middleware";

const protectedRoutes = ["/workspace", "/settings", "/chat", "/chats"];
const publicRoutes = ["/login", "/register"];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some((route) => pathname.startsWith(route));
}

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => pathname.startsWith(route));
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/uploadthing")) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const sessionCookie = hasSessionCookie(request);

  if (isPublicRoute(pathname) && sessionCookie) {
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
    "/login",
    "/register",
  ],
};
