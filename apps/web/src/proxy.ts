import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // 0. Signed in but the emailed sign-in code isn't verified yet.
    if (token && token.mfaVerified !== true) {
      const url = new URL("/verify-code", req.url);
      url.searchParams.set("next", path + req.nextUrl.search);
      return NextResponse.redirect(url);
    }

    // 1. THE TRAFFIC COP: Automatically route users to their correct workspaces
    if (path === "/dashboard") {
      if (token?.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      if (token?.role === "PROVIDER") {
        return NextResponse.redirect(new URL("/provider", req.url));
      }
      // If role is PATIENT, they stay on /dashboard
    }

    // 2. Lock down the Admin dashboard
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 3. Lock down the Provider dashboard
    if (path.startsWith("/provider") && token?.role !== "PROVIDER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/provider/:path*",
    "/dashboard/:path*",
  ],
};
