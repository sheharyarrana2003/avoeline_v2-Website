import type { BlockDataMap } from "../schemas";
import { SectionShell, SectionTitle, hasText } from "./shared";

export function ContactInfoRenderer({ data }: { data: BlockDataMap["contact_info"] }) {
  const email = hasText(data.email) ? data.email.trim() : null;
  const phone = hasText(data.phone) ? data.phone.trim() : null;
  const whatsapp = hasText(data.whatsapp) ? data.whatsapp.trim() : null;
  const address = hasText(data.address) ? data.address.trim() : null;
  const responseTime = hasText(data.responseTime) ? data.responseTime.trim() : null;

  if (!email && !phone && !whatsapp && !address) return null;

  return (
    <SectionShell>
      <SectionTitle title={data.title} />
      <dl className="space-y-3 text-base text-[var(--mkt-text)]">
        {email ? (
          <div>
            <dt className="text-xs font-medium uppercase text-[var(--mkt-muted)]">Email</dt>
            <dd>
              <a href={`mailto:${email}`} className="text-[var(--mkt-accent)] hover:underline">
                {email}
              </a>
            </dd>
          </div>
        ) : null}
        {phone ? (
          <div>
            <dt className="text-xs font-medium uppercase text-[var(--mkt-muted)]">Phone</dt>
            <dd>
              <a href={`tel:${phone}`} className="hover:underline">
                {phone}
              </a>
            </dd>
          </div>
        ) : null}
        {whatsapp ? (
          <div>
            <dt className="text-xs font-medium uppercase text-[var(--mkt-muted)]">WhatsApp</dt>
            <dd>{whatsapp}</dd>
          </div>
        ) : null}
        {address ? (
          <div>
            <dt className="text-xs font-medium uppercase text-[var(--mkt-muted)]">Address</dt>
            <dd className="whitespace-pre-wrap">{address}</dd>
          </div>
        ) : null}
        {responseTime ? (
          <div>
            <dt className="text-xs font-medium uppercase text-[var(--mkt-muted)]">Response</dt>
            <dd>{responseTime}</dd>
          </div>
        ) : null}
      </dl>
    </SectionShell>
  );
}
