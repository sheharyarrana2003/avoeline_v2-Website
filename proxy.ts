import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { CurrentUserData } from './src/services/models/user.type'
import { adminAuth } from './data/admin_db';


// This middle ware is for role validation
const all_possible_roles = ['organizer', 'vendor'];

export async function proxy(request: NextRequest) {
    const session_cookie = request.cookies.get('firebaseSession');
    const session_cookie_val = session_cookie?.value;

    const currentUser  = await adminAuth.verifySessionCookie(session_cookie_val);
    const parsed_user =  {
        userId: currentUser.uid,
        email: currentUser.email,
        userType: currentUser.userType,
        name: currentUser.name,
        roleId: currentUser.roleId,
    }

    if (!session_cookie) {
        return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

  
    if (!parsed_user) {
        return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    for (const role of all_possible_roles) {
        if (
            request.nextUrl.pathname.startsWith(`/${role}`) &&
            !parsed_user.userType.toLowerCase().includes(role.toLowerCase())
        ) {
            console.log("you are on wrong role");
            return NextResponse.redirect(new URL('/auth/signin', request.url));
        }
    }

    return NextResponse.next();
}


let new_arr: string[] = [];
all_possible_roles.forEach(x => {
    new_arr.push(`/${x}/*`)
})
export const config = {
    // ':path*' acts as a named wildcard placeholder that Next.js safely compiles
    matcher: [
        '/organizer/:path*',
        '/vendor/:path*'
    ]
};