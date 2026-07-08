
import { cache } from "react"; // addding this because auth function is called by many components , using this db wll be called once and the result will be cached, the rest of components will get the cached result
import { signInWithEmailAndPassword } from 'firebase/auth';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '@/data/db'
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Organizer } from "@/src/services/models/organizer.model";
import { Vendor } from "@/src/services/models/vendor.model";
import { adminAuth, adminDb } from "@/data/admin_db";
import { UserService } from "@/src/services/user.service";
import { cookies } from "next/headers";
import { CurrentUserData, User } from "@/src/services/models/user.type";
import { revalidatePath } from "next/cache";
import { seedEvents } from '@/seeding'

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

const fetching_data_from_db = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get("firebaseToken")?.value;

    if (!token) revalidatePath("/auth/signup");

    try {
        const obj = await adminAuth.verifyIdToken(token);
        return UserService.getUserById(obj.uid);
    } catch (error) {
        console.log("[user error] cannot be logged in cookie not found")
        throw error;
    }
}
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

const making_a_session = async (user) => {
    const token = await user.getIdToken();
    const sessionCookieString = await handleAuthAndCreateCookie(token);
    const cookieStore = await cookies();
    cookieStore.set("firebaseSession", sessionCookieString, {
        path: "/",
        maxAge: 60 * 60 * 24 * 5,
        httpOnly: true
    });

}
const converting_to_current_user_data = async (user: User) => {
    const table_name = user.userType.trim().toLowerCase();
    const docRef = doc(db, table_name, user.userId);
    const docSnap = await getDoc(docRef);

    const role_object = docSnap.data() || {};
    const targetKey = `${table_name}id`.toLowerCase();
    let role_id = "didnt-exist";

    const actualKey = Object.keys(role_object).find(
        key => key.toLowerCase() === targetKey
    );

    if (actualKey) {
        role_id = role_object[actualKey];
    } else {
        console.error(`Could not find an ID key matching ${table_name} case-insensitively.`);
    }

    return {
        userId: user?.userId || "",
        email: user?.email || "",
        name: user?.profile.fullName || "",
        userType: user?.userType || "",
        roleId: role_id || ""
    }
}




export const AuthService = {
    getCurrentUser: cache(async () => {
        const cookieStore = await cookies();
        let jwt_key = cookieStore.get('firebaseToken')?.value;
        if (!jwt_key) {
            return null;
        }

        try {
            const currentUser = await adminAuth.verifyIdToken(jwt_key);
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
                console.log("cannot check user - failed in middle ware");
            }
        }
        return currentUser;

    }),

    async loginWithEmail(email: string, password: string) {
        console.log("Checkpoint 1:  function started.");
        console.log(`Payload checking: Email is "${email}", Password length is ${password?.length}`);
        //await seedEvents();

        let user_credintials;
        try {
            user_credintials = await signInWithEmailAndPassword(auth, email, password);

        } catch (error: any) {
            const errorCode = error.code;
            const errorMessage = error.message;
            throw error;
        }
        const user = user_credintials.user;
        const user_id = user_credintials.user.uid;

        try {
            console.log("💾Checkpoint 2: Attempting Firestore read...");
            const docSnap = await adminDb.collection("users").where("userId", "==", user_id).get();

            if (docSnap.exists()) {
                console.log("user data:", docSnap.data());
            } else {
                console.log("No such user!");
                return null;
            }

        } catch (error: any) {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log("[user logging in] finding user from db")
            throw error;
        }

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
        console.log(`Payload checking: Email is "${email}", Password length is ${password?.length}`);

        try {
            const user_credintials = await createUserWithEmailAndPassword(auth, email, password);
            const user = user_credintials.user;
            const user_id = user_credintials.user.uid;
            const user_object = {
                ...formData
            }
            console.log("💾 Checkpoint 2: Attempting Firestore write...", formData.userType);
            await setDoc(doc(db, "users", user_id), user_object);
            console.log(`💾 Value: "[${formData.userType}]" | Length: ${String(formData.userType).length}`);


            if (String(formData.userType).trim().toLowerCase() === 'organizer') {
                console.log("firestore wammt to write to organizer...");
                const temp_organizer: Organizer = new Organizer(user_id, email, email);
                await setDoc(doc(db, "organizer", user_id), temp_organizer.toFirestoreObject());
                console.log("doneeeeeeeee firestore write to organizer...");
            } else if (String(formData.userType).trim().toLowerCase() === 'vendor') {
                const temp_vendor: Vendor = new Vendor(user_id, email, email);
                await setDoc(doc(db, "vendor", user_id), temp_vendor.toFirestoreObject());
                console.log("doneeeeeeeee firestore write to vendorrr...");
            }

            console.log("🎉 Checkpoint3: Firestore write complete!");
            const token = await user.getIdToken();
            const cookieStore = await cookies();
            cookieStore.set("firebaseToken", token, {
                path: "/",
                maxAge: 3600,
                httpOnly: true,
            });


            const obj = await adminAuth.verifyIdToken(token);
            const user_from_obj = await UserService.getUserById(obj.uid);
            const current_user = converting_to_current_user_data(user_from_obj);

            cookieStore.set("userData", JSON.stringify(current_user), {
                path: "/",
                maxAge: 3600,
                httpOnly: true,
            });

            return user_object;

        } catch (error: any) {
            const errorCode = error.code;
            const errorMessage = error.message;
            throw error;
        }
        return null;

    }

}