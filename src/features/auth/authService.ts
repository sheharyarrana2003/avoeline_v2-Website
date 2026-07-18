
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

    // The id used for a role's routes/queries differs by role:
    //  - organizer: looked up by document id (== the auth uid), and events are
    //    queried by organizerId == uid, so the route id is the auth uid.
    //  - vendor: looked up via where(vendorId == id) and bookings are queried by
    //    vendorId, whose stored value can carry a "V_" prefix, so the route id
    //    is the vendorId field (not the raw uid).
    // Default to the auth uid; only vendors need the field lookup.
    let role_id = user?.userId || "";
    try {
        if (table_name === "vendor") {
            const docSnap = await adminDb.collection(COLLECTIONS.VENDORS).doc(user.userId).get();
            const vendorId = docSnap.data()?.vendorId;
            if (vendorId) {
                role_id = String(vendorId);
            }
        }
    } catch (err) {
        console.error("[converting_to_current_user_data] vendor id lookup failed", err);
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
            console.log("currentUser from session cookie", currentUser);
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

    

    async loginWithEmail(email: string, password: string) {
        console.log("Checkpoint 1:  function started.");
        console.log(`Payload checking: Email is "${email}", Password length is ${password?.length}`);

        
        //  await seedEvents(adminDb);
        
        

        let user_credintials;
        try {
            user_credintials = await signInWithEmailAndPassword(auth, email, password);

        } catch (error: any) {
            const errorCode = error.code;
            const errorMessage = error.message;

            console.log("[user logging in] ", error)
            throw error;
        }
        const user = user_credintials.user;
        const user_id = user_credintials.user.uid;
        console.log("💾Checkpoint 2: Attempting Firestore read...");


        try {
            await making_a_session(user);
        } catch (error: any) {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log("[user logging in] making session failed")
            throw error;
        }

    },

    async signUpWithEmail(formData: signup_with_email_form_data) {
        const email = formData.email;
        const password = formData.password;
        console.log("Checkpoint 1: signUpWithEmail function started.");

        let user_credintials;
        try {
            user_credintials = await createUserWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            console.log("[user signing in] failed")
            throw error;
        }

        const user = user_credintials.user;
        const user_id = user_credintials.user.uid;
        const user_object = { ...formData };

        console.log("💾 Checkpoint 2: Attempting Firestore write...", formData.userType);
        await adminDb.collection(COLLECTIONS.USERS).doc(user_id).set(user_object);
        console.log(`💾 userType written: "${formData.userType}"`);

        const userTypeLower = String(formData.userType).trim().toLowerCase();
        if (userTypeLower === 'organizer') {

            const temp_organizer: Organizer = new Organizer(user_id, email, email);
            await adminDb.collection(COLLECTIONS.ORGANIZERS).doc(user_id).set(temp_organizer.toFirestoreObject());
            console.log("Firestore write to organizer done.");

        } else if (userTypeLower === 'vendor') {
            let temp_vendor: Vendor = new Vendor(user_id, email, email);
            await adminDb.collection(COLLECTIONS.VENDORS).doc(user_id).set(temp_vendor.toFirestoreObject());
            // await adminDb.collection(COLLECTIONS.VENDORS).doc(user_id).set(v_mapped);
            console.log("Firestore write to vendor done.");
        }

        console.log("🎉 Checkpoint 3: Firestore write complete!");

        // Create a session cookie (same as login flow)
        try {
            await making_a_session(user);
        } catch (error: any) {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log("[user logging in] making session failed")
            throw error;
        }
        return user_object;
    }

}
