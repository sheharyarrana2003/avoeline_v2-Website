"use client"
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";
import { useState } from "react";
import { AttendeeListItem } from "./AttendeeListItem";
import { SingleAttendeeView } from "./SingleAttendeeView";
import { Divide } from "lucide-react";
interface AttendeeClientSideProp {
    a: Attendee,
    user: User
}
export function AttendeeClientSide({ attendee }: { attendee: AttendeeClientSideProp[] }) {
    const [count, setCount] = useState(0);
    const [selected_ids, set_selected_ids] = useState<String[]>([]);
    const [single_attendee_view, set_single_attendee_view] = useState<AttendeeClientSideProp | null>(null);

    const handleOnClick = (attendee_id: string, user_id: string) => {
        // console.log("This attendee was clicked => ", attendee_id);
        // console.log("This user was clicked => ", user_id);

        const target = attendee.find((a) => a.user.userId === user_id) || null;
        if (target) {
            set_single_attendee_view(target);
        } else {
            console.log("No matching attendee found for this user ID.");
        }


    }

    const handleCheckBoxChange = (e: React.ChangeEvent<HTMLInputElement>, attendee_id: string) => {
        const isChecked = e.target.checked;
        // console.log("Checkbox clicked! Is it checked?", isChecked);
        if (isChecked) {
            setCount((prevCount) => prevCount + 1);
            console.log("Addin this  -> ", attendee_id)
            set_selected_ids([...selected_ids, attendee_id]);
        } else {
            setCount((prevCount) => prevCount - 1);
            set_selected_ids((prev_arr) => prev_arr.filter(item => item !== attendee_id));
        }
    }

    const handleMassDelete = () => {
        console.log("Deleteing these");
        console.log(selected_ids);
    }




    return (
        <>

            {count > 0 && <div>
                <p>Currently Selected {count}</p>
                <button onClick={handleMassDelete}>Delete ALL</button>
            </div>
            }


            <div className="space-y-4">
                {attendee.map((acs) => (
                    <AttendeeListItem
                        key={acs.a.attendeeId}
                        single_attendee={acs.a}
                        attendee_user={acs.user}
                        handleOnClick={handleOnClick}
                        handleCheckBoxChange={handleCheckBoxChange}

                    />
                ))}
            </div>

            {single_attendee_view && <SingleAttendeeView combined_data={single_attendee_view} />}
        </>
    )

}
