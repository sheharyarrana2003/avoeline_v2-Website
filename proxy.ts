import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { CurrentUserData } from './src/services/models/user.type'

// This middle ware is for role validation
const all_possible_roles = ['organizer', 'vendor'];

export async function proxy(request: NextRequest) {
     console.log("MIDDLEWARE HIT:", request.nextUrl.pathname);
    const cookie = request.cookies.get('firebaseToken');
    const user_data = request.cookies.get('userData');

    if (!cookie) {
        return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    let currentUser: CurrentUserData | null = null;
    if (user_data?.value) {
        try {
            currentUser = JSON.parse(user_data.value);
        } catch (error) {
            console.log("cannot check user - failed in middleware");
        }
    }

    if (!currentUser) {
        return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    for (const role of all_possible_roles) {
        if (
            request.nextUrl.pathname.startsWith(`/${role}`) &&
            !currentUser.userType.toLowerCase().includes(role.toLowerCase())
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