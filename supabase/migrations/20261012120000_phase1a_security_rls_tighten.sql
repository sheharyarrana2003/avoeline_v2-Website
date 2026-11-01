-- Phase 1A: close open RLS policies, scope hackathon_tasks, revoke DEFINER RPC from Data API.
-- Applied to remote via MCP; kept here for repo history.

DROP POLICY IF EXISTS certificates_public_verify ON public.certificates;

DROP POLICY IF EXISTS "Allow insert on notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_self ON public.notifications;
CREATE POLICY notifications_insert_self ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = ((SELECT auth.uid())::text));

DROP POLICY IF EXISTS hackathon_tasks_read ON public.hackathon_tasks;
CREATE POLICY hackathon_tasks_read ON public.hackathon_tasks
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.hackathon_tracks t
      JOIN public.events e ON e.id = t.event_id
      WHERE t.id = hackathon_tasks.track_id
        AND e.organizer_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.hackathon_tracks t
      WHERE t.id = hackathon_tasks.track_id
        AND public.user_is_event_staff(t.event_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.hackathon_tracks t
      JOIN public.registrations r ON r.event_id = t.event_id
      WHERE t.id = hackathon_tasks.track_id
        AND r.user_id = (SELECT auth.uid())
        AND coalesce(r.status, '') <> 'cancelled'
    )
  );

-- Anon cannot call helpers via Data API; authenticated keeps EXECUTE for RLS.
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_org_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_org_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_is_event_staff(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_is_event_staff(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, postgres, service_role;
GRANT EXECUTE ON FUNCTION public.user_org_ids() TO authenticated, postgres, service_role;
GRANT EXECUTE ON FUNCTION public.user_is_event_staff(uuid) TO authenticated, postgres, service_role;

UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id IN ('media','sponsor-logos','certificates','payment-screenshots','hackathon-challenge-files');
