import Image from "next/image";
import type { BlockDataMap } from "../schemas";
import { SectionShell, SectionTitle, hasText } from "./shared";

export function TeamRenderer({ data }: { data: BlockDataMap["team"] }) {
  const members = (data.members ?? []).filter((m) => hasText(m.name));
  if (members.length === 0) return null;

  return (
    <SectionShell>
      <SectionTitle title={data.title} body={data.body} />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m, i) => (
          <li key={`${m.name}-${i}`} className="rounded-2xl border border-[var(--mkt-line)] p-6">
            {hasText(m.photoUrl) ? (
              <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full bg-[var(--muted)]">
                <Image src={m.photoUrl.trim()} alt="" fill className="object-cover" sizes="96px" />
              </div>
            ) : null}
            <h3 className="font-display text-xl text-[var(--mkt-ink)]">{m.name.trim()}</h3>
            {hasText(m.role) ? (
              <p className="mt-1 text-sm text-[var(--mkt-muted)]">{m.role.trim()}</p>
            ) : null}
            {hasText(m.bio) ? (
              <p className="mt-3 text-sm leading-relaxed text-[var(--mkt-text)]">{m.bio.trim()}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
