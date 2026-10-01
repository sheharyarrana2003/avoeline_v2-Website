import { redirect } from "next/navigation";
import type { ActionResult } from "./action";

function safePath(value: unknown): string | null {
  const path = typeof value === "string" ? value : "";
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return null;
  return path;
}

/**
 * Plain `<form action>` server actions can't return a result to a Server
 * Component page, so they redirect back with `?e=` or `?ok=` for the page to
 * render. `returnTo` is a hidden field; only same-origin paths are followed.
 */
export function finishForm(formData: FormData, fallback: string, result: ActionResult, okMessage?: string): never {
  const url = new URL(safePath(formData.get("returnTo")) ?? fallback, "http://local");
  url.searchParams.delete("e");
  url.searchParams.delete("ok");
  if (!result.success) url.searchParams.set("e", result.error || "Something went wrong.");
  else if (okMessage) url.searchParams.set("ok", okMessage);
  redirect(`${url.pathname}${url.search}`);
}
