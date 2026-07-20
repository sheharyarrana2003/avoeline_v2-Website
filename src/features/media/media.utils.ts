/** True if the URL points at a video file (by extension). */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(url);
}

/** accept attribute allowing both images and videos. */
export const IMAGE_AND_VIDEO_ACCEPT = "image/*,video/*";
