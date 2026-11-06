import type { ConnectionCapability } from "../types";
import { getCatalogEntry } from "../catalog";

/** Copyable note for the Workspace admin (docs/17 §5.7). */
export function buildBlockedByAdminNote(opts: {
  clientId: string;
  capabilities?: ConnectionCapability[];
}): string {
  const caps = opts.capabilities?.length
    ? opts.capabilities
    : (["email.send"] as ConnectionCapability[]);
  const scopes = [
    ...new Set(
      caps.flatMap((c) => {
        const entry = getCatalogEntry(c);
        return entry ? ["openid", "email", ...entry.scopes] : ["openid", "email"];
      }),
    ),
  ];
  return [
    "Please allow the Avoeline app for our Google Workspace so we can send event email from our account.",
    "",
    `OAuth client ID: ${opts.clientId || "(not configured)"}`,
    "",
    "Requested permissions:",
    ...scopes.map((s) => `- ${s}`),
    "",
    "Until then we can connect a personal Gmail instead.",
  ].join("\n");
}
