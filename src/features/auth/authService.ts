import { cache } from "react"; // addding this because auth function is called by many components , using this db wll be called once and the result will be cached, the rest of components will get the cached result
import { signInWithEmailAndPassword } from 'firebase/auth';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '@/data/db'
import { doc, setDoc ,getDoc} from 'firebase/firestore';

const fetching_data_from_db = async () => {
    console.log("You should only see this ONCE per page load)");
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
        id: "org_001",
        name: "Zain Ahmed",
        role: "ORGANIZER",
        email: "zain@avoeline.com"
    };
}

export const AuthService = {
    //! hardcoded data
    getCurrentUser: cache(async () => {
        return await fetching_data_from_db()
    }),

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
            const user_to_front_end ={
                "user_id":user_id,
                ...docSnap.data()
            }

            if (docSnap.exists()) {
                console.log("user data:", docSnap.data());
            } else {
                console.log("No such user!");
                return null;
            }

            console.log("User found");
            return user_to_front_end;

        } catch (error: any) {
            const errorCode = error.code;
            const errorMessage = error.message;
            throw error;
        }

    },

    async signUpWithEmail(formData:any) {
        const email = formData.email;
        const password = formData.password;
        console.log("Checkpoint 1: signUpWithEmail function started.");
        console.log(`Payload checking: Email is "${email}", Password length is ${password?.length}`);

        try {
            const user_credintials = await createUserWithEmailAndPassword(auth, email, password);
            console.log(user_credintials);
            const user = user_credintials.user;
            const user_id = user_credintials.user.uid;
            const user_object = {
                ...formData
            }
            console.log("Checking database instance:", db);
            console.log("💾 Checkpoint 2: Attempting Firestore write...");
            await setDoc(doc(db, "users", user_id), user_object);

            console.log("🎉 Checkpoint3: Firestore write complete!");
            return user;

        } catch (error: any) {
            const errorCode = error.code;
            const errorMessage = error.message;
            throw error;
        }


    }

}