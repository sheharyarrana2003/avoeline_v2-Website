import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { TABLES } from "@/data/collections";

const all_possible_roles = ["organizer", "vendor", "attendee"];

function redirectToSignIn(request: NextRequest) {
    const isAdminBound = request.nextUrl.pathname.startsWith("/admin");
    const url = new URL(isAdminBound ? "/admin/signin" : "/auth/signin", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
}

const PUBLIC_PATHS = ["/admin/signin"];

export async function proxy(request: NextRequest) {
    if (PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
        return NextResponse.next();
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", request.nextUrl.pathname);

    let response = NextResponse.next({ request: { headers: requestHeaders } });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(url, anonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request: { headers: requestHeaders } });
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            },
        },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
        return redirectToSignIn(request);
    }

    const { data: profile } = await supabase
        .from(TABLES.USERS)
        .select("id, user_type, must_reset_password")
        .eq("id", user.id)
        .maybeSingle();

    if (profile?.must_reset_password && !request.nextUrl.pathname.startsWith("/auth/change-password")) {
        return NextResponse.redirect(new URL("/auth/change-password", request.url));
    }

    const dbType = String(profile?.user_type ?? "").toLowerCase();
    const userType = dbType === "platform_admin" ? "admin" : dbType;
    const roleId = user.id;

    if (!userType) {
        return redirectToSignIn(request);
    }

    if (userType === "admin") {
        return response;
    }

    for (const role of all_possible_roles) {
        if (request.nextUrl.pathname.startsWith(`/${role}`) && userType !== role) {
            if (all_possible_roles.includes(userType)) {
                return NextResponse.redirect(
                    new URL(`/${userType}/${roleId}/dashboard`, request.url)
                );
            }
            return redirectToSignIn(request);
        }
    }

    return response;
}

export const config = {
    matcher: [
        "/organizer/:path*",
        "/vendor/:path*",
        "/attendee/:path*",
        "/admin",
        "/admin/:path*",
        "/department",
        "/department/:path*",
        "/clubs/:path*",
        "/auth/change-password",
    ],
};
