import { z } from "zod";

export const queryFiltersSchema = z.object({
  labels: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
  year: z.number().nullable().optional(),
  month: z.number().nullable().optional(),
  location: z.string().nullable().optional(),
});

export const photoResultSchema = z.object({
  id: z.string(),
  batchId: z.string().nullable().optional(),
  status: z.enum(["uploading", "indexing", "ready", "failed"]).optional(),
  source: z.enum(["seeded", "uploaded"]).optional(),
  title: z.string(),
  imageUrl: z.string(),
  caption: z.string(),
  story: z.string(),
  labels: z.array(z.string()),
  people: z.array(z.string()),
  year: z.number(),
  month: z.number(),
  location: z.string(),
  emotion: z.string(),
  color: z.string(),
  searchableText: z.string().optional(),
  score: z.number(),
  topLabels: z.array(z.string()),
});

export const queryRequestSchema = z.object({
  query: z.string().min(1),
  conversation: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1),
    }),
  ),
  selectedOption: z.string().nullable().optional(),
  sessionId: z.string().optional(),
});

export const queryResponseSchema = z.object({
  naturalAnswer: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  searchMode: z.enum(["semantic", "filter_only", "hybrid"]),
  filters: queryFiltersSchema,
  disambiguation: z.array(z.string()).nullable(),
  results: z.array(photoResultSchema),
});

export const eventPayloadSchema = z.object({
  sessionId: z.string().min(1),
  eventType: z.enum([
    "result_feedback",
    "fallback_triggered",
    "query_submitted",
    "refinement_turn",
    "voice_used",
    "session_started",
  ]),
  queryText: z.string().optional(),
  photoIds: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export const eventResponseSchema = z.object({
  stored: z.boolean(),
});

export const uploadBatchSchema = z.object({
  id: z.string(),
  totalCount: z.number(),
  processedCount: z.number(),
  readyCount: z.number(),
  failedCount: z.number(),
  status: z.enum(["uploading", "indexing", "ready", "failed"]),
});

export const uploadResponseSchema = z.object({
  batch: uploadBatchSchema,
  photo: photoResultSchema
    .omit({ score: true, topLabels: true })
    .nullable(),
  librarySummary: z.object({
    photoCount: z.number(),
    tagChips: z.array(z.string()),
    prompts: z.array(z.string()),
    highlights: z.array(z.string()),
  }),
  error: z.string().optional(),
});
