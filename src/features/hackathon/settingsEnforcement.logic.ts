/**
 * Pure enforcement helpers used by unit tests + call sites.
 * Mirrors server gates so the settings matrix can name test ids.
 */

export function rejectWhenConfigOff(
  enabled: boolean,
  messageWhenOff: string,
): { ok: true } | { ok: false; message: string } {
  if (!enabled) return { ok: false, message: messageWhenOff };
  return { ok: true };
}

export function allowResubmission(enabledOrDefaultOn: boolean, priorCount: number): boolean {
  if (enabledOrDefaultOn) return true;
  return priorCount <= 0;
}

export function phaseWindowAllowsWork(phaseOpen: boolean, taskHasPhase: boolean): boolean {
  if (!taskHasPhase) return true;
  return phaseOpen;
}

export function linkSubmissionRequired(linkRequired: boolean, hasLink: boolean): boolean {
  return !linkRequired || hasLink;
}

export function liveScoreboardVisible(enabled: boolean): boolean {
  return enabled;
}

export function ctfFlagAccepted(ctfEnabled: boolean, taskHasFlag: boolean): boolean {
  return ctfEnabled && taskHasFlag;
}

export function hintRevealAllowed(hintsEnabled: boolean, hasHint: boolean): boolean {
  return hintsEnabled && hasHint;
}

export function timerStartRequired(timerEnabled: boolean, hasStart: boolean): boolean {
  if (!timerEnabled) return true;
  return hasStart;
}

export function hackathonTimerOpen(
  timerEnabled: boolean,
  nowIso: string,
  endsAt: string | null,
): boolean {
  if (!timerEnabled || !endsAt) return true;
  return nowIso <= endsAt;
}

export function randomTasksVisible(
  randomEnabled: boolean,
  isRandom: boolean,
  dealt: boolean,
): boolean {
  if (!randomEnabled || !isRandom) return true;
  return dealt;
}

export function phasedTaskVisible(
  phasesGate: boolean,
  hasPhase: boolean,
  phaseOpen: boolean,
): boolean {
  if (!phasesGate || !hasPhase) return true;
  return phaseOpen;
}

export function categoryFilterActive(categoriesEnabled: boolean): boolean {
  return categoriesEnabled;
}

export function attendanceHeartbeatOn(enabled: boolean): boolean {
  return enabled;
}

export function activityIntervalMinutes(enabled: boolean, minutes: number, fallback = 5): number {
  if (!enabled) return fallback;
  return minutes > 0 ? minutes : fallback;
}

export function antiCheatLoggingOn(enabled: boolean): boolean {
  return enabled;
}
