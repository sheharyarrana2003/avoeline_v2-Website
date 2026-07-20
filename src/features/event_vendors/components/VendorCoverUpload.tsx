"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MediaUpload } from "@/src/features/media/MediaUpload";
import { updateVendorCover } from "@/src/features/event_vendors/actions/updateVendorCover.action";

export function VendorCoverUpload({ vendorId, currentCover }: { vendorId: string; currentCover?: string }) {
  const router = useRouter();
  const [cover, setCover] = useState<string>(currentCover ?? "");

  return (
    <MediaUpload
      folder="vendor-covers"
      accept="image/*"
      value={cover || null}
      label="Upload cover"
      buttonClassName="relative flex h-24 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400 transition hover:border-gray-400 disabled:opacity-60"
      onUploaded={async (url) => {
        setCover(url);
        const res = await updateVendorCover(vendorId, url);
        if (res.success) router.refresh();
      }}
    />
  );
}
