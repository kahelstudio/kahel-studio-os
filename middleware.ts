import { NextResponse, type NextRequest } from "next/server";
import { hasStaffSession, tryRefreshStaffSession, STAFF_SESSION_COOKIE, STAFF_REFRESH_COOKIE, REMEMBER_ME_MAX_AGE, IS_PRODUCTION } from "@/lib/server/staff-auth";

const PUBLIC_PATHS = ["/", "/terms", "/privacy", "/health-safety", "/login", "/reset-password", "/sign-in", "/sign-up", "/forgot-password", "/set-password", "/auth", "/portal", "/media", "/images", "/api/customer", "/api/paymongo", "/api/staff/session", "/api/staff/password-reset", "/api/staff/oauth", "/client-portal"];
const CUSTOMER_ACCESS_COOKIE = "kahel_customer_access_token";
const CUSTOMER_REFRESH_COOKIE = "kahel_customer_refresh_token";

async function hasValidSession(request: NextRequest) {
  return hasStaffSession(request);
}

async function checkAuth(request: NextRequest) {
  const authenticated = await hasValidSession(request);
  if (authenticated) return { authenticated: true as const, refreshToken: null as string | null };
  const refreshed = await tryRefreshStaffSession(request);
  if (refreshed) return { authenticated: true as const, refreshToken: refreshed.refresh_token, accessToken: refreshed.access_token };
  return { authenticated: false as const, refreshToken: null as string | null };
}

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return true;
  return pathname === "/api/loyalty/redeem" || /^\/api\/client-portals\/[^/]+\/(access|activity|loyalty)$/.test(pathname);
}

// OpenNext Cloudflare 1.20.2 does not support the Node.js runtime used by Next.js Proxy.
export async function middleware(request: NextRequest) {
  if (process.env.APP_ENV && request.nextUrl.protocol === "http:") {
    const secureUrl = request.nextUrl.clone();
    secureUrl.protocol = "https:";
    return NextResponse.redirect(secureUrl, 308);
  }

  const { pathname, search } = request.nextUrl;
  const withPathname = { request: { headers: new Headers({ ...Object.fromEntries(request.headers), "x-pathname": pathname }) } };

  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    if (request.cookies.has(CUSTOMER_ACCESS_COOKIE) || request.cookies.has(CUSTOMER_REFRESH_COOKIE)) return NextResponse.next(withPathname);
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(signIn);
  }

  if (pathname !== "/login" && isPublicPath(pathname)) return NextResponse.next(withPathname);

  const { authenticated, accessToken, refreshToken } = await checkAuth(request);

  const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: IS_PRODUCTION, maxAge: REMEMBER_ME_MAX_AGE, path: "/" };

  if (pathname === "/login") {
    if (!authenticated) return NextResponse.next();
    const res = NextResponse.redirect(new URL("/os", request.url));
    if (accessToken) res.cookies.set(STAFF_SESSION_COOKIE, accessToken, cookieOptions);
    if (refreshToken) res.cookies.set(STAFF_REFRESH_COOKIE, refreshToken, cookieOptions);
    return res;
  }
  if (isPublicPath(pathname) || authenticated) {
    const res = NextResponse.next(withPathname);
    if (accessToken) res.cookies.set(STAFF_SESSION_COOKIE, accessToken, cookieOptions);
    if (refreshToken) res.cookies.set(STAFF_REFRESH_COOKIE, refreshToken, cookieOptions);
    return res;
  }

  const login = new URL("/login", request.url);
  const destination = `${pathname}${search}`;
  if (destination !== "/os") login.searchParams.set("next", destination);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)"],
};
