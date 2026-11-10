# Fixes: wizard, public page, registration, attendees, emails, connections

Seven prompts (N1 to N7). **Run N1 first**: the upload and registration errors block testing everything else. Run each in a fresh chat with `@docs/ENGINEERING_RULES.md` and this file. Builds on docs/16, 17, 18 and 22.

---

## Part A. Answers to your questions

**A1. What is an `.ics` file, and why "Add to calendar"?** An `.ics` file is the standard calendar file. Opening it adds the event to the attendee's own calendar (Apple, Outlook, Google, phone). "Add to Google Calendar" does the same through a link, with no permission needed. It's for the **attendee's own schedule**, not the organizer's. The fix: one **"Add to calendar"** menu (Google Calendar · Apple/Outlook file) instead of two buttons, shown on the public page and on the ticket page only once the registration is **confirmed**, never while pending or rejected.

**A2. The tabs on the Connections page (Accounts, Library, Calendar, Sheets, Sent email).** They are separate sub-pages, and they confuse more than they help:
- **Library** = the Drive files you linked or created (this belongs in each event's Files tab).
- **Calendar** = events the platform put in your Google Calendar.
- **Sheets** = Google Sheets the platform keeps updated with attendees.
- **Sent email** = your batches of sent and scheduled emails.
N7 removes this tab bar. Each integration gets one card with its own status and its own test button, and these lists move inside the cards.

**A3. Why "Send test" shows on every card.** It's a bug: one account row is repeated under every integration. "Send test email" only makes sense for Gmail. Calendar should offer "Create test event", Meet "Create test Meet link", Drive "Create test folder", Sheets "Create test sheet". N7 fixes this and explains how to test each.

**A4. What "Import attendees" is.** It adds people to the list from a CSV without them filling in the registration form (useful for a free event with a known list). **Paid events must register**, because payments are verified per registration, so Import shows only on **free events**.

**A5. Why the ticket and QR are two links.** They shouldn't be. One **ticket link** per registration. The QR is shown inline on the ticket page and embedded in the email, with no second link.

**A6. Why the Attendees list shows "Hammad Ali / avoeline@gmail.com".** That's the **organizer's own account**, not the attendee. The registrant in your screenshot is Sheharyar Shahzad. The list is reading the wrong account (probably a join on the organizer's id, or a fallback). It must show the **name, email and phone from the registration**.

**A7. Why uploads say "Event not found" and "Invalid input".** Probable causes, which Cursor must confirm:
- The page was in **Admin preview** (the event isn't published), and the public upload route can't find unpublished events.
- The upload route looks the event up differently from the page (id vs slug).
- The submit payload is missing an object the schema requires (for example the answers), so the validator says "expected object, received undefined". Raw validator messages must never reach attendees.

**A8. Where images are stored (a refinement of docs/22).** Images shown **publicly** (banner, gallery, sponsor logos, speaker photos) stay in **Supabase Storage**, compressed hard (banner about 300 KB, logo about 100 KB, gallery image about 250 KB, originals discarded) with a per-plan quota. Drive links are unreliable for public pages (permissions, hotlink limits, expired tokens). **Private files** (payment proofs, submissions, certificate copies, exports) go to the **organizer's Drive**, with the small fallback from docs/22. Videos aren't uploaded: use YouTube or Vimeo links.

**A9. Short registration code.** The long ID is replaced everywhere people see it by a short code such as `AVO-K7Q4M2` (unambiguous characters). It is for display and search only. The ticket page is protected by a separate long unguessable token, so guessing short codes grants nothing.

---

## Part B. Prompts

### N1. Blockers: registration, upload and sponsor-save errors

````text
Read @docs/ENGINEERING_RULES.md, docs/22 Part A5-A6 and docs/23 Part A7-A8. Fix these blockers first.
1. REPRODUCE AND FIX the public registration errors: "Event not found." under the Payment screenshot field after choosing a file, and the red box "Invalid input: expected object, received undefined" at the top of the form. Find the root causes (candidates: the page is an Admin preview of an unpublished event so the public upload route cannot find it; id vs slug mismatch; a missing object such as the answers in the submit payload). Fix them at the source, add regression tests, and report what each cause was.
2. Never show raw validator or server messages to attendees. Map errors to plain language and attach them to the right field ("We couldn't upload this file. Use an image or PDF under 5 MB.").
3. Admin preview: the registration form is visible but submission is disabled with "Preview only" (or uses an explicit preview mode), so it never produces confusing errors.
4. Replace free-form upload folder strings with a typed UploadKind allowlist: event_banner, event_gallery, sponsor_logo, collaborator_logo, partner_logo, speaker_photo, competition_image, payment_proof, submission_file, task_attachment, certificate_asset, certificate_archive, export_file. Each kind defines the store (Supabase public media bucket, Drive via FileStore, or the Drive fallback), allowed mime types, max size, image processing (resize, convert to WebP, strip EXIF), who may upload (organizer, public registrant, participant) and the path builder. This fixes "That upload folder is not allowed." for the Gallery and the Logo uploads.
5. Public display images (banner, gallery, logos, speaker and competition images) go to the Supabase public media bucket, compressed to the budgets in docs/23 A8 with a per-plan quota and originals discarded. Private files use FileStore (Drive first, fallback). Videos are links only (YouTube or Vimeo).
6. Fix "issue in saving sponsors": make the logo upload and the sponsor save work end to end (create, edit, delete), with clear errors.
7. Tests: unpublished event upload, valid and invalid payloads, each UploadKind (type, size, permission), sponsor create and edit with a logo, error messages shown to attendees contain no raw validator text.
Pause for review.
````

### N2. Event wizard

````text
Read @docs/ENGINEERING_RULES.md and docs/23 Part A8. Fix the event creation wizard.
1. Registration step: replace the unlabeled ticket tier row ("General | 0 | 0") with the SAME shared TiersAndPromosEditor component used on the Access tab. Every field is labeled (Name, Price, Seats, Available from, Available until, Active, Early bird), with helper text ("Leave seats empty for unlimited"). Add the Promo codes section with the same component (Code, Type percent or flat, Value, Scope, Usage limit, Expiry, Active). Free hides tiers. Unlimited seats at event level means tier seats are optional.
2. Summary card: "Registration: 1 paid tier (Rs 100) · Unlimited seats · Approval required · 1 extra question". Never show "0 seats" for unlimited.
3. Publish step: the two checkboxes become real links: "Terms of Service", "Event Organizer Agreement" and the content-rights statement open the current legal pages (from the CMS) in a new tab or viewer, the same pattern as the public registration form. Record acceptance with the document and version.
4. Remove the "Show on public page" Sponsors, Collaborators and Partners switches from the wizard (they live on the Sponsors tab). Keep "Publish immediately".
5. Review step shows the banner and the key details exactly as the public page will.
6. Tests: tiers and promos created in the wizard appear identically on the Access tab and the public page, labels present, summary text for unlimited seats, legal links resolve, acceptance recorded.
Pause for review.
````

### N3. Public event page redesign

````text
Read @docs/ENGINEERING_RULES.md, docs/17, docs/19 section 2 for the visual system, and docs/12 section D. Redesign the public event page /e/[eventId] and fix the registration card. Keep the data contract (public DTO only).
1. HERO: show the banner image CLEAN. No semi-transparent glass boxes and no chips or text laid over the banner image (the banner often contains its own text). Use a 16:9 (mobile) / wide (desktop) image with object-fit cover and a safe focal point. Put the title, tags, organizer chip and actions on a solid section directly below, with an optional overlap card.
2. ACTIONS: one "Share" button (menu: copy link, WhatsApp, LinkedIn, X, email), replacing the transparent link box. One "Add to calendar" menu (Google Calendar, Apple/Outlook file), shown only when allowed (docs/23 A1). Remove the two separate calendar buttons.
3. MEDIA: gallery grid with a lightbox, the promo video as a lazy YouTube or Vimeo embed, and the banner as the first media item.
4. DETAILS: icon grid (date and time with timezone, venue with "Open in Maps", format, seats left only when capacity is limited, registration window, admission), no truncated or broken text.
5. SECTIONS: About, Agenda by day, Speakers, Tickets & discounts (cards with price, seats left if limited, availability, automatic discounts; never promo codes), Competitions for hackathons, Sponsors and partners if enabled, organizer card, Report this event.
6. REGISTRATION CARD (sticky on desktop, first on mobile): tier or competition selection, the form rendered from the form definition, and for paid events a PAYMENT INSTRUCTIONS block shown before the screenshot field. First check whether event-level payment instructions exist (bank or wallet details, amount, reference). If not, add an organizer-editable "Payment instructions" field in the event settings and show it here. Clear button states from the state matrix in docs/12 D, and a plain "What happens next" line.
7. Polish: consistent spacing and type, skeleton loading, mobile-first, keyboard accessible, alt text, Lighthouse 95+ target, next/image with proper sizes.
8. Tests: no overlay on the banner, share and calendar menus, media rendering with no gallery and no video, seats hidden when unlimited, payment instructions shown only for paid events, preview mode disables submit.
Pause for review.
````

### N4. Ticket page, short codes, QR, calendar

````text
Read @docs/ENGINEERING_RULES.md and docs/23 Part A1, A5, A9.
1. SHORT CODE: generate a unique short code per registration (for example AVO-K7Q4M2, unambiguous Crockford base32, retry on collision), store it, and show it everywhere instead of the UUID (ticket page, attendee list and drawer, emails, exports). It is searchable in the organizer's tools. It is NOT an access credential: the ticket page uses a separate long unguessable token. Backfill existing registrations.
2. TICKET PAGE: redesign with a status hero (Awaiting approval, Confirmed, Rejected, Cancelled), a short details card, "What happens next", the short code with copy, and for confirmed registrations the QR with a download button. Team registrations show the team, competition and each member's QR for the lead. Show "Add to calendar" (one menu) only when confirmed, with a tooltip "Adds this event to your calendar". Keep the "save this link" note.
3. QR: one QR per participant, rendered on demand (no stored images) encoding a signed opaque check-in token. Remove the separate "QR link". There is exactly one ticket URL per registration.
4. Check-in lookup accepts the QR token or the short code (organizer and permitted staff only, rate-limited).
5. Tests: short code uniqueness and backfill, UUID no longer displayed, ticket page states, calendar menu visibility, QR token verification, no duplicate links.
Pause for review.
````

### N5. Attendees tab

````text
Read @docs/ENGINEERING_RULES.md, docs/22 O1-O2 and docs/23 Part A4, A6.
1. FIX THE IDENTITY BUG: the list shows the organizer's own account (name and email of the logged-in organizer) instead of the registrant. Find the join or fallback causing it and show name, email and phone from the registration's form answers or snapshot. Team registrations show the team name and the lead.
2. LIST CARDS: avatar initials, name, email, phone, short code, tier or competition, status badge, payment status (paid events), proof indicator, check-in status. Approve and Reject with proper contrast and states: Approve is disabled only with a tooltip stating why (for example no payment proof yet). Bulk select with bulk approve and reject. Search by name, email, phone and short code.
3. DRAWER: payment screenshot preview streamed through the permission-checked file proxy (fix the current error), "Open in Drive" for the owner, verify or reject the payment with a reason, ticket link copy, QR rendered on demand, all answers, status history, check-in details (time, method, who). Remove the empty Location block.
4. STORAGE: payment proofs go to the organizer's Drive through FileStore with the fallback (docs/22 A6), and the whole flow works when Drive isn't connected (fallback plus a banner).
5. TOOLBAR: Registration form, Email, Export, Import. Import attendees (CSV: name, email, phone; dedupe; validation preview; marks registrations as imported and confirmed; sends no email unless chosen) appears on FREE events only. On paid events hide it with the tooltip "Paid events need registration so payments can be verified".
6. EXPORTS (xlsx and Google Sheets): include short code, ticket URL, payment status, a payment proof link (the platform file link that requires organizer login, plus the Drive link when it exists), check-in details and every form field. Teams and members sheets as before. Sanitize cells against formula injection.
7. Tests: identity shown is the registrant's, approve disabled reasons, drawer proof preview, import only on free events, export columns including the ticket and proof URLs, search by short code.
Pause for review.
````

### N6. Emails

````text
Read @docs/ENGINEERING_RULES.md, docs/16, docs/18 and docs/22 O2.
1. COMPOSER: make custom email to one person, bulk email to filtered results and the registration emails work end to end from the organizer's connected sender. Every checkbox (team name, team members, competition, event details, ticket link) changes the preview and the sent email. Show a recipient count and the first five, "Sending as <address>", and the capacity strip from docs/18. Test each option.
2. ATTENDEE-FACING DESIGN (React Email, one shared layout): 600 px wide, mobile-friendly, inline CSS, safe in Gmail, Outlook and Apple Mail. Structure: small organizer name and event banner thumbnail header, a clear title and status chip, a details card (date and time with timezone, venue with map link, ticket type, short code), ONE primary button "View ticket", the "Add to calendar" links, then the footer with the organizer's reply-to and "Sent via Avoeline" in small type. Include a preview text line and a plain-text version, keep each message under 100 KB so Gmail doesn't clip it, add alt text, support dark mode, and escape every value.
3. TEMPLATES: registration received (the details the attendee entered), registration confirmed, rejected, custom message wrapper, access invite, certificate, judge invite. For team events the confirmed email goes to the lead with the competition, team name, every member's details and a QR for each member embedded inline (MIME multipart/related with Content-ID), falling back to the short code if images are blocked. Beyond 10 members link to the ticket page. Free events show no payment lines.
4. ONE LINK: the email has exactly one ticket link. No separate QR link.
5. Verify rendering with a local preview and Mailpit or equivalent, and add snapshot tests for each template.
Pause for review.
````

### N7. Connections page redesign

````text
Read @docs/ENGINEERING_RULES.md, docs/17 and docs/18, and docs/23 Part A2-A3. Redesign the organizer Connections page.
1. STRUCTURE: remove the tab bar (Accounts, Library, Calendar, Sheets, Sent email) and the "Back to profile · Custom Forms" links. One page: a Google account card (avatar, email, status badge, permission chips: Email, Calendar and Meet, Drive, with Reconnect, Add another account, Disconnect that revokes at Google), then one card per integration.
2. INTEGRATION CARDS, each with benefits, what you allow, status and its own actions: Email (quota bars for today and this month, default sender, "Send test email to me", link to Sent emails, the bounce note); Calendar and Meet (toggles, "Create a test event" and "Create a test Meet link" that show the link and clean up after themselves, recent synced events); Drive and Files (open the Avoeline folder, "Create a test folder", link to all files); Sheets (create a test sheet, linked sheets). A card that isn't enabled shows an "Enable" button that asks for only that permission (incremental consent). Never repeat the account row or "Send test" on other cards.
3. FIX "Google OAuth is not configured on this deployment yet": find why this appears while an account row exists (a seeded account, a missing environment variable, or a wrong variable name) and why "Connect another" is disabled. Show organizers a friendly message and platform owners an admin-only diagnostics panel (variable names present or missing, the expected redirect URI, never any values), and make the connect flow work when configured.
4. Replace "Something went wrong. Please try again." with specific, safe messages (not connected, permission not granted, quota reached, Google blocked this app for your organization).
5. Move Library, Calendar, Sheets and Sent email content into the relevant cards or event tabs, and keep their URLs redirecting here.
6. Tests: each test action calls the right API, no duplicate account rows or buttons, incremental consent asks for the right scope only, diagnostics never reveal values, disconnect revokes and removes tokens.
Pause for review.
````

---

## Decisions for you
1. **Public images in Supabase, private files in Drive** (A8). Say so if you'd rather push everything to Drive, with the risk that public images break when a token expires.
2. **Payment instructions:** I assumed the public page lacks them. Cursor will check, and add an organizer-editable field if missing.
3. **Short code format:** `AVO-` plus 6 characters. Change the prefix if you want.
