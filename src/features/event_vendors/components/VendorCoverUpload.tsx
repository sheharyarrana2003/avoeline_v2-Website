"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/src/shared_components/ui/Toast";
import { MediaUpload } from "@/src/features/media/MediaUpload";
import { updateVendorCover } from "@/src/features/event_vendors/actions/updateVendorCover.action";

export function VendorCoverUpload({ vendorId, currentCover }: { vendorId: string; currentCover?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [cover, setCover] = useState<string>(currentCover ?? "");

  return (
    <MediaUpload
      folder="vendor-covers"
      accept="image/*"
      value={cover || null}
      label="Upload cover"
      buttonClassName="relative flex h-24 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed border-line-loud bg-canvas text-xs text-ink-soft transition hover:border-gray-900 disabled:opacity-60"
      onUploaded={async (url) => {
        setCover(url);
        const res = await updateVendorCover(vendorId, url);
        if (res.success) {
          router.refresh();
          toast.success("Cover image updated.");
        } else {
          toast.error(res.error ?? "Could not update your cover image. Please try again.");
        }
      }}
    />
  );
}
