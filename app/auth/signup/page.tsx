import { AuthService

 } from '@/src/features/auth/authService';

 import SignInClient from './SignupPageClient';
export default function SignIn() {

    const handleSubmitLogin = async (formData:any) => {
        'use server'
        console.log("going in the function");
        const user = await AuthService.signUpWithEmail(formData);
        console.log('innn page.tsx -> signin up in with:');
    };

    return (
       <SignInClient handleSubmitLogin={handleSubmitLogin} />
    );
}