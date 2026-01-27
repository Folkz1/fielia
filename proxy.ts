import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const isDashboardPage = request.nextUrl.pathname.startsWith("/dashboard");

  // Check for session cookie
  const sessionCookie = request.cookies.get("authjs.session-token") ||
                       request.cookies.get("__Secure-authjs.session-token");

  const isLoggedIn = !!sessionCookie;

  if (isDashboardPage && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
