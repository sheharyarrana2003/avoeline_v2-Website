import "server-only";

import { randomUUID } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { clampJudgePoints, meanJudgePoints } from "./judgeInvite.logic";

const SCORE_TABLE = TABLES.HACKATHON_JUDGE_SUBMISSION_SCORES;

export async function listSubmissionsForJudgeTracks(trackIds: string[]) {
  const ids = [...new Set(trackIds.filter(Boolean))];
  if (!ids.length) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASK_SUBMISSIONS)
    .select(
      "id, track_id, task_id, team_id, phase_id, text_answer, link_url, file_name, submitted_at, points_awarded, review_note, status",
    )
    .in("track_id", ids)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTaskMaxPoints(taskId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASKS)
    .select("points")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.points ?? 0) || 0;
}

export async function listJudgeScoresForSubmission(submissionId: string): Promise<number[]> {
  const { data, error } = await supabaseAdmin
    .from(SCORE_TABLE)
    .select("points")
    .eq("submission_id", submissionId);
  if (error) throw error;
  return (data ?? []).map((r) => Number(r.points ?? 0));
}

export async function upsertJudgeSubmissionScore(input: {
  judgeId: string;
  submissionId: string;
  teamId: string;
  taskId: string;
  points: number;
  comment: string;
  taskMax: number;
}): Promise<{ awarded: number }> {
  const awarded = clampJudgePoints(input.points, input.taskMax);
  const now = new Date().toISOString();
  const { data: existing } = await supabaseAdmin
    .from(SCORE_TABLE)
    .select("id")
    .eq("judge_id", input.judgeId)
    .eq("submission_id", input.submissionId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from(SCORE_TABLE)
      .update({
        points: awarded,
        comment: input.comment,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin.from(SCORE_TABLE).insert({
      id: randomUUID(),
      judge_id: input.judgeId,
      submission_id: input.submissionId,
      points: awarded,
      comment: input.comment,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
  }

  const all = await listJudgeScoresForSubmission(input.submissionId);
  const mean = meanJudgePoints(all);

  await supabaseAdmin
    .from(TABLES.HACKATHON_TASK_SUBMISSIONS)
    .update({
      points_awarded: mean,
      review_note: input.comment || null,
      status: "reviewed",
      updated_at: now,
    })
    .eq("id", input.submissionId);

  const { data: completion } = await supabaseAdmin
    .from(TABLES.HACKATHON_TASK_COMPLETIONS)
    .select("id")
    .eq("hackathon_team_id", input.teamId)
    .eq("task_id", input.taskId)
    .maybeSingle();

  if (completion?.id) {
    const { error } = await supabaseAdmin
      .from(TABLES.HACKATHON_TASK_COMPLETIONS)
      .update({
        points_awarded: mean,
        is_correct: mean > 0,
        attempted_at: now,
      })
      .eq("id", completion.id);
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_TASK_COMPLETIONS).insert({
      id: randomUUID(),
      hackathon_team_id: input.teamId,
      task_id: input.taskId,
      points_awarded: mean,
      is_correct: mean > 0,
      attempted_at: now,
      extra: {},
    });
    if (error) throw error;
  }

  await supabaseAdmin
    .from(TABLES.HACKATHON_JUDGES)
    .update({ last_scored_at: now, updated_at: now })
    .eq("id", input.judgeId);

  return { awarded };
}
