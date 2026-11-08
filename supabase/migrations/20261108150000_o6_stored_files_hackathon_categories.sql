-- O6: allow hackathon phase/task/submission categories on stored_files
alter table public.stored_files
  drop constraint if exists stored_files_category_check;

alter table public.stored_files
  add constraint stored_files_category_check
  check (
    category = any (
      array[
        'payment_proof'::text,
        'submission'::text,
        'media'::text,
        'certificate'::text,
        'export'::text,
        'other'::text,
        'hackathon_phase'::text,
        'hackathon_task'::text,
        'hackathon_submission'::text
      ]
    )
  );
