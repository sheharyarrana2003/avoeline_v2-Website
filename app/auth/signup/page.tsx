import {
    AuthService

} from '@/src/features/auth/authService';

import { redirect } from 'next/navigation';
import SignInClient from './SignupPageClient';
import { CurrentUserData } from '@/src/services/models/user.type';
export default function SignIn() {

    const handleSubmitLogin = async (formData: any) => {
        'use server'
        console.log("going in the function");
        await AuthService.signUpWithEmail(formData);
        const user: CurrentUserData | null = await AuthService.getCurrentUser();

        console.log("user data after signup", user);


        if (user === null) {
            redirect("/auth/signup");
        } else {
            const user_role = user.userType || "";
            redirect(`/${user_role.toLowerCase()}/${user.userId}/dashboard`);
        }


    };

    return (
        <SignInClient handleSubmitLogin={handleSubmitLogin} />
    );
}