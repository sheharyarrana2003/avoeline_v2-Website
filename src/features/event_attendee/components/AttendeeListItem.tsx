"use client"
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";

import { useState } from "react";


export function AttendeeListItem(
    { single_attendee, attendee_user, handleOnClick, handleCheckBoxChange }:
        {
            single_attendee: Attendee,
            attendee_user: User,
            handleOnClick: (attendee_id: String, user_id: string) => void,
            handleCheckBoxChange: (e: React.ChangeEvent<HTMLInputElement>, attendee_id: String) => void
        }) {

    // console.log(single_attendee);


    // console.log("attendee_user", attendee_user);
    const [selected, setSelected] = useState();
    return (
        <>

            <li>
                <input
                    type="checkbox"
                    className="hover:opacity-80 transition-opacity"
                    onChange={(e) => handleCheckBoxChange(e, single_attendee.attendeeId)}
                />
                <div
                    onClick={() => handleOnClick(single_attendee.attendeeId, attendee_user.userId)}
                >
                    {attendee_user.profile.fullName}
                    {attendee_user.email}
                </div>
            </li>
        </>
    )


}