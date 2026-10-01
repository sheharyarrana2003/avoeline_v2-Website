# Event creation wizard

Organizers, department admins, and club presidents create events through one `EventWizardLayout`. Basic step includes **Is this a hackathon?** (`?hackathon=1` pre-sets it; needs `hackathon_ops`). Persistence is `EventService.create_event` → `events`, plus `hackathon_tracks` when the hackathon toggle is on.

## Steps

1. **Basic information** — **Is this a hackathon?** toggle (locked without `hackathon_ops`). Super category and event format (skipped when hackathon), title, rich-text description, tags, banner/gallery/promo URL.
2. **Schedule & location** — start/end date, native time inputs, timezone, physical / virtual / hybrid. Physical and hybrid collect a venue plus a **map share URL**. Virtual/hybrid also collect a meeting link.
3. **Competitions** (hackathon only) — single competition or multiple tracks. Each track has **kind** (`ctf` | `business` | `web_dev` | `design` | `data` | `other`), name, description, image, fee, discount %, discount note, discount expiry, policies, instructions, min/max team size, **rules text** and/or a rules file.
4. **Registration** — optional. Checking “This event does not take registrations” sets `events.requires_registration = false`. **Single / Group** (hidden on hackathons; teams come from competitions). Group: min/max size. Each custom question can **ask once per group** or **per member**.
5. **Review & publish** — summary plus access type. Draft save is allowed without a start date; publish is not.

## Custom form builder

When registration is on, `FormBuilder` writes `EventFormData.customFields` → `events.custom_form`. Field types: short text, long text, email, number, date, dropdown, **multiple choice (radio)**, checkboxes, file, **image**. On a **group** event, `askOnce` is `group` or `member`. Public `RegistrationForm` for groups writes `registration_groups` + N `registrations` with `group_id` (no `/enter`). On a hackathon, the **team lead** plus extra members still create `hackathon_teams`; **one team access code** after pay+confirm; `/events/{eventId}/enter` then `/compete`. Extra members do not occupy extra seats. Each member has their own check-in QR.

## Columns added for this flow

- `events.map_url` (text)
- `events.requires_registration` (boolean, default true)
- `registrations.group_id` (nullable; regular group events)
- `registration_groups` (thin group bookings)
- `promo_codes.track_id` (nullable; hackathon promo scope)
- `event_agenda_speakers` (agenda ↔ speakers)
- `hackathon_teams.access_code_hash` (unique when set; plaintext in extra after reveal)
- `hackathon_task_completions.extra` (link/file hand-in)

Coordinates remain on `events` for later use and are not shown in the wizard.

## Event dashboard after publish

One layout: `/organizer/{id}/events/{eventId}`. Tabs: Overview, Attendees, Staff, Access, Agenda, Speakers, Vendors, Sponsors, then (if hackathon) Competitions, Phases & Tasks, Teams, Submissions, Scoreboard, Settings, then Certificates and Exports. Rail **Hackathon** opens `.../events?kind=hackathon`. Old `/hackathon/...` URLs redirect. There is **no Tickets tab**; paid SKUs and promos sit on **Access** (including paid hackathons). Group events default Attendees to **Grouped**. **Phases & Tasks** filter by competition and search names. **Scoreboard** isolates completions by `hackathon_tasks.track_id`. **Exports** includes `hackathon_teams` (xlsx: two sheets). Staff named positions and recruitment need `teams_advanced_roles`. Docker sandboxing is a stored toggle only.
