import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import { sessionEnd } from "@/lib/sessionPolicy";

// First line only: is there a live, code-verified session at all? Which
// portal a user may open is decided by each portal layout's requireRole(),
// which reads the role from the database. (The role inside this cookie can
// be stale after a role change, and redirecting on it caused loops.)
export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Ended by inactivity, lifetime or a password change.
    const ended = token?.ended ?? (token?.mfaVerified ? sessionEnd(token) : null);
    if (ended) {
      const url = new URL("/login", req.url);
      url.searchParams.set("ended", ended);
      return NextResponse.redirect(url);
    }

    // Signed in but the emailed sign-in code isn't verified yet.
    if (token && token.mfaVerified !== true) {
      const url = new URL("/verify-code", req.url);
      url.searchParams.set("next", path + req.nextUrl.search);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: ["/admin/:path*", "/provider/:path*", "/dashboard/:path*"],
};
