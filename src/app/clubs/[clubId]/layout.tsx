import { DashboardNav } from "@/src/shared_components/DashboardNav";
import { AppFooter } from "@/src/shared_components/chrome/AppFooter";
import { AuthService } from "@/src/features/auth/authService";
import { clubChrome, isClubPresident, resolveClub } from "@/src/features/clubs/club.service";

export default async function ClubLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ clubId: string }>;
}) {
    const { clubId } = await params;
    const [club, user] = await Promise.all([resolveClub(clubId), AuthService.getCurrentUser()]);
    if (!user || !isClubPresident(user, club)) {
        return <>{children}</>;
    }

    const chrome = await clubChrome(club.id, user.userId);

    return (
        <>
            <DashboardNav
                basePath={`/clubs/${club.id}`}
                homeHref={`/clubs/${club.id}`}
                showAccount
                profileHref={`/organizer/${user.userId}/profile`}
                notificationsHref={`/organizer/${user.userId}/notifications`}
                name={chrome.name}
                items={chrome.items}
            />
            <div className="flex flex-1 flex-col md:pl-52">
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
                <AppFooter compact />
            </div>
        </>
    );
}
