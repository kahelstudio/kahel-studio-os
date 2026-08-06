import { NextResponse, type NextRequest } from "next/server";
import { hasStaffSession } from "@/lib/server/staff-auth";

const PUBLIC_PATHS = ["/", "/terms", "/privacy", "/health-safety", "/login", "/reset-password", "/sign-in", "/sign-up", "/forgot-password", "/set-password", "/auth", "/portal", "/media", "/images", "/api/customer", "/api/paymongo", "/api/staff/session", "/api/staff/password-reset", "/api/staff/oauth", "/client-portal"];

async function hasValidSession(request: NextRequest) {
  return hasStaffSession(request);
}

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return true;
  return pathname === "/api/loyalty/redeem" || /^\/api\/client-portals\/[^/]+\/(access|activity|loyalty)$/.test(pathname);
}

// OpenNext currently requires Edge Middleware; Next 16 Node Proxy is not supported by the adapter.
export async function middleware(request: NextRequest) {
  if (process.env.APP_ENV && request.nextUrl.protocol === "http:") {
    const secureUrl = request.nextUrl.clone();
    secureUrl.protocol = "https:";
    return NextResponse.redirect(secureUrl, 308);
  }

  const { pathname, search } = request.nextUrl;
  const withPathname = { request: { headers: new Headers({ ...Object.fromEntries(request.headers), "x-pathname": pathname }) } };
  if (pathname !== "/login" && isPublicPath(pathname)) return NextResponse.next(withPathname);
  const authenticated = await hasValidSession(request);

  if (pathname === "/login") {
    return authenticated ? NextResponse.redirect(new URL("/os", request.url)) : NextResponse.next();
  }
  if (isPublicPath(pathname) || authenticated) return NextResponse.next(withPathname);

  const login = new URL("/login", request.url);
  const destination = `${pathname}${search}`;
  if (destination !== "/os") login.searchParams.set("next", destination);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)"],
};
