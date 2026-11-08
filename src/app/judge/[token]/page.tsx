import { notFound } from "next/navigation";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { findJudgeByToken } from "@/src/features/hackathon/hackathon.service";
import { EventService } from "@/src/services/event.service";
import { JudgeInviteRespondForm } from "@/src/features/hackathon/components/JudgeInviteRespondForm";
import {
  JudgeScoringPanel,
  type JudgeScoreRow,
} from "@/src/features/hackathon/components/JudgeScoringPanel";
import { markJudgeInviteOpened } from "@/src/features/hackathon/actions/judging.action";
import { statusAfterOpen } from "@/src/features/hackathon/judgeInvite.logic";
import {
  getTaskMaxPoints,
  listSubmissionsForJudgeTracks,
} from "@/src/features/hackathon/judgeScoring.service";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

export const metadata = { title: "Judge invite — Avoeline" };

export default async function JudgeInvitePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const judge = await findJudgeByToken(token);
  if (!judge || !judge.inviteToken) notFound();

  await markJudgeInviteOpened(token);
  const inviteStatus = statusAfterOpen(judge.inviteStatus);
  const refreshed = { ...judge, inviteStatus };

  const event = await EventService.getEventByID(refreshed.eventId);
  if (!event) notFound();

  const responded = refreshed.inviteStatus === "accepted" || refreshed.inviteStatus === "declined";
  const accepted = refreshed.inviteStatus === "accepted";

  let scoreRows: JudgeScoreRow[] = [];
  if (accepted) {
    const subs = await listSubmissionsForJudgeTracks(refreshed.trackIds);
    const taskIds = [...new Set(subs.map((s) => String(s.task_id)))];
    const teamIds = [...new Set(subs.map((s) => String(s.team_id)))];
    const [{ data: tasks }, { data: teams }, { data: myScores }] = await Promise.all([
      taskIds.length
        ? supabaseAdmin.from(TABLES.HACKATHON_TASKS).select("id, title, points").in("id", taskIds)
        : Promise.resolve({ data: [] as { id: string; title: string; points: number | null }[] }),
      teamIds.length
        ? supabaseAdmin.from(TABLES.HACKATHON_TEAMS).select("id, name").in("id", teamIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      supabaseAdmin
        .from(TABLES.HACKATHON_JUDGE_SUBMISSION_SCORES)
        .select("submission_id, points, comment")
        .eq("judge_id", refreshed.id),
    ]);
    const titleById = new Map((tasks ?? []).map((t) => [String(t.id), String(t.title || "Task")]));
    const maxById = new Map((tasks ?? []).map((t) => [String(t.id), Number(t.points ?? 0)]));
    const nameById = new Map((teams ?? []).map((t) => [String(t.id), String(t.name || "Team")]));
    const mine = new Map(
      (myScores ?? []).map((s) => [
        String(s.submission_id),
        { points: Number(s.points ?? 0), comment: String(s.comment || "") },
      ]),
    );
    scoreRows = await Promise.all(
      subs.map(async (s) => {
        const taskId = String(s.task_id);
        const max = maxById.get(taskId) ?? (await getTaskMaxPoints(taskId));
        const mineRow = mine.get(String(s.id));
        const summary = [s.text_answer, s.link_url, s.file_name].filter(Boolean).join(" · ");
        return {
          id: String(s.id),
          taskId,
          taskTitle: titleById.get(taskId) || "Task",
          taskMax: max,
          teamName: nameById.get(String(s.team_id)) || "Team",
          submittedAt: String(s.submitted_at || ""),
          summary: String(summary || ""),
          myPoints: mineRow?.points ?? null,
          myComment: mineRow?.comment ?? "",
        };
      }),
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Card title="Judge invitation">
        <CardBody className="space-y-4">
          <p className="text-sm text-ink">
            Hi <span className="font-medium">{refreshed.name}</span>, you&apos;ve been invited to
            judge <span className="font-medium">{event.title}</span> on Avoeline.
          </p>
          {responded ? (
            <p className="text-sm text-ink">
              You marked this invite as{" "}
              <span className="font-medium">
                {refreshed.inviteStatus === "accepted" ? "accepted" : "declined"}
              </span>
              .
            </p>
          ) : (
            <JudgeInviteRespondForm token={token} />
          )}
        </CardBody>
      </Card>

      {accepted ? (
        <div className="mt-8">
          <Card title="Score submissions">
            <CardBody>
              <p className="mb-4 text-xs text-ink-soft">
                Award points from 0 up to each task&apos;s maximum. Scores update the event
                scoreboard.
              </p>
              <JudgeScoringPanel token={token} rows={scoreRows} />
            </CardBody>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
