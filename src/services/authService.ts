import { cache } from "react"; // addding this because auth function is called by many components , using this db wll be called once and the result will be cached, the rest of components will get the cached result

const fetching_data_from_db = async () => {
    console.log("You should only see this ONCE per page load)");
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
        id: "org_001",
        name: "Zain Ahmed",
        role: "ORGANIZER",
        email: "zain@avoeline.com"
    };
}

export const AuthService = {
    //! hardcoded data
    getCurrentUser: cache(async () => {
        return await fetching_data_from_db()
    }),

     getCurrentVendor: cache(async () => {
         return {
        id: "V001",
        name: "Arhan",
        role: "Vendor",
        email: "arhan@avoeline.com"
    };
    })
}