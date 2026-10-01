/** True if the URL points at a video file (by extension). */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(url);
}

/** accept attribute allowing both images and videos. */
export const IMAGE_AND_VIDEO_ACCEPT = "image/*,video/*";

/**
 * accept attribute for the document types uploadMedia allows — rules and
 * problem-statement files, pitch decks, agreements. Kept in step with
 * ALLOWED_TYPES in uploadMedia.action.ts; widen both or neither.
 */
export const DOCUMENT_ACCEPT = ".pdf,.ppt,.pptx,.doc,.docx,.txt,.csv";

/** Everything uploadMedia will take. */
export const ANY_UPLOAD_ACCEPT = `${IMAGE_AND_VIDEO_ACCEPT},${DOCUMENT_ACCEPT}`;

/** True if the URL points at a document rather than something renderable inline. */
export function isDocumentUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(pdf|ppt|pptx|doc|docx|txt|csv)(\?|#|$)/i.test(url);
}
