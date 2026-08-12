import { AuthService } from '@/src/features/auth/authService';

import { redirect } from 'next/navigation';
import SignInClient from './SignupPageClient';
import { CurrentUserData } from '@/src/services/models/user.type';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export default function SignIn() {

    const handleSubmitLogin = async (formData: any) => {
        'use server'

        try {
            await AuthService.signUpWithEmail(formData);
            const user: CurrentUserData | null = await AuthService.getCurrentUser();

            if (user === null) {
                redirect("/auth/signup");
            }

            const role = String(user.userType || "").toLowerCase();
            if (role === "organizer") {
                redirect("/auth/signup/organizerSetup");
            }
            if (role === "vendor") {
                redirect("/auth/signup/vendorSetup");
            }
            // Attendees (and any other role) go straight to their dashboard.
            redirect(`/${role}/${user.userId}/dashboard`);

        } catch (error) {
            if (isRedirectError(error)) {
                throw error;
            }

            console.error("Signup failed:", error);

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
