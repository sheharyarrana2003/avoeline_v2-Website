'use server'
import { AuthService } from '@/src/features/auth/authService';
import SignInClient from './signinClient';
import { redirect } from 'next/navigation';
import { CurrentUserData } from '@/src/services/models/user.type';
import { seedEvents } from '@/seeding';

export default async function SignIn() {

    const handleEmailLogin = async (email: string, password: string) => {
        'use server'
        await AuthService.loginWithEmail(email, password);
        const user: CurrentUserData = await AuthService.getCurrentUser();
        console.log("this is in signup page -> ")

        if (user === null) {
            redirect("/auth/signup");
        } else {
            console.log("in front end", user)
            const user_id = user.userId;
            const user_role = user.userType;
            redirect(`/${user_role.toLowerCase()}/${user.roleId}/dashboard`);
        }

    };

    return (
        <SignInClient handleEmailLogin={handleEmailLogin} />
    );
}