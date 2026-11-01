-- Schema optimization Step 7 — scream test: rename unused tables (no DROP yet).
-- Reversible: rename back if anything breaks.

do $$
begin
  if to_regclass('public.solo_participants') is not null
     and to_regclass('public.zz_unused_solo_participants') is null then
    alter table public.solo_participants rename to zz_unused_solo_participants;
  end if;

  if to_regclass('public.hackathon_mentor_slots') is not null
     and to_regclass('public.zz_unused_hackathon_mentor_slots') is null then
    alter table public.hackathon_mentor_slots rename to zz_unused_hackathon_mentor_slots;
  end if;

  if to_regclass('public.hackathon_team_phases') is not null
     and to_regclass('public.zz_unused_hackathon_team_phases') is null then
    alter table public.hackathon_team_phases rename to zz_unused_hackathon_team_phases;
  end if;

  if to_regclass('public.badge_meetup_attendees') is not null
     and to_regclass('public.zz_unused_badge_meetup_attendees') is null then
    alter table public.badge_meetup_attendees rename to zz_unused_badge_meetup_attendees;
  end if;
end $$;
