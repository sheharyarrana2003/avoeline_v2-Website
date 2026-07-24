import { AuthService } from '@/src/features/auth/authService';
import SignInClient from './signinClient';
import { redirect } from 'next/navigation';
import { CurrentUserData } from '@/src/services/models/user.type';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export default async function SignIn() {

    const handleEmailLogin = async (email: string, password: string) => {
        'use server'

        try {
            await AuthService.loginWithEmail(email, password);
            const user: CurrentUserData | null = await AuthService.getCurrentUser();

            console.log("user data after signup", user);
            if (user === null) {
                redirect("/auth/signup");
            } else {
                const user_role = user.userType;
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
                error: error instanceof Error ? error.message : 'Failed to login. Please try again.'
            };
        }

    };

    return (
        <SignInClient handleEmailLogin={handleEmailLogin} />
    );
}