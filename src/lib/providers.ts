import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

import { env } from "@/lib/env";
import { parseIntent } from "@/lib/search";
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

  if (!client) {
    return parseIntent(query, conversation, photos, selectedOption);
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
      return normalizeIntentPayload(parsed, query);
    } catch {
      return parseIntent(query, conversation, photos, selectedOption);
    }
  } catch {
    return parseIntent(query, conversation, photos, selectedOption);
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

export const analyzeImage = async (file: File) => {
  const client = getOpenAIClient();
  const title = toTitle(file.name);
  const fileTokens = tokenizeFileName(file.name);

  if (!client) {
    const labels = buildFallbackLabels(fileTokens);
    return {
      title,
      caption: `Uploaded photo: ${title}.`,
      story: `A newly uploaded memory featuring ${labels.join(", ") || "personal moments"}.`,
      labels: labels.length ? labels : ["memory", "photo", "upload"],
      people: [],
      location: "Unknown",
      emotion: "warm",
      color: "#6a994e",
      searchableText: [title, ...labels].join(" "),
      rawAnalysis: null,
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
  const prompt = [
    "Analyze this personal photo for a memory-recall app.",
    "Return JSON only with keys: title, caption, story, labels, people, location, emotion, color, searchableText.",
    "Keep labels short and useful for natural-language search.",
    "Prefer concrete visual labels like baby, infant, child, mountain, beach, dog, cat, sunset, lake, forest, soccer, food, family, portrait when they apply.",
    'If uncertain about people or location, return an empty array or "Unknown".',
  ].join(" ");

  try {
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
    const parsed = JSON.parse(raw) as {
      title?: string;
      caption?: string;
      story?: string;
      labels?: string[];
      people?: string[];
      location?: string;
      emotion?: string;
      color?: string;
      searchableText?: string;
    };

    return {
      title: parsed.title || title,
      caption: parsed.caption || `Uploaded photo: ${title}.`,
      story: parsed.story || `A newly uploaded memory featuring ${title}.`,
      labels: parsed.labels?.length ? parsed.labels : buildFallbackLabels(fileTokens),
      people: parsed.people ?? [],
      location: parsed.location || "Unknown",
      emotion: parsed.emotion || "warm",
      color: parsed.color || "#6a994e",
      searchableText:
        parsed.searchableText ||
        [parsed.title, parsed.caption, ...(parsed.labels ?? [])]
          .filter(Boolean)
          .join(" "),
      rawAnalysis: raw,
    };
  } catch {
    const labels = buildFallbackLabels(fileTokens);
    return {
      title,
      caption: `Uploaded photo: ${title}.`,
      story: `A newly uploaded memory featuring ${labels.join(", ") || "personal moments"}.`,
      labels: labels.length ? labels : ["memory", "photo", "upload"],
      people: [],
      location: "Unknown",
      emotion: "warm",
      color: "#6a994e",
      searchableText: [title, ...labels].join(" "),
      rawAnalysis: null,
    };
  }
};
