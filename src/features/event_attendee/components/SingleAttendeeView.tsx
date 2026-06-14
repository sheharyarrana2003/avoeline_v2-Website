"use client"
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";

import { useState } from "react";
interface SingleAttendeeViewProps {
    a: Attendee,
    user: User
}

export function SingleAttendeeView({ combined_data }: { combined_data : SingleAttendeeViewProps }) {
return(
    <>
    <h3>i hope so i am printint when i am supposed to</h3>
    <p>{combined_data.user.profile.fullName}</p>
    </>
)


}