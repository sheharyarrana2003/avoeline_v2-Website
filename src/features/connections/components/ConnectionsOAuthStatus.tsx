import type { diagnoseGoogleConnectionsEnv } from "@/src/env";

type Diagnostics = ReturnType<typeof diagnoseGoogleConnectionsEnv>;

export function ConnectionsOAuthStatus({
  googleReady,
  hasAccounts,
  diagnostics,
}: {
  googleReady: boolean;
  hasAccounts: boolean;
  /** Platform admin / owner only — never pass secrets. */
  diagnostics?: Diagnostics | null;
}) {
  if (googleReady && !diagnostics) return null;

  return (
    <div className="space-y-3">
      {!googleReady ? (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          Google connect isn’t available on this site yet. Ask your platform admin to finish setup.
          {hasAccounts
            ? " Accounts listed below may be from an earlier setup — reconnect them once Google is configured."
            : null}
        </p>
      ) : null}

      {diagnostics ? (
        <details className="rounded-xl border border-line bg-canvas/40 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-ink">
            Admin diagnostics (variable names only)
          </summary>
          <ul className="mt-3 space-y-1 text-xs text-ink-soft">
            {diagnostics.variables.map((v) => (
              <li key={v.name}>
                <span className="font-mono text-ink">{v.name}</span>
                {v.legacyAlias ? (
                  <span className="text-ink-faint"> (or {v.legacyAlias})</span>
                ) : null}
                :{" "}
                <span className={v.present ? "text-emerald-800" : "text-red-800"}>
                  {v.present ? "present" : "missing"}
                </span>
              </li>
            ))}
            <li>
              Expected redirect path:{" "}
              <span className="font-mono text-ink">{diagnostics.expectedRedirectPath}</span>
            </li>
            <li>
              Expected redirect URI:{" "}
              <span className="font-mono text-ink">{diagnostics.expectedRedirectUriHint}</span>
            </li>
            <li>
              Ready:{" "}
              <span className={diagnostics.ready ? "text-emerald-800" : "text-red-800"}>
                {diagnostics.ready ? "yes" : "no"}
              </span>
            </li>
          </ul>
          <p className="mt-2 text-[11px] text-ink-faint">
            Values are never shown here. Compare names and the redirect URI with your Google Cloud
            OAuth client.
          </p>
        </details>
      ) : null}
    </div>
  );
}
