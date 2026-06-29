import { AuthService

 } from '@/src/features/auth/authService';

 import SignInClient from './SignupPageClient';
export default function SignIn() {

    const handleSubmitLogin = async (formData:any) => {
        'use server'
        const user = await AuthService.signUpWithEmail(formData);
        console.log('signin up in with:', user);
    };

    return (
       <SignInClient handleSubmitLogin={handleSubmitLogin} />
    );
}