'use client';
import { useRouter } from 'next/navigation'
import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaApple, FaLinkedin } from 'react-icons/fa';
import { AuthService } from '@/src/features/auth/authService';
import SignInClient from './signinClient';

export default function SignIn() {
    const router = useRouter();

    const handleEmailLogin = async (e: React.FormEvent,email:string,password:string) => {
        e.preventDefault();
        const user = await AuthService.loginWithEmail(email, password);


        if (user === null) {
            router.push("/auth/signup");
        } else {
            console.log("in front end", user)
            const user_id = user.user_id;
            const user_role = user.role;
            router.push(`/${user_role.toLowerCase()}/${user_id}/dashboard`);
        }
        console.log('Logging in with:', user);
    };

    return (
   <SignInClient handleEmailLogin={handleEmailLogin}/>
    );
}