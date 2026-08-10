"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/src/shared_components/ui/Toast";
import { MediaUpload } from "@/src/features/media/MediaUpload";
import { updateVendorLogo } from "@/src/features/event_vendors/actions/updateVendorLogo.action";

export function VendorLogoUpload({ vendorId, currentLogo }: { vendorId: string; currentLogo?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [logo, setLogo] = useState<string>(currentLogo ?? "");

  return (
    <MediaUpload
      folder="vendor-logos"
      accept="image/*"
      value={logo || null}
      label="Upload logo"
      buttonClassName="relative flex h-20 w-20 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-400 transition hover:border-gray-400 disabled:opacity-60"
      onUploaded={async (url) => {
        setLogo(url);
        const res = await updateVendorLogo(vendorId, url);
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
