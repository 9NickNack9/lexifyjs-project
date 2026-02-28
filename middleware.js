// middleware.js (project root)
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = new Set([
  "/login",
  "/about",
  "/contact",
  "/feedback",
  "/register",
  "/register-screening",
  "/favicon.ico",
]);

export default withAuth(
  (req) => {
    const token = req.nextauth?.token;
    const { pathname } = req.nextUrl;

    // 1) Root path "/": send to /login if not logged in; otherwise route by role
    if (pathname === "/") {
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (token.role === "PROVIDER") {
        return NextResponse.redirect(new URL("/provider", req.url));
      }
      // Purchaser or Admin
      return NextResponse.redirect(new URL("/main", req.url));
    }

    // 2) Always allow public paths (even if not logged in)
    if (PUBLIC_PATHS.has(pathname)) {
      return NextResponse.next();
    }

    // 3) If logged in but registration is pending (non-admin), force screening
    const rs = String(token?.registerStatus || "").toUpperCase();
    if (
      token &&
      rs === "PENDING" &&
      token.role !== "ADMIN" &&
      pathname !== "/register-screening"
    ) {
      return NextResponse.redirect(new URL("/register-screening", req.url));
    }

    // 4) Everything else requires auth
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // 5) Otherwise, allow
    return NextResponse.next();
  },
  {
    // Let the function above decide what to do; don't auto-block here
    callbacks: { authorized: () => true },
    pages: { signIn: "/login" },
  },
);

// Apply to "/" explicitly and to (most) other pages; exclude APIs & static assets
export const config = {
  matcher: [
    "/", // ensure root is included
    "/((?!api|_next|_static|.*\\.(?:ico|png|jpg|jpeg|gif|svg|css|js|map)).*)",
  ],
};
