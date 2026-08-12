"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/src/shared_components/ui/Toast";
import { MediaUpload } from "@/src/features/media/MediaUpload";
import { updateOrganizerLogo } from "./updateOrganizerLogo.action";

export function OrganizerLogoUpload({
  organizerId,
  currentLogo,
}: {
  organizerId: string;
  currentLogo?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [logo, setLogo] = useState<string>(currentLogo ?? "");

  return (
    <MediaUpload
      folder="organizer-logos"
      accept="image/*"
      value={logo || null}
      label="Upload logo"
      buttonClassName="relative flex h-20 w-20 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed border-line-loud bg-canvas text-2xs text-ink-soft transition hover:border-gray-900 disabled:opacity-60"
      onUploaded={async (url) => {
        setLogo(url);
        const res = await updateOrganizerLogo(organizerId, url);
        if (res.success) {
          router.refresh();
          toast.success("Logo updated.");
        } else {
          toast.error(res.error ?? "Could not update your logo. Please try again.");
        }
      }}
    />
  );
}
