import { AuthService } from '@/src/features/auth/authService';
import SignInClient from './signinClient';
import { redirect } from 'next/navigation';
import { CurrentUserData } from '@/src/services/models/user.type';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

/**
 * Only ever follow a same-origin path. `//evil.com` and `/\evil.com` are both
 * treated as absolute URLs by browsers, so an unchecked `next` would be an open
 * redirect.
 */
function safeNext(value: unknown): string | null {
    const path = typeof value === 'string' ? value : '';
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null;
    return path;
}

export default async function SignIn({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Set by the middleware / setup pages when they bounce a signed-out visitor,
    // so signing in returns them to where they were going.
    const nextPath = safeNext((await searchParams)?.next);

    const handleEmailLogin = async (email: string, password: string, next?: string) => {
        'use server'

        // The client sends whatever ?next= is on the URL at submit time; it is
        // untrusted input, so re-validate it here. Falls back to the value bound
        // when this page rendered.
        const target = safeNext(next) ?? nextPath;

        try {
            await AuthService.loginWithEmail(email, password);
            const user: CurrentUserData | null = await AuthService.getCurrentUser();

            console.log("user data after signup", user);
            if (user === null) {
                redirect("/auth/signup");
            } else if (target) {
                redirect(target);
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