import type { Metadata } from "next";
import { SiteHeader } from "@/src/shared_components/chrome/SiteHeader";
import { AppFooter } from "@/src/shared_components/chrome/AppFooter";
import { AnnouncementBanner } from "@/src/shared_components/chrome/AnnouncementBanner";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-shell flex flex-1 flex-col bg-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow"
      >
        Skip to content
      </a>
      <AnnouncementBanner />
      <SiteHeader variant="marketing" />
      <div id="main-content" className="flex flex-1 flex-col" tabIndex={-1}>
        {children}
      </div>
      <AppFooter />
    </div>
  );
}
