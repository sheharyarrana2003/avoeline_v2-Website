import "server-only";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { rateLimit } from "@/src/lib/rateLimit";
import { logger } from "@/src/lib/logger";
import {
  buildFallbackAnalysis,
  buildGeminiPrompt,
  GEMINI_RESPONSE_SCHEMA,
  hashFeedbackInputs,
  validateGeminiPayload,
  type FeedbackCommentInput,
  type FallbackAnalysis,
  type GeminiAnalysisCore,
} from "./geminiFeedback.logic";

export type { FeedbackCommentInput, GeminiAnalysisCore } from "./geminiFeedback.logic";

export {
  stripPii,
  hashFeedbackInputs,
  buildFallbackAnalysis,
  validateGeminiPayload,
  geminiAnalysisSchema,
} from "./geminiFeedback.logic";

export type GeminiAnalysisResult = FallbackAnalysis & {
  cached: boolean;
  generatedAt: string;
  commentsNeeded?: number;
};

function geminiEnv(): { key: string | null; model: string } {
  const key = (process.env.GEMINI_API_KEY || "").trim() || null;
  const model = (process.env.GEMINI_MODEL || "").trim() || "gemini-2.0-flash";
  return { key, model };
}

async function callGeminiJson(prompt: string, model: string, key: string): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = json.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  return JSON.parse(raw);
}

async function countRefreshesToday(organizerId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { count, error } = await supabaseAdmin
    .from(TABLES.FEEDBACK_ANALYSES)
    .select("id", { count: "exact", head: true })
    .eq("organizer_id", organizerId)
    .eq("source", "gemini")
    .gte("created_at", start.toISOString());
  if (error) throw error;
  return count ?? 0;
}

async function readCache(
  organizerId: string,
  scopeKey: string,
  inputHash: string,
): Promise<GeminiAnalysisResult | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.FEEDBACK_ANALYSES)
    .select("*")
    .eq("organizer_id", organizerId)
    .eq("scope_key", scopeKey)
    .eq("input_hash", inputHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const result = data.result as Record<string, unknown>;
  return {
    ...(result as GeminiAnalysisResult),
    source: (data.source as "gemini" | "fallback") || "fallback",
    model: data.model,
    responseCount: data.response_count ?? 0,
    cached: true,
    generatedAt: data.created_at || new Date().toISOString(),
  };
}

async function writeCache(opts: {
  organizerId: string;
  eventId: string | null;
  scopeKey: string;
  inputHash: string;
  result: GeminiAnalysisResult;
}): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLES.FEEDBACK_ANALYSES).insert({
    organizer_id: opts.organizerId,
    event_id: opts.eventId,
    scope_key: opts.scopeKey,
    input_hash: opts.inputHash,
    result: opts.result as unknown as Record<string, unknown>,
    model: opts.result.model,
    source: opts.result.source,
    response_count: opts.result.responseCount,
  });
  if (error) throw error;
}

/**
 * Analyze feedback with Gemini when configured; otherwise local fallback.
 * Caches by input hash. Refresh forces a new Gemini call (≤5/day/organizer).
 */
export async function analyzeFeedbackWithGemini(opts: {
  organizerId: string;
  comments: FeedbackCommentInput[];
  eventId?: string | null;
  forceRefresh?: boolean;
}): Promise<GeminiAnalysisResult> {
  const { organizerId, comments, forceRefresh = false } = opts;
  const eventId = opts.eventId ?? null;
  const scopeKey = eventId || "all";
  const commented = comments.filter((c) => String(c.comment || "").trim().length > 0);

  if (commented.length < 3) {
    const base = buildFallbackAnalysis(comments);
    return {
      ...base,
      cached: false,
      generatedAt: new Date().toISOString(),
      commentsNeeded: Math.max(0, 3 - commented.length),
      summary:
        commented.length === 0
          ? "No comments yet."
          : `${commented.length} comment${commented.length === 1 ? "" : "s"} so far — ${3 - commented.length} more needed for AI analysis.`,
    };
  }

  const inputHash = hashFeedbackInputs(comments);

  if (!forceRefresh) {
    const cached = await readCache(organizerId, scopeKey, inputHash);
    if (cached) return cached;
  }

  const rl = rateLimit(`feedback-analysis:${organizerId}`, 5, 24 * 60 * 60);
  if (!rl.ok && forceRefresh) {
    const fallback = buildFallbackAnalysis(comments);
    return {
      ...fallback,
      cached: false,
      generatedAt: new Date().toISOString(),
      summary: `${fallback.summary} (Refresh limit reached for today.)`,
    };
  }

  if (forceRefresh) {
    const used = await countRefreshesToday(organizerId);
    if (used >= 5) {
      const fallback = buildFallbackAnalysis(comments);
      return {
        ...fallback,
        cached: false,
        generatedAt: new Date().toISOString(),
        summary: `${fallback.summary} (Daily AI refresh limit reached.)`,
      };
    }
  }

  const { key, model } = geminiEnv();
  const stats = buildFallbackAnalysis(comments);

  if (!key) {
    const result: GeminiAnalysisResult = {
      ...stats,
      cached: false,
      generatedAt: new Date().toISOString(),
    };
    await writeCache({ organizerId, eventId, scopeKey, inputHash, result }).catch((err) => {
      logger.error("[geminiFeedback] cache write failed", { err: String(err) });
    });
    return result;
  }

  let parsed: GeminiAnalysisCore | null = null;
  const prompt = buildGeminiPrompt(comments);
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    try {
      const raw = await callGeminiJson(prompt, model, key);
      parsed = validateGeminiPayload(raw);
    } catch (err) {
      logger.error("[geminiFeedback] attempt failed", {
        attempt,
        err: err instanceof Error ? err.message : "unknown",
      });
      parsed = null;
    }
  }

  const result: GeminiAnalysisResult = parsed
    ? {
        ...parsed,
        source: "gemini",
        model,
        responseCount: comments.length,
        ratingDistribution: stats.ratingDistribution,
        averageRating: stats.averageRating,
        topWords: stats.topWords,
        cached: false,
        generatedAt: new Date().toISOString(),
      }
    : {
        ...stats,
        cached: false,
        generatedAt: new Date().toISOString(),
      };

  await writeCache({ organizerId, eventId, scopeKey, inputHash, result }).catch((err) => {
    logger.error("[geminiFeedback] cache write failed", { err: String(err) });
  });

  return result;
}
