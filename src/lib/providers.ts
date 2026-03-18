import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

import { env } from "@/lib/env";
import { parseIntent } from "@/lib/search";
import { expandNormalizedTags } from "@/lib/tag-normalization";
import type {
  ConversationTurn,
  LibrarySummary,
  ParsedIntent,
  PhotoRecord,
} from "@/lib/types";

let openaiClient: OpenAI | null = null;
let geminiClient: GoogleGenAI | null = null;

const getOpenAIClient = () => {
  if (!env.openAiApiKey) {
    return null;
  }

  openaiClient ??= new OpenAI({ apiKey: env.openAiApiKey });
  return openaiClient;
};

const getGeminiClient = () => {
  if (!env.geminiApiKey) {
    return null;
  }

  geminiClient ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
  return geminiClient;
};

export const getIntent = async (
  query: string,
  conversation: ConversationTurn[],
  librarySummary: LibrarySummary,
  photos: PhotoRecord[],
  selectedOption?: string | null,
): Promise<ParsedIntent> => {
  const client = getOpenAIClient();
  const heuristicIntent = parseIntent(query, conversation, photos, selectedOption);

  if (!client) {
    return heuristicIntent;
  }

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `You are a photo memories assistant for a public review demo. Output JSON only with keys naturalAnswer, filters, searchMode, confidence, disambiguation, queryText. Available summary: ${JSON.stringify(librarySummary)}.`,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                query,
                conversation,
                selectedOption,
              }),
            },
          ],
        },
      ],
    });

    const raw = response.output_text;

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return mergeIntentPayloads(
        heuristicIntent,
        normalizeIntentPayload(parsed, query),
      );
    } catch {
      return heuristicIntent;
    }
  } catch {
    return heuristicIntent;
  }
};

export const embedQuery = async (query: string) => {
  const client = getGeminiClient();

  if (!client) {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  const response = await client.models.embedContent({
    model: "text-embedding-004",
    contents: query,
  });

  return response.embeddings?.[0]?.values ?? [];
};

const toTitle = (name: string) =>
  name
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const tokenizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !token.includes("unsplash"));

const stopTokens = new Set([
  "img",
  "image",
  "photo",
  "upload",
  "uploaded",
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

const buildFallbackLabels = (tokens: string[]) => {
  const cleaned = tokens.filter((token) => token.length > 2 && !stopTokens.has(token));
  return cleaned.slice(0, 4);
};

const normalizeConfidence = (value: unknown): ParsedIntent["confidence"] => {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "medium";
};

const normalizeSearchMode = (value: unknown): ParsedIntent["searchMode"] => {
  if (value === "semantic" || value === "filter_only" || value === "hybrid") {
    return value;
  }

  if (value === "filter only") {
    return "filter_only";
  }

  return "semantic";
};

const normalizeIntentPayload = (
  parsed: Record<string, unknown>,
  query: string,
): ParsedIntent => {
  const filtersCandidate =
    parsed.filters && typeof parsed.filters === "object" && !Array.isArray(parsed.filters)
      ? (parsed.filters as Record<string, unknown>)
      : {};

  return {
    naturalAnswer:
      (typeof parsed.naturalAnswer === "string" && parsed.naturalAnswer) ||
      (typeof parsed.natural_answer === "string" && parsed.natural_answer) ||
      "I pulled the closest matches from the library.",
    filters: {
      labels: Array.isArray(filtersCandidate.labels)
        ? filtersCandidate.labels.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      people: Array.isArray(filtersCandidate.people)
        ? filtersCandidate.people.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      year:
        typeof filtersCandidate.year === "number" ? filtersCandidate.year : null,
      month:
        typeof filtersCandidate.month === "number" ? filtersCandidate.month : null,
      location:
        typeof filtersCandidate.location === "string"
          ? filtersCandidate.location
          : null,
    },
    searchMode: normalizeSearchMode(parsed.searchMode ?? parsed.search_mode),
    confidence: normalizeConfidence(parsed.confidence),
    disambiguation: Array.isArray(parsed.disambiguation)
      ? parsed.disambiguation.filter(
          (value): value is string => typeof value === "string",
        )
      : null,
    queryText:
      (typeof parsed.queryText === "string" && parsed.queryText) ||
      (typeof parsed.query_text === "string" && parsed.query_text) ||
      query,
  };
};

const mergeStringLists = (left: string[] | undefined, right: string[] | undefined) =>
  [...new Set([...(left ?? []), ...(right ?? [])])];

const mergeIntentPayloads = (
  heuristicIntent: ParsedIntent,
  remoteIntent: ParsedIntent,
): ParsedIntent => ({
  ...remoteIntent,
  naturalAnswer: remoteIntent.naturalAnswer || heuristicIntent.naturalAnswer,
  filters: {
    labels: mergeStringLists(heuristicIntent.filters.labels, remoteIntent.filters.labels),
    people: mergeStringLists(heuristicIntent.filters.people, remoteIntent.filters.people),
    year: remoteIntent.filters.year ?? heuristicIntent.filters.year ?? null,
    month: remoteIntent.filters.month ?? heuristicIntent.filters.month ?? null,
    location: remoteIntent.filters.location ?? heuristicIntent.filters.location ?? null,
  },
  searchMode:
    remoteIntent.searchMode === "semantic" &&
    (
      (heuristicIntent.filters.labels?.length ?? 0) > 0 ||
      (heuristicIntent.filters.people?.length ?? 0) > 0 ||
      heuristicIntent.filters.location ||
      heuristicIntent.filters.year ||
      heuristicIntent.filters.month
    )
      ? "hybrid"
      : remoteIntent.searchMode,
});

const stripCodeFence = (value: string) =>
  value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => {
        if (typeof entry === "string") {
          return entry.split(",");
        }

        if (entry && typeof entry === "object") {
          return Object.values(entry).flatMap((nested) =>
            typeof nested === "string" ? nested.split(",") : [],
          );
        }

        return [];
      })
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

const toSingleString = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  const arrayValue = toStringArray(value);
  if (arrayValue.length) {
    return arrayValue[0];
  }

  return fallback;
};

const toOptionalString = (value: unknown) => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  const arrayValue = toStringArray(value);
  return arrayValue[0] ?? null;
};

const joinSearchableText = (values: unknown[]) =>
  values.flatMap((value) => {
    if (typeof value === "string") {
      return value.trim() ? [value.trim()] : [];
    }

    return toStringArray(value);
  });

export const normalizeImageAnalysisPayload = (
  parsed: Record<string, unknown>,
  fallbackTitle: string,
  fallbackFileTokens: string[],
) => {
  const primarySubject = toOptionalString(parsed.primarySubject);
  const secondarySubjects = toStringArray(parsed.secondarySubjects);
  const objects = toStringArray(parsed.objects);
  const searchTags = toStringArray(parsed.searchTags);
  const people = toStringArray(parsed.people);
  const activities = toStringArray(parsed.activities);
  const scene = toSingleString(parsed.scene, "unknown");
  const location = toSingleString(parsed.location, "Unknown");
  const emotion = toSingleString(parsed.emotion, "warm");
  const color = toSingleString(parsed.color, "#6a994e");

  const labels = [
    primarySubject,
    ...secondarySubjects,
    ...objects,
    ...searchTags,
  ].filter((value): value is string => typeof value === "string" && Boolean(value));
  const normalizedTags = expandNormalizedTags([primarySubject, ...labels]);
  const searchableText = joinSearchableText([
    parsed.title,
    parsed.caption,
    parsed.story,
    searchTags,
    normalizedTags,
    scene,
    activities,
    people,
    location,
  ]).join(" ");

  return {
    title: toSingleString(parsed.title, fallbackTitle),
    caption: toSingleString(parsed.caption, `Uploaded photo: ${fallbackTitle}.`),
    story: toSingleString(
      parsed.story,
      `A newly uploaded memory featuring ${fallbackTitle}.`,
    ),
    labels: labels.length ? labels : buildFallbackLabels(fallbackFileTokens),
    people,
    location,
    emotion,
    color,
    searchableText,
    primarySubject: primarySubject || normalizedTags[0] || null,
    secondarySubjects,
    objects,
    scene,
    activities,
    normalizedTags,
  };
};

export const analyzeImage = async (file: File) => {
  const client = getOpenAIClient();
  const title = toTitle(file.name);
  const fileTokens = tokenizeFileName(file.name);
  console.info("[analyzeImage] start", {
    fileName: file.name,
    fileType: file.type,
    hasOpenAIClient: Boolean(client),
  });

  if (!client) {
    const labels = buildFallbackLabels(fileTokens);
    const normalizedTags = expandNormalizedTags([title, ...labels]);
    console.info("[analyzeImage] fallback:no-client", {
      fileName: file.name,
      labels,
      normalizedTags,
    });
    return {
      title,
      caption: `Uploaded photo: ${title}.`,
      story: `A newly uploaded memory featuring ${labels.join(", ") || "personal moments"}.`,
      labels: labels.length ? labels : ["memory", "photo", "upload"],
      people: [],
      location: "Unknown",
      emotion: "warm",
      color: "#6a994e",
      searchableText: [title, ...labels, ...normalizedTags].join(" "),
      rawAnalysis: null,
      primarySubject: normalizedTags[0] ?? null,
      secondarySubjects: labels.slice(1),
      objects: labels,
      scene: "unknown",
      activities: [],
      normalizedTags,
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
  const prompt = [
    "Analyze this personal photo for a memory-recall app.",
    "Return JSON only with keys: title, caption, story, primarySubject, secondarySubjects, objects, scene, activities, people, location, emotion, color, searchTags, confidenceNotes.",
    "Keep all arrays short and concrete.",
    "For visible obvious subjects, prefer concrete visual labels like baby, infant, child, mountain, beach, dog, cat, sunset, lake, forest, soccer, food, family, portrait, car when they apply.",
    "searchTags must contain the best direct search words a user would type.",
    'If uncertain about people or location, return an empty array or "Unknown".',
  ].join(" ");

  try {
    console.info("[analyzeImage] calling-openai", {
      fileName: file.name,
      model: "gpt-4.1-mini",
      mimeType,
    });
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            {
              type: "input_image",
              image_url: dataUrl,
              detail: "low",
            },
          ],
        },
      ],
    });

    const raw = response.output_text ?? "";
    const cleanedRaw = stripCodeFence(raw);
    console.info("[analyzeImage] openai-response", {
      fileName: file.name,
      hasOutputText: Boolean(raw),
      preview: raw.slice(0, 300),
    });
    const parsed = JSON.parse(cleanedRaw) as Record<string, unknown>;
    const normalized = normalizeImageAnalysisPayload(parsed, title, fileTokens);

    return {
      ...normalized,
      rawAnalysis: cleanedRaw,
    };
  } catch (error) {
    const labels = buildFallbackLabels(fileTokens);
    const normalizedTags = expandNormalizedTags([title, ...labels]);
    console.error("[analyzeImage] fallback:error", {
      fileName: file.name,
      error: error instanceof Error ? error.message : String(error),
      labels,
      normalizedTags,
    });
    return {
      title,
      caption: `Uploaded photo: ${title}.`,
      story: `A newly uploaded memory featuring ${labels.join(", ") || "personal moments"}.`,
      labels: labels.length ? labels : ["memory", "photo", "upload"],
      people: [],
      location: "Unknown",
      emotion: "warm",
      color: "#6a994e",
      searchableText: [title, ...labels, ...normalizedTags].join(" "),
      rawAnalysis: null,
      primarySubject: normalizedTags[0] ?? null,
      secondarySubjects: labels.slice(1),
      objects: labels,
      scene: "unknown",
      activities: [],
      normalizedTags,
    };
  }
};
