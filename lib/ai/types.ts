/** Connection info of the provider a task resolves to. */
export type ProviderRef = {
  /** null when resolved from server env instead of the ai_providers table. */
  id: string | null;
  name: string;
  baseUrl: string;
  apiKey: string;
  /** baseUrl points at OpenRouter — enables `:online` model suffixes. */
  openrouter: boolean;
};

/** Everything the client needs to fire one AI call for a task. */
export type ResolvedTaskConfig = {
  provider: ProviderRef;
  modelId: string;
  /** "" = per-task default behavior; otherwise sent verbatim as reasoning_effort. */
  reasoningEffort: string;
  /** null = per-task default. */
  maxTokens: number | null;
};
