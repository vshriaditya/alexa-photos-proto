const optional = (key: string) => process.env[key]?.trim();

export const env = {
  openAiApiKey: optional("OPENAI_API_KEY"),
  geminiApiKey: optional("GEMINI_API_KEY"),
  supabaseUrl: optional("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: optional("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
  publicReviewMode: optional("NEXT_PUBLIC_REVIEW_MODE") !== "false",
  enableUploads: optional("ENABLE_PUBLIC_UPLOADS") === "true",
  rateLimitMax: Number(optional("RATE_LIMIT_MAX") ?? "12"),
  rateLimitWindowMs: Number(optional("RATE_LIMIT_WINDOW_MS") ?? `${60_000}`),
};

export const hasRemoteProviders =
  Boolean(env.openAiApiKey) || Boolean(env.geminiApiKey);

export const hasSupabase =
  Boolean(env.supabaseUrl) &&
  Boolean(env.supabaseAnonKey) &&
  Boolean(env.supabaseServiceRoleKey);
