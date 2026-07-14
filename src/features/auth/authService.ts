
import { cache } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/data/db';
import { Organizer } from "@/src/services/models/organizer.model";
import { Vendor, VendorData } from "@/src/services/models/vendor.model";
import { adminAuth, adminDb } from "@/data/admin_db";
import { UserService } from "@/src/services/user.service";
import { cookies } from "next/headers";
import { CurrentUserData, User } from "@/src/services/models/user.type";

import type { User as FirebaseUser } from 'firebase/auth';
import { mockVendors } from "@/app/mockdata/vendors.mock";
import { EventVendorService, mapToVendorData } from "../event_vendors/event_venders.services";
import { COLLECTIONS } from "@/data/collections";
import {seedEvents} from "@/seeding";


interface signup_with_email_form_data {
    name: string;
    email: string;
    contactNo: string;
    gender: string;
    country: string;
    city: string;
    password: string;
    userType: string;
}

// const fetching_data_from_db = async () => {
//     const cookieStore = await cookies();
//     const token = cookieStore.get("firebaseToken")?.value;

//     if (!token) revalidatePath("/auth/signup");

//     try {
//         const obj = await adminAuth.verifyIdToken(token);
//         return UserService.getUserById(obj.uid);
//     } catch (error) {
//         console.log("[user error] cannot be logged in cookie not found")
//         throw error;
//     }
// }
function isValidCurrentUserData(data: unknown): data is CurrentUserData {
    if (typeof data !== "object" || data === null) return false;
    const d = data as Record<string, unknown>;
    return (
        typeof d.userId === "string" &&
        typeof d.email === "string" &&
        typeof d.userType === "string" &&
        typeof d.name === "string" &&
        typeof d.roleId === "string"
    );
}
const handleAuthAndCreateCookie = async (token: string) => {
    const obj = await adminAuth.verifyIdToken(token);
    const user_from_obj = await UserService.getUserById(obj.uid);
    const current_user = await converting_to_current_user_data(user_from_obj);
    await adminAuth.setCustomUserClaims(obj.uid, { ...current_user });
    const expiresIn = 1000 * 60 * 60 * 24 * 5;

    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });
    return sessionCookie;
}




const converting_to_current_user_data = async (user: User) => {
    const table_name = user.userType.trim().toLowerCase();
    // const docSnap = await adminDb.collection(table_name).doc(user.userId).get();

    // const role_object = docSnap.data() || {};
    // const targetKey = `${table_name}id`.toLowerCase();
    // let role_id = "didnt-exist";

    // const actualKey = Object.keys(role_object).find(
    //     key => key.toLowerCase() === targetKey
    // );

    // if (actualKey) {
    //     role_id = role_object[actualKey];
    // } else {
    //     console.error(`[converting_to_current_user_data] no ID key matching '${targetKey}' found`);
    // }
    let role_id = "unknown_role";

    if(table_name == "organizer") {
        role_id = `O_${user.userId}`;
    }else   if(table_name == "vendor") {
        role_id = `V_${user.userId}`;
    }

    return {
        userId: user?.userId || "",
        email: user?.email || "",
        name: user?.profile.fullName || "",
        userType: user?.userType || "",
        roleId: role_id || ""
    };
}

// Server: verify + set claims, return uid only
const setClaimsForUser = async (token: string) => {
    const obj = await adminAuth.verifyIdToken(token);
    const user_from_obj = await UserService.getUserById(obj.uid);
    const current_user = await converting_to_current_user_data(user_from_obj);
    await adminAuth.setCustomUserClaims(obj.uid, { ...current_user });
    return obj.uid;
};

// Server: just mint the cookie from whatever token you're given
const createCookieFromToken = async (freshToken: string) => {
    const expiresIn = 1000 * 60 * 60 * 24 * 5;
    return adminAuth.createSessionCookie(freshToken, { expiresIn });
};

const making_a_session = async (user: FirebaseUser) => {
    const initialToken = await user.getIdToken();
    await setClaimsForUser(initialToken);           // set claims on the record
    const freshToken = await user.getIdToken(true);  // force refresh -> new token WITH claims
    const sessionCookieString = await createCookieFromToken(freshToken);

    const cookieStore = await cookies();
    cookieStore.set("firebaseSession", sessionCookieString, {
        path: "/",
        maxAge: 60 * 60 * 24 * 5,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });
};


export const AuthService = {
    getCurrentUser: cache(async () => {
        const cookieStore = await cookies();
        let jwt_key = cookieStore.get('firebaseSession')?.value;
        if (!jwt_key) {
            return null;
        }

        try {
            const currentUser = await adminAuth.verifySessionCookie(jwt_key);
            return {
                userId: currentUser.uid,
                email: currentUser.email,
                userType: currentUser.userType,
                name: currentUser.name,
                roleId: currentUser.roleId,
            }
        } catch (err) {
            console.error("[getCurrentUser] failed to parse userData cookie", err);
            return null;
        }


    }),

    getCurrentVendor: cache(async () => {
        const cookieStore = await cookies();
        let user_data = cookieStore.get('userData');
        let currentUser: CurrentUserData = {
            userId: "unknown",
            email: "unknwon@unknowngmail.com",
            userType: "attendee",
            name: "unknown",
            roleId: "unknown"
        };
        if (user_data?.value) {
            try {
                currentUser = JSON.parse(user_data?.value);
            } catch (error) {
                // ignore malformed userData cookie
            }
        }
        return currentUser;

    }),

    async loginWithEmail(email: string, password: string) {
        let user_credintials;
        try {
            user_credintials = await signInWithEmailAndPassword(auth, email, password);

        } catch (error: any) {
            throw error;
        }
        const user = user_credintials.user;

        try {
            await making_a_session(user);
        } catch (error: any) {
            throw error;
        }

    },

    async signUpWithEmail(formData: signup_with_email_form_data) {
        const email = formData.email;
        const password = formData.password;

        let user_credintials;
        try {
            user_credintials = await createUserWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            throw error;
        }

        const user = user_credintials.user;
        const user_id = user_credintials.user.uid;
        const user_object = { ...formData };

        await adminDb.collection(COLLECTIONS.USERS).doc(user_id).set(user_object);

        const userTypeLower = String(formData.userType).trim().toLowerCase();
        if (userTypeLower === 'organizer') {

            const temp_organizer: Organizer = new Organizer(user_id, email, email);
            await adminDb.collection(COLLECTIONS.ORGANIZERS).doc(user_id).set(temp_organizer.toFirestoreObject());

        } else if (userTypeLower === 'vendor') {
            let temp_vendor: Vendor = new Vendor(user_id, email, email);
            await adminDb.collection(COLLECTIONS.VENDORS).doc(user_id).set(temp_vendor.toFirestoreObject());
        }

        // Create a session cookie (same as login flow)
        try {
            await making_a_session(user);
        } catch (error: any) {
            throw error;
        }
        return user_object;
    }

}
