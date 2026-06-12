export const AuthService = {
    //! hardcoded data
    async getCurrentUser() {
        return {
            id: "org_123",
            name: "Zain Ahmed",
            role: "ORGANIZER",
            email: "zain@avoeline.com"
        };
    }
}