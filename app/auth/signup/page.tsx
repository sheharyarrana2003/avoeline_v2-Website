import {
    AuthService

} from '@/src/features/auth/authService';

import { redirect } from 'next/navigation';
import SignInClient from './SignupPageClient';
import { CurrentUserData } from '@/src/services/models/user.type';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
export default function SignIn() {

    const handleSubmitLogin = async (formData: any) => {
        'use server'


        try {
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

        } catch (error) {
            if (isRedirectError(error)) {
                throw error;
            }

            console.error("Event creation failed:", error);

            // Returning this keeps the user on the current page and sends back the error
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to setup an account. Please try again.'
            };
        }

    };

    return (
        <SignInClient handleSubmitLogin={handleSubmitLogin} />
    );
}