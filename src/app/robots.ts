import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/src/features/website/pageMetadata";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/organizer",
          "/organizer/",
          "/vendor",
          "/vendor/",
          "/attendee",
          "/attendee/",
          "/department",
          "/department/",
          "/clubs",
          "/clubs/",
          "/api/",
          "/auth/change-password",
          "/suspended",
          "/access-denied",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
