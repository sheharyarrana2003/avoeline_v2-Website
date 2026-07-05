import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { CurrentUserData } from './src/services/models/user.type'

// This middle ware is for role validation
const all_possible_roles = ['organizer', 'vendor'];

export async function proxy(request: NextRequest) {
    let cookie = request.cookies.get('firebaseToken');
    console.log(cookie) // => { name: 'nextjs', value: 'fast', Path: '/' }
    let user_data = request.cookies.get('userData');
    let currentUser : CurrentUserData;
    if (user_data?.value) {
        try {
            currentUser = JSON.parse(user_data?.value);
        } catch (error) {
            console.log("cannot check user - failed in middle ware");
        }
    }

    if (!cookie) {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    all_possible_roles.forEach(x => {
        if (request.nextUrl.pathname.startsWith(`/${x}`) && !(currentUser.userType.toLowerCase().includes(`${x.toLowerCase()}`))) {
            //galat role ka saath dashboard pa ha
            console.log("you are onn wrong role");
            return NextResponse.redirect(new URL('/auth/signin', request.url))
        }
    })





    return NextResponse.next()
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