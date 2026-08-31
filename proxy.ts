import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminAuth } from './data/admin_db';


// This middle ware is for role validation
const all_possible_roles = ['organizer', 'vendor'];

/** Send an unauthenticated visitor to sign in, remembering where they were headed. */
function redirectToSignIn(request: NextRequest) {
    const url = new URL('/auth/signin', request.url);
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
    const session_cookie_val = request.cookies.get('firebaseSession')?.value;

    // Guard BEFORE verifying: verifySessionCookie(undefined) throws, and an
    // uncaught throw in middleware is a 500 — which is what a signed-out visitor
    // used to get instead of being sent to the sign-in page.
    if (!session_cookie_val) {
        return redirectToSignIn(request);
    }

    let parsed_user;
    try {
        const currentUser = await adminAuth.verifySessionCookie(session_cookie_val);
        parsed_user = {
            userId: currentUser.uid,
            email: currentUser.email,
            userType: currentUser.userType,
            name: currentUser.name,
            roleId: currentUser.roleId,
        };
    } catch {
        // Expired, revoked or malformed cookie — treat as signed out rather than
        // erroring the whole request.
        return redirectToSignIn(request);
    }

    const userType = String(parsed_user.userType ?? '').toLowerCase();
    if (!userType) {
        return redirectToSignIn(request);
    }

    for (const role of all_possible_roles) {
        if (request.nextUrl.pathname.startsWith(`/${role}`) && userType !== role) {
            // Signed in, but on the wrong side of the app — send them to their own
            // dashboard instead of the sign-in page they're already past.
            if (all_possible_roles.includes(userType)) {
                return NextResponse.redirect(
                    new URL(`/${userType}/${parsed_user.roleId ?? parsed_user.userId}/dashboard`, request.url)
                );
            }
            return redirectToSignIn(request);
        }
    }

    return NextResponse.next();
}

export const config = {
    // ':path*' acts as a named wildcard placeholder that Next.js safely compiles
    matcher: [
        '/organizer/:path*',
        '/vendor/:path*',
        // Listed so a signed-out visitor is redirected rather than reaching the
        // page. 'admin' is deliberately NOT in all_possible_roles above: that
        // array doubles as the cross-redirect target, so an admin bounced off
        // /organizer would be sent to /admin/<roleId>/dashboard, which does not
        // exist. The role check for /admin lives in app/admin/layout.tsx, and
        // every admin action re-checks it -- a Server Action is a public
        // endpoint this middleware never sees.
        '/admin/:path*'
    ]
};
