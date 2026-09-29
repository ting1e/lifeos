/**
 * Business-level AI tasks. Each task is independently configurable
 * (provider + model + reasoning effort + token cap) via ai_task_configs;
 * see lib/ai/resolver.ts for resolution and lib/ai/client.ts for dispatch.
 */
export type AiTask =
  | "meal_parse" // free-text meal description -> structured meal log
  | "food_vision" // food photo -> kcal / macro estimate
  | "audio_meal_parse" // dictated meal -> transcript
  | "weekly_insights" // weekly analysis -> insights JSON
  | "meal_plan" // weekly meal plan generation
  | "workout_plan" // training program generation
  | "nutrition_lookup"; // web-search-augmented nutrition Q&A (reserved)

export const AI_TASKS = [
  "meal_parse",
  "food_vision",
  "audio_meal_parse",
  "weekly_insights",
  "meal_plan",
  "workout_plan",
  "nutrition_lookup",
] as const satisfies readonly AiTask[];

export type AiTaskDefault = {
  /** Fallback max_tokens when neither the task config nor the call overrides it. */
  maxTokens: number;
  temperature: number;
  /**
   * `false` disables reasoning (thinking:{type:"disabled"}) when no explicit
   * reasoning_effort is configured. `true`/undefined keeps reasoning enabled.
   */
  thinking?: boolean;
  /** Task works better with OpenRouter's `:online` web-search variant. */
  webSearch?: boolean;
};

/** Per-task built-in defaults — mirrors what the route handlers used to hardcode. */
export const TASK_DEFAULTS: Record<AiTask, AiTaskDefault> = {
  meal_parse: { maxTokens: 8192, temperature: 0.2, thinking: false },
  food_vision: { maxTokens: 8192, temperature: 0.2, thinking: false },
  audio_meal_parse: { maxTokens: 1024, temperature: 0 },
  weekly_insights: { maxTokens: 8192, temperature: 0.4, thinking: false },
  meal_plan: { maxTokens: 32768, temperature: 0.5, thinking: true },
  workout_plan: { maxTokens: 32768, temperature: 0.5, thinking: true },
  nutrition_lookup: { maxTokens: 4096, temperature: 0.2, webSearch: true },
};

const ENV_DEFAULT_MODEL = "gpt-4o-mini";

/** Env-var model override per task modality (server default when nothing is configured). */
export function envModelForTask(task: AiTask): string {
  if (task === "food_vision") return process.env.OPENAI_IMAGE_MODEL || ENV_DEFAULT_MODEL;
  if (task === "audio_meal_parse") return process.env.OPENAI_AUDIO_MODEL || ENV_DEFAULT_MODEL;
  return process.env.OPENAI_TEXT_MODEL || ENV_DEFAULT_MODEL;
}
