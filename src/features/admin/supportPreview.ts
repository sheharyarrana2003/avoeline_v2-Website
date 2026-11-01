import { headers } from "next/headers";

export function isSupportViewer(
  user: { role?: string; userType?: string } | null | undefined,
): boolean {
  if (!user) return false;
  return user.role === "platform_admin" || String(user.userType).toLowerCase() === "admin";
}

/**
 * True when a platform admin is browsing another tenant's URL (Enter view).
 * Mutations must refuse this path (ENGINEERING_RULES S9).
 */
export async function isSupportPreviewPath(adminUserId: string): Promise<boolean> {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const orgId = idAfterPrefix(pathname, "/organizer");
  if (orgId && orgId !== adminUserId) return true;
  const vendorId = idAfterPrefix(pathname, "/vendor");
  if (vendorId && vendorId !== adminUserId) return true;
  if (pathname === "/department" || pathname.startsWith("/department/")) return true;
  return false;
}

/** Server Actions send Next-Action; RSC reads do not. */
export async function isServerActionRequest(): Promise<boolean> {
  const h = await headers();
  return !!(h.get("next-action") || h.get("Next-Action"));
}

/** Path after the first segment, e.g. `/organizer/{id}/dashboard` → id. */
export function idAfterPrefix(pathname: string, prefix: string): string | null {
  const base = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return null;
  const rest = pathname.slice(base.length).replace(/^\//, "");
  const id = rest.split("/")[0] ?? "";
  return id || null;
}

export async function requestPathname(): Promise<string> {
  return (await headers()).get("x-pathname") ?? "";
}
