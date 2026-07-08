import { AuthService } from '@/src/features/auth/authService';
import SignInClient from './signinClient';
import { redirect } from 'next/navigation';
import { CurrentUserData } from '@/src/services/models/user.type';

export default async function SignIn() {

    const handleEmailLogin = async (email: string, password: string) => {
        'use server'
        await AuthService.loginWithEmail(email, password);
        const user: CurrentUserData | null = await AuthService.getCurrentUser();


        if (user === null) {
            redirect("/auth/signup");
        } else {
            console.log("in front end", user)
            const user_role = user.userType;
            console.log(`/${user_role.toLowerCase()}/${user.roleId}/dashboard`);
            redirect(`/${user_role.toLowerCase()}/${user.roleId}/dashboard`);
        }

    };

    return (
        <SignInClient handleEmailLogin={handleEmailLogin} />
    );
}