export type Confidence = "high" | "medium" | "low";

export type SearchMode = "semantic" | "filter_only" | "hybrid";

export type EventType =
  | "result_feedback"
  | "fallback_triggered"
  | "query_submitted"
  | "refinement_turn"
  | "voice_used"
  | "session_started";

export type ConversationRole = "user" | "assistant";

export interface ConversationTurn {
  role: ConversationRole;
  content: string;
}

export interface QueryFilters {
  labels?: string[];
  people?: string[];
  year?: number | null;
  month?: number | null;
  location?: string | null;
}

export interface PhotoRecord {
  id: string;
  batchId?: string | null;
  status?: "uploading" | "indexing" | "ready" | "failed";
  source?: "seeded" | "uploaded";
  title: string;
  imageUrl: string;
  caption: string;
  story: string;
  labels: string[];
  people: string[];
  year: number;
  month: number;
  location: string;
  emotion: string;
  color: string;
  searchableText?: string;
  rawAnalysis?: string | null;
  primarySubject?: string | null;
  secondarySubjects?: string[];
  objects?: string[];
  scene?: string | null;
  activities?: string[];
  normalizedTags?: string[];
}

export interface PhotoResult extends PhotoRecord {
  score: number;
  topLabels: string[];
}

export interface LibrarySummary {
  photoCount: number;
  tagChips: string[];
  prompts: string[];
  highlights: string[];
}

export interface ParsedIntent {
  naturalAnswer: string;
  filters: QueryFilters;
  searchMode: SearchMode;
  confidence: Confidence;
  disambiguation: string[] | null;
  queryText: string;
}

export interface QueryResponse {
  naturalAnswer: string;
  confidence: Confidence;
  searchMode: SearchMode;
  filters: QueryFilters;
  disambiguation: string[] | null;
  results: PhotoResult[];
}

export interface QueryRequest {
  query: string;
  conversation: ConversationTurn[];
  selectedOption?: string | null;
  sessionId?: string;
}

export interface EventPayload {
  sessionId: string;
  eventType: EventType;
  queryText?: string;
  photoIds?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface EventResponse {
  stored: boolean;
}

export interface UploadBatch {
  id: string;
  totalCount: number;
  processedCount: number;
  readyCount: number;
  failedCount: number;
  status: "uploading" | "indexing" | "ready" | "failed";
}

export interface UploadResponse {
  batch: UploadBatch;
  photo: PhotoRecord | null;
  librarySummary: LibrarySummary;
  error?: string;
}

export interface PhotoUpdateRequest {
  title: string;
  caption: string;
  story: string;
  labels: string[];
  people: string[];
  location: string;
  emotion: string;
}

export interface ResetUploadsResponse {
  librarySummary: LibrarySummary;
  results: PhotoRecord[];
}
