
import { cache } from "react"; // addding this because auth function is called by many components , using this db wll be called once and the result will be cached, the rest of components will get the cached result
import { signInWithEmailAndPassword } from 'firebase/auth';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '@/data/db'
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Organizer } from "@/src/services/models/organizer.model";
import { Vendor } from "@/src/services/models/vendor.model";
import { adminAuth } from "@/data/admin_db";
import { UserService } from "@/src/services/user.service";
import { cookies } from "next/headers";
import { User } from "@/src/services/models/user.type";
import { revalidatePath } from "next/cache";


const fetching_data_from_db = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get("firebaseToken")?.value;

    if (!token) revalidatePath("/auth/signup");

    try {
        const obj = await adminAuth.verifyIdToken(token);
        console.log("hard workkk finally paidoff");
        console.log(obj);

        return UserService.getUserById(obj.uid);
    } catch(error) {
        throw error;
    }
}

const converting_to_current_user_data = (user:User)=>{
return{
    userId: user?.userId || "",
    email : user?.email || "",
    name : user?.profile.fullName || "",
    userType : user?.userType || ""
}
}

export const AuthService = {
    //! hardcoded data
    getCurrentUser: async () => {
        const user = await fetching_data_from_db();

        return converting_to_current_user_data(user);
    },

    getCurrentVendor: cache(async () => {
        return {
            id: "V002",
            name: "Arhan",
            role: "Vendor",
            email: "arhan@avoeline.com"
        };
    }),

    async loginWithEmail(email: string, password: string) {
        console.log("Checkpoint 1:  function started.");
        console.log(`Payload checking: Email is "${email}", Password length is ${password?.length}`);

        try {
            const user_credintials = await signInWithEmailAndPassword(auth, email, password);
            console.log(user_credintials);
            const user = user_credintials.user;
            const user_id = user_credintials.user.uid;

            console.log("💾Checkpoint 2: Attempting Firestore read...");
            const docRef = doc(db, "users", user_id);
            const docSnap = await getDoc(docRef);
            const user_to_front_end = {
                "user_id": user_id,
                ...docSnap.data()
            }

            if (docSnap.exists()) {
                console.log("changing the user");
                await new Promise(r => setTimeout(r, 3000));
                console.log("user data:", docSnap.data());

            } else {
                console.log("No such user!");
                return null;
            }
            const token = await user.getIdToken();
            const cookieStore = await cookies();
            cookieStore.set("firebaseToken", token, {
                path: "/",
                maxAge: 3600,
                httpOnly: true,
            });


            console.log("User found");
            return user_to_front_end;

        } catch (error: any) {
            const errorCode = error.code;
            const errorMessage = error.message;
            throw error;
        }

    },

    async signUpWithEmail(formData: any) {
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
            console.log("💾 Checkpoint 2: Attempting Firestore write...", formData.role);
            await setDoc(doc(db, "users", user_id), user_object);
            console.log(`💾 Value: "[${formData.role}]" | Length: ${String(formData.role).length}`);


            if (String(formData.role).trim().toLowerCase() === 'organizer') {
                console.log("firestore wammt to write to organizer...");
                const temp_organizer: Organizer = new Organizer(user_id, email, email);
                await setDoc(doc(db, "organizer", user_id), temp_organizer.toFirestoreObject());
                console.log("doneeeeeeeee firestore write to organizer...");
            } else if (String(formData.role).trim().toLowerCase() === 'vendor') {
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
            user_object.user_id = user_id;
            return user_object;

        } catch (error: any) {
            const errorCode = error.code;
            const errorMessage = error.message;
            throw error;
        }
        return null;

    }

}