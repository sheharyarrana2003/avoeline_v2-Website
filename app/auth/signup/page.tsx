import {
    AuthService

} from '@/src/features/auth/authService';

import { redirect } from 'next/navigation';
import SignInClient from './SignupPageClient';
export default function SignIn() {

    const handleSubmitLogin = async (formData: any) => {
        'use server'
        console.log("going in the function");
        const user = await AuthService.signUpWithEmail(formData);
        console.log('innn page.tsx -> signin up in with:');
        const user_id = user.user_id;
        const user_role = user.role;
        redirect(`/${user_role.toLowerCase()}/${user_id}/dashboard`);
    };

    return (
        <SignInClient handleSubmitLogin={handleSubmitLogin} />
    );
}