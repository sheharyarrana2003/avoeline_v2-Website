'use server'
import { AuthService } from '@/src/features/auth/authService';
import SignInClient from './signinClient';
import { redirect } from 'next/navigation';
export  default async function SignIn() {

    const handleEmailLogin = async (email:string,password:string) => {
        'use server'
        const user = await AuthService.loginWithEmail(email, password);


        if (user === null) {
            redirect("/auth/signup");
        } else {
            console.log("in front end", user)
            const user_id = user.user_id;
            const user_role = user.role;
           redirect(`/${user_role.toLowerCase()}/${user_id}/dashboard`);
        }
        console.log('Logging in with:', user);
    };

    return (
   <SignInClient handleEmailLogin={handleEmailLogin}/>
    );
}