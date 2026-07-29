// AI analysis error codes that may stem from misconfiguration.
// Sourced from lib/ai/config.ts ("ai_not_configured") and the
// app/api/**/route.ts catch blocks ("ai_failed", "generation_failed",
// "insights_failed", "parse_failed", "transcribe_failed", "estimate_failed").
export const AI_ERROR_CODES = new Set([
  "ai_not_configured",
  "ai_failed",
  "generation_failed",
  "insights_failed",
  "parse_failed",
  "transcribe_failed",
  "estimate_failed",
]);

// Returns true when the given error message is an AI analysis error code
// that may be resolved by reviewing the AI configuration in Profile.
export function isAiError(msg: string | null | undefined): boolean {
  return !!msg && AI_ERROR_CODES.has(msg);
}
