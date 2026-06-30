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
        const user: CurrentUserData = await AuthService.getCurrentUser();
        console.log('innn page.tsx -> signin up in with:');
        const user_id = user.userId;
        const user_role = user.userType;
        redirect(`/${user_role.toLowerCase()}/${user_id}/dashboard`);
    };

    return (
        <SignInClient handleSubmitLogin={handleSubmitLogin} />
    );
}