# Avoeline marketing website (avoeline.aroxes.com): design, CMS and Cursor prompts

Pages: Home, Plans, About, Partners, Contact, Privacy Policy, Terms and Conditions. Everything is managed from the SaaS owner dashboard. Hand sections 1 to 9 to Cursor; section 0 is for you.

---

## 0. Read first (for you, not for Cursor): data use and the privacy policy

**Can the policy say you collect registration data and sponsor/partner details?** Yes, and it must. Saying it is not the risk. The risks are vague wording, and using the data in ways the policy doesn't say.

**What I won't help with:** collecting attendee registration lists to use for your own networking or outreach, while deliberately leaving that use out of the policy. I'm not going to design that hidden export. Besides being deceptive to the people who registered, it is unlawful in most places: privacy laws like GDPR (which applies whenever EU or UK residents register) require telling people what you do with their data and limit using it for purposes they weren't told about, and unsolicited contact is regulated separately. Practically it also hurts you: Google reviews your privacy policy when verifying your OAuth app, your payment and hosting providers expect accurate disclosures, and organizers will leave if they find attendee data being used behind their backs. The applicable law depends on where you and your users are, so have a lawyer review the final text.

**How the roles work (this matters for the wording):**
- For **registration data**, the *organizer* decides why it is collected, and Avoeline processes it on their behalf. You can use it to run the service, prevent fraud and give support, but not for your own marketing.
- For **account, billing, usage and support data** (organizers, vendors, departments), Avoeline decides how it's used. You can contact those customers about product updates, billing and service changes.
- Sponsor and partner details entered by organizers are the organizer's data unless the sponsor or partner deals with you directly.

**What gets you what you want, openly:**
1. **Opt-in community.** A separate, unticked checkbox on signup and registration ("Send me updates and connect me with the Avoeline community"), recorded with a timestamp, easy to withdraw, with an unsubscribe link in every message. Everyone who ticks it forms a list you can use for networking, announcements and introductions, with no legal gray area. The owner dashboard in section 4 builds this audience.
2. **Aggregate insights** for the owner dashboard: counts by city, category, month and event type, with no personal data. You can use these publicly too, as the live stats on the website.
3. **Partner and sponsor introductions** that happen only when an organizer or attendee opts in.
4. **Customers as contacts:** organizers, vendors and departments are your customers, and the policy can cover product and service messages to them.

The policy drafts in section 8 describe all of this honestly. Keep the opt-in wording short and the checkbox unticked.

---

## 1. Goals, structure and domain

- **Goal:** convert university societies, organizers and vendors into sign-ups. Show real proof (live numbers, real logos, real events), answer pricing questions, and look as polished as the product.
- **Pages:** `/` Home, `/plans`, `/about`, `/partners`, `/contact`, `/privacy`, `/terms`, plus `/cookies` (only if non-essential cookies are used), a custom 404, `sitemap.xml` and `robots.txt`.
- **Header:** logo, Features (anchor on Home), Plans, Partners, About, Contact, Sign in, and a primary **Get started** button. **Footer:** product links, legal links, `info@aroxes.com`, social links, "An Aroxes company" (link to aroxes.com when it exists), the language/currency selector if used.
- **Where it lives:** the same Next.js app in a `(marketing)` route group served at the root of `avoeline.aroxes.com`, so it reads plans, stats and public events straight from the database. In Vercel add the domain, then in Hostinger DNS add the CNAME it shows. The existing app routes stay unchanged. Marketing pages are indexable; app routes are `noindex`.

---

## 2. Design system

**Look:** modern, calm and confident. Dark ink hero with a soft indigo glow and a faint grid, white sections, large type, generous whitespace, rounded-2xl cards, subtle borders instead of heavy shadows. It should feel like the product dashboard: same fonts, radii and buttons.

| Token | Value |
|---|---|
| Ink (dark surfaces, headings) | `#0B1020` |
| Accent (indigo) | `#4F46E5`, soft `#C7CBFF`, tint `#EEF0FF` |
| Text / muted / line | `#1F2937` / `#6B7280` / `#D9DCE8` |
| Success / warning / danger | reuse the product theme tokens |
| Fonts | Headings: the product's heading font (a geometric grotesque such as Space Grotesk). Body: Inter. Load with `next/font` |
| Type scale | Hero 56/64 (mobile 38/44), H2 40, H3 24, body 17/28, small 14 |
| Radius, spacing | Cards `rounded-2xl`, buttons pill, 8-px spacing grid, content max-width 1200 px |
| Buttons | Primary: black on light, white on dark. Secondary: outlined. Only one primary per section |
| Motion | Subtle fade/slide on scroll, hover lifts. **Respect `prefers-reduced-motion`.** No heavy animation libraries |
| Imagery | Real product screenshots inside a browser frame (taken from seeded demo data), event banners from real public events. No stock photos of fake people |
| Icons | One set (Lucide), consistent stroke |
| Dark mode | Follow the system. The hero stays dark in both |

**Quality bars:** Lighthouse 95+ on performance, accessibility, best practices and SEO. Largest Contentful Paint under 2.5 s, WCAG AA contrast, keyboard operable, visible focus, meaningful alt text, mobile-first. Marketing pages are statically generated and revalidated (section 6).

---

## 3. Page specs (every text, image and number below is editable by the owner)

### Home
1. **Hero (dark):** headline, subheadline, two buttons (**Get started free**, **See plans**), product screenshot, and a trust line fed by live stats ("Trusted by N organizers · N events").
2. **Live stats strip:** real numbers only (see section 5). A stat hides itself until it passes its minimum threshold. No manual inflation.
3. **Logo wall:** organizations that opted in (partners table). Hidden when there are none.
4. **Feature bento grid:** Events and ticketing · Hackathons and CTF · Clubs and departments · Sponsors, partners and vendor marketplace · Certificates with public verification · AI planner and analytics · Connect your Google account for email, calendar and files. Each tile: icon, title, one line, optional screenshot.
5. **How it works:** 4 steps (Create your event, Open registration, Run the day, Follow up and certify).
6. **Who it's for (tabs):** Organizers, Universities and clubs, Vendors, Attendees.
7. **Upcoming public events:** cards with the event banner (real public events, owner can feature, hide or exclude). Excludes demo data.
8. **Pricing teaser:** the live plans with the recommended one highlighted.
9. **Testimonials:** only real, consented quotes. Hidden until there are some.
10. **FAQ** accordion and a **final CTA band**.

### Plans (live from the database)
- Plan cards from `subscription_plans` where `is_public`: name, tagline, price with currency, billing note, highlight features, CTA. The plan flagged `is_recommended` shows a "Recommended" badge and visual emphasis, and sorting follows `sort_order`. Changes made in the owner dashboard appear on the site within seconds (on-demand revalidation).
- **Feature comparison table** built from the module catalog: every module with a plain-language description, a check or dash per plan, grouped (Events, Teams, Hackathons, Sponsors, Certificates, Vendors, Email and Google connections, Analytics, AI). Show the email limits per plan (daily and monthly caps) from the plan limits.
- Enterprise or custom: "Contact us" button to the contact page with the plan preselected. Billing note explains how payment works (for example bank transfer with an invoice). A short pricing FAQ. CTA goes to sign-up with `?plan=<key>`.

### About
Story and mission, values, a short timeline, the team (optional, with photo and role), and "Avoeline is built by Aroxes, a group of companies making practical software for local businesses and people", listing Aroxes products (Distroline and Avoeline) with links. CTA at the end.

### Partners
Sections, each hidden when empty: **Organizers and institutions on Avoeline** (logo wall), **Sponsors and partners**, **Vendors**, **Technology**. Cards open an optional detail view (description, link). A "Become a partner" CTA with a short form. Only organizations with granted consent appear (section 5).

### Contact
`info@aroxes.com` shown clearly, a contact form (name, email, topic, message), an optional phone, WhatsApp and address from settings, and expected response time. The form stores the message and emails it to the team (section 6). Success message and error states.

### Privacy Policy and Terms
Rich-text pages from the legal editor, with a table of contents, "Last updated" and version, and an effective date. Print-friendly. The drafts in section 8 seed them.

---

## 4. Website management in the SaaS owner dashboard (`/admin/website`)

Permissions: `website:view`, `website:edit`, `website:publish`, `legal:publish`, `contact:manage`, `community:view`. Every change is draft first, then published, and audit-logged.

| Tab | What the owner can do |
|---|---|
| **Pages** | Edit Home, About, Partners, Contact as ordered **blocks** (hero, stats strip, logo wall, feature grid, steps, audience tabs, event showcase, pricing teaser, testimonials, FAQ, CTA, rich text, team, timeline, contact info). Edit text and images in forms, reorder, show or hide each block, see a live preview, then Publish. Revert to any earlier version |
| **Plans display** | Public on or off, recommended flag, badge text, tagline, highlight features, CTA label and link, sort order. Prices and features stay in Plans and Tenant accounts, so there is one source of truth |
| **Partners and logos** | Add, edit, order, show or hide. Each needs consent status. Organizers can opt in themselves ("Show my organization on the Avoeline partners page" in their settings), and the owner approves. Logo upload with automatic resizing |
| **Stats** | Choose which stats show, their labels, minimum thresholds, and the refresh rate. The raw number is always shown next to the displayed value |
| **Legal** | Edit Privacy, Terms and Cookies with a markdown editor and preview. Publishing creates a new immutable **version** with an effective date and change summary, and optionally notifies organizers and vendors by platform email and an in-app banner. Full history, with diffs |
| **FAQ and testimonials** | Add, order, show or hide. A testimonial needs "consent confirmed" |
| **Contact inbox** | Messages with status (New, In progress, Done), notes, assignee, search, and a reply button that opens an email to the sender. Spam filter results visible |
| **Navigation and footer** | Menu items, footer links, social links, contact details, an announcement banner with start and end dates |
| **SEO** | Per page title, description and share image. Defaults for the whole site |
| **Media library** | Upload, tag and reuse images. Required alt text. Files validated and converted to web formats |
| **Community (opt-in only)** | People who ticked the optional updates box, grouped by scope (product updates, community), with consent date and source, search, export and a "withdrawn" filter. **Only consented records appear. Attendee registration data is never exported here.** |
| **Insights** | Aggregate, non-personal numbers only (events by month, category, city, registrations, certificates), no names or emails |

---

## 5. Data model (reuse existing tables; add what is missing)

```sql
site_settings (key pk, value jsonb, updated_by, updated_at)         -- contact details, social links, nav, footer, banner
site_pages (id, slug unique, title, status, seo jsonb, published_at, updated_by)
site_blocks (id, page_id, type, sort int, visible boolean, draft jsonb, published jsonb, updated_at)
site_revisions (id, entity_type, entity_id, snapshot jsonb, created_by, created_at)
site_media (id, path, alt, width, height, mime, size, uploaded_by, created_at)
site_partners (id, name, logo_media_id, url, category, description, organizer_id nullable,
               consent_status check (consent_status in ('pending','granted','revoked')), consent_at, consent_source,
               featured, visible, sort)
site_faqs (id, scope, question, answer_md, sort, visible)
site_testimonials (id, quote, name, role, organization, avatar_media_id, consent_confirmed, visible, sort)
site_stats_settings (key pk, label, visible, min_threshold int, format)
legal_documents (id, slug unique, title, current_version_id)
legal_document_versions (id, document_id, version int, body_md, change_summary, effective_date,
                         published_by, published_at)                -- immutable
user_consents (id, user_id nullable, email_hash, document_slug, version, accepted_at, context, ip_hash)
marketing_consents (id, email, user_id nullable, scope check (scope in ('product_updates','community','partner_offers')),
                    granted_at, withdrawn_at, source, unsubscribe_token_hash)
contact_messages (id, name, email, topic, message, status, assigned_to, notes, created_at, ip_hash, spam_score)
-- additions: subscription_plans (is_public, is_recommended, badge_text, tagline, cta_label, cta_href, sort_order, billing_note, highlight_features text[])
--            module_catalog (key, label, description, category, sort)  -- shared by the plans table, gating and the comparison table
--            events.is_demo, organizations.is_demo (excluded from every public number, list and logo)
```

**Public stats function** `get_public_stats()` (security definer, aggregates only, cached): events (published or completed, `is_demo = false`), registrations (people), active organizers, institutions (departments and clubs), certificates issued. Returns numbers only.

RLS: public read of published blocks, plans, partners with granted consent and legal versions; everything else restricted. Write access needs the permissions above.

---

## 6. Security, privacy, SEO, performance

1. **Content safety:** blocks are typed with zod schemas. Rich text is markdown sanitized on the server. No raw HTML or scripts from the editor.
2. **Uploads:** type and size checks, re-encode to WebP/AVIF, required alt text, random file names, public bucket for site media only.
3. **Contact form:** honeypot, rate limit, and Cloudflare Turnstile (free) or hCaptcha. Strip control characters from names and subjects (header injection). Store only a hashed IP. The email to `info@aroxes.com` is sent by the platform (from `notifications@aroxes.com`, Reply-To the sender). It never sends from the visitor's address. An auto-reply only for valid, rate-limited submissions.
4. **Public stats:** aggregates only, no personal data, cached with ISR, demo data excluded.
5. **Consent:** acceptance of Terms and Privacy recorded at signup and at registration (document and version, timestamp). The marketing and community checkboxes are separate and unticked by default. Withdrawal is one click, and every marketing email carries an unsubscribe link.
6. **Platform staff and attendee data:** staff see registration personal data only for support with a reason, and it is audit-logged. No bulk export of attendee data for platform use.
7. **Analytics:** prefer a cookieless, privacy-friendly tool (Plausible or Umami) so no consent banner is needed. If Google Analytics or similar is used, show a cookie consent banner and publish a cookie policy.
8. **SEO:** per-page metadata, Open Graph and Twitter images, `sitemap.xml`, `robots.txt`, canonical URLs, JSON-LD (Organization, SoftwareApplication, FAQPage).
9. **Caching:** statically generated pages with tag-based revalidation: publishing in the owner dashboard (or changing a plan) revalidates the right pages immediately. Stats refresh hourly or on demand.
10. **Security headers** and CSP for the marketing routes, plus `noindex` on app routes.
11. **Accessibility and performance** per section 2. No layout shift, `next/image` everywhere, limited JavaScript.
12. **Rules from `ENGINEERING_RULES.md`** apply: server-side authorization on every admin action, audit log, no secrets in client code.

---

## 7. Seed content (editable, replace with your own words; use real numbers only)

- **Hero headline:** "Run every event from one place." **Subheadline:** "Registrations, tickets, hackathons, clubs, sponsors and certificates, built for the people who actually organize."
- **CTAs:** "Get started free", "See plans".
- **Feature lines:** Events and ticketing: "Free or paid events, groups and teams, QR check-in." Hackathons: "Multiple competitions, phases, tasks, live scoreboards and judging." Clubs and departments: "One place for every society, its teams, tenures and budgets." Marketplace: "Find vendors, compare quotes and manage bookings." Certificates: "Branded certificates anyone can verify online." AI and analytics: "Plan faster and learn from feedback."
- **Steps:** Create your event · Open registration · Run the day · Follow up and certify.
- **FAQ starters:** What does it cost? · Do attendees need an account? · Can universities manage many clubs? · How do payments work? · Can I send emails from my own address? · Who owns the data?
- Do **not** invent statistics, customers, logos or testimonials. Show sections only when real content exists.

---

## 8. Starter legal drafts (for you and your lawyer, placeholders in [brackets])

**Privacy Policy outline**
1. **Who we are:** Aroxes ([legal entity, address]) operates Avoeline. Contact: info@aroxes.com.
2. **What we collect:** account details; the events, sponsors, partners and vendors organizers enter; registration details attendees submit (name, email, phone, answers to event forms, payment proofs, team details, check-in); technical data (logs, device, IP); messages you send us; and, if you connect Google, only the data needed for the features you enable.
3. **Why we use it:** to run events and registrations, issue tickets and certificates, process payments, provide support, keep the service secure, meet legal duties, and improve Avoeline using aggregated or de-identified information. We use your details for Avoeline updates or community networking only if you opt in, and you can withdraw at any time.
4. **Who sees it:** organizers see registrations for their own events and decide how they use them. Sponsors and partners see only what the organizer or you choose to share. We do not sell personal data.
5. **Roles:** for registration data, the event organizer is the controller and Avoeline processes it on their behalf. For accounts, billing and usage, Avoeline is the controller.
6. **Google user data:** we use Google data only to provide the features you enable, never for advertising, and we do not use it to train AI models. Our use follows Google's API Services User Data Policy, including its Limited Use requirements.
7. **Service providers:** hosting, database, email and payment tools (for example Vercel, Supabase, Resend, Google), under contract.
8. **Retention and deletion:** [periods]. Registration data is kept for the organizer's retention settings and legal needs.
9. **Security:** encryption in transit, restricted access, audit logs.
10. **Your rights:** access, correction, deletion, objection and withdrawal of consent, via info@aroxes.com. [Add regulator or complaint information for your jurisdiction.]
11. **Cookies, children, international transfers, changes, effective date.**

**Terms and Conditions outline**
Acceptance and eligibility; accounts and security; organizer responsibilities (lawful data use, getting permission for the messages they send, accurate event information, refunds and attendee communication); attendees and vendors; acceptable use (no spam, no unlawful content); fees, billing and bank-transfer payments; the vendor marketplace and commissions; content, IP and licenses; Google connections and email sending limits; availability and changes to the service; suspension and termination; disclaimers and limits of liability; governing law and disputes [jurisdiction]; changes to the terms; contact.

---

## 9. Cursor prompts

Run in order, one fresh chat each. Attach `@docs/ENGINEERING_RULES.md` and this file. Follow the shared UI rules from `@docs/11` Part 2 where they apply.

### W1: Foundation and CMS data

> **Shipped 2026-11-01** — see `plans/2026-11-01-marketing-website-foundation.md`. Route group `(marketing)`, CMS tables + `get_public_stats()`, block registry, `/admin/website` shell. W2 builds public pages on top.

````text
Build the foundation for the marketing website per docs/19 sections 1, 2, 5 and 6. Do not invent any content, statistics, customers or logos.
1. Create the (marketing) route group at the root of the app with a shared layout (header, footer, announcement banner, theme tokens from the existing brand theme, next/font for the heading font and Inter). App routes get noindex headers; marketing routes get security headers and a CSP.
2. Migrations (RLS, indexes, regenerated types) for every table in section 5, plus the plan columns, module_catalog (seeded from the existing module keys) and is_demo flags on events and organizations (mark the seeded demo events and organizations as demo). Create get_public_stats() returning aggregates only and excluding demo data.
3. Shared building blocks: a typed block registry with zod schemas for each block type in section 4, one renderer per block, an AdminBlockEditor shell, and a content service that returns published content with tag-based caching (revalidateTag on publish).
4. The /admin/website shell with the tab skeleton and the permissions website:view, website:edit, website:publish, legal:publish, contact:manage, community:view. Every action is authorized on the server and audit-logged.
5. Tests: RLS (public can read only published and consented rows), stats function excludes demo data and returns no personal data, schema validation rejects unknown block fields, revalidation tags.
Pause for review.
````

### W2: Public pages

> **Shipped 2026-11-01** — see `plans/2026-11-01-marketing-w2-public-pages.md`. CMS-driven home/plans/about/partners/contact/legal; live stats/plans/events; Turnstile contact; sitemap/robots/JSON-LD. Empty sections hide (no invented logos/stats/testimonials).

````text
Build the public pages from docs/19 sections 2, 3, 6 and 7, reading all content from the CMS tables and the database. Seed the default blocks from section 7.
1. Home with all sections and the dark hero, bento grid, live stats strip (hides each stat below its threshold), logo wall and testimonials (hidden when empty), upcoming public events cards (real public, non-demo events with banners, owner-featured first), pricing teaser and FAQ.
2. Plans: public plan cards with the recommended plan emphasized, sorting, the module comparison table with email limits per plan, enterprise contact button, billing note and FAQ. Changing a plan or its flags in the admin must update the page within seconds (on-demand revalidation).
3. About, Partners (sections hidden when empty, only granted-consent logos), Contact (form with honeypot, rate limit and Turnstile or hCaptcha, stores the message, notifies info@aroxes.com through the platform email sender with Reply-To the visitor, sanitizes header fields), Privacy and Terms (rich text renderer with table of contents, version and last updated), 404, sitemap.xml, robots.txt, per-page metadata and JSON-LD.
4. Performance and accessibility to the section 2 bars, mobile-first, reduced-motion support, next/image for all media.
5. Tests: stats thresholds, plan ordering and recommended flag, empty sections are hidden, contact form abuse cases (header injection, rate limit, honeypot), metadata present.
Pause for review.
````

### W3: Owner dashboard CMS

> **Shipped 2026-11-01** — see `plans/2026-11-01-marketing-w3-admin-cms.md`. Full `/admin/website` tab editors; organizer partner opt-in; legal versioning + capped notify; media WebP; contact inbox. Community/Insights remain W4.

````text
Build the /admin/website management area from docs/19 section 4. Reuse the shared UI components (Modal, ConfirmDialog, DataTable, FileUploadField, StatusBadge, EmptyState).
1. Pages: block list per page with reorder, show/hide, form-based editing with live preview, draft vs published, publish with revalidation, revision history with restore.
2. Plans display tab (flags and copy only; prices and features stay in Plans). Stats tab with the raw value beside the displayed value. Navigation, footer, banner and SEO tabs.
3. Partners and logos manager with consent status, an organizer-side opt-in switch in organizer settings ("Show my organization on the Avoeline partners page") that creates a pending partner entry for owner approval, and revocation that removes the logo immediately.
4. Legal editor: markdown with preview, publish creates an immutable version with effective date and change summary, optional notification of organizers and vendors (platform email and in-app banner), version history with diff.
5. FAQ and testimonials (consent confirmed required), media library (validation, WebP conversion, required alt text), contact inbox with statuses, notes, assignee and reply.
6. Sanitization: markdown sanitized on the server, no raw HTML or scripts, uploads validated.
7. Tests: permissions per tab, publish and revert, consent gating of logos and testimonials, legal versions are immutable, notification fan-out is capped and logged.
Pause for review.
````

### W4: Consent and privacy plumbing

> **Shipped 2026-11-01** — see `plans/2026-11-01-marketing-w4-consent-privacy.md`. Legal + community consents, unsubscribe, Community/Insights tabs, DSAR form, audited staff registration PII view.

````text
Build the consent and privacy plumbing from docs/19 sections 0, 5 and 6. This is about honest, recorded consent. Do not add any feature that exports or uses attendee registration data for the platform's own marketing or networking.
1. Record acceptance of the Terms and Privacy Policy (document, version, timestamp, hashed IP) at signup and on every public registration form, with links to the current versions.
2. Add the separate, unticked optional checkbox "Send me updates and connect me with the Avoeline community" on signup and public registration. Store it in marketing_consents with scope, source and timestamp. Withdrawal by one click and an unsubscribe link in every marketing email, using signed tokens.
3. The owner dashboard "Community" tab lists only records in marketing_consents with an active consent, with filters, export, and consent date and source. Sending to them goes through the platform email sender with unsubscribe and rate limits. Nothing else feeds this list.
4. Insights tab: aggregate counts only (events by month, category, city, registrations, certificates), with no names, emails or phone numbers and small-group suppression (hide any group with fewer than 5).
5. Platform staff access to registration personal data only through a support view that requires a reason and is audit-logged. No bulk export of attendee data for platform use.
6. Data requests: a simple "request access or deletion" form on the Privacy page that creates a ticket for the owner, with status tracking.
7. Tests: consent defaults to unticked, withdrawal works, the community list contains only consented records, aggregate suppression, support access requires a reason and is audited.
Pause for review.
````

### W5: Hardening — **shipped**

Shipped: draft sanitize for `rich_text.markdown` / FAQ `answer` + media alt gates; XSS/upload/contact/caps/published-content unit tests; optional `npm run test:sql:marketing` + CI when `SUPABASE_DB_URL` is set; FAQPage JSON-LD; metadata/sitemap/robots tests; `npm run report:marketing` + `reports/marketing/CHECKLIST.md`; skip-to-content; CSP/`randomuser.me` scrub; docs/11 + completeContext + plans archive. Out of scope still: cookieless analytics / cookie banner (§10); removing CSP `'unsafe-inline'`/`'unsafe-eval'`.

---

## 10. Decisions for you
1. **Analytics:** a cookieless tool (no consent banner) or Google Analytics (needs a banner and cookie policy)?
2. **Billing note on Plans:** manual bank transfer with invoices, as in your current billing setup?
3. **Languages and currency:** English only for now, or English and Urdu, and one display currency or a selector?
4. **Team section on About:** show real names and photos, or leave it out for now?
5. **Lawyer:** have the Privacy and Terms reviewed before publishing. The drafts are starting points, not legal advice.
