import { AuthService } from '@/src/features/auth/authService';

import { redirect } from 'next/navigation';
import SignInClient from './SignupPageClient';
import { CurrentUserData } from '@/src/services/models/user.type';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export default async function SignUpPage({
    searchParams,
}: {
    searchParams: Promise<{ role?: string }>;
}) {
    const { role } = await searchParams;

    const handleSubmitLogin = async (formData: unknown) => {
        'use server'

        try {
            await AuthService.signUpWithEmail(formData as any);
            const user: CurrentUserData | null = await AuthService.getCurrentUser();

            if (user === null) {
                redirect("/auth/signup");
            }

            const nextRole = String(user.userType || "").toLowerCase();
            if (nextRole === "organizer") {
                redirect(`/organizer/${user.userId}/dashboard`);
            }
            if (nextRole === "vendor") {
                redirect("/auth/signup/vendorSetup");
            }
            redirect(`/${nextRole}/${user.userId}/dashboard`);

        } catch (error) {
            if (isRedirectError(error)) {
                throw error;
            }

            console.error("Signup failed:", error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to setup an account. Please try again.'
            };
        }

    };

    const parsedRole = role === "Vendor" || role === "Attendee" || role === "Organizer" ? role : undefined;

    return (
        <SignInClient handleSubmitLogin={handleSubmitLogin} role={parsedRole} />
    );
}
