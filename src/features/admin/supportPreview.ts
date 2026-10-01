import { headers } from "next/headers";

export function isSupportViewer(user: { role?: string; userType?: string } | null | undefined): boolean {
  if (!user) return false;
  return user.role === "platform_admin" || String(user.userType).toLowerCase() === "admin";
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
