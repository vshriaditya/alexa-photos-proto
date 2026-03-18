import { demoLibrarySummary } from "@/lib/demo-library";
import { getIntent } from "@/lib/providers";
import { getLibrarySummary, getPhotoLibrary, storeEvent } from "@/lib/repository";
import { countStrongMatches, rankPhotos } from "@/lib/search";
import type { EventPayload, QueryRequest, QueryResponse } from "@/lib/types";

const buildResultDrivenAnswer = (
  query: string,
  intentAnswer: string,
  resultCount: number,
  strongMatchCount: number,
) => {
  if (!resultCount) {
    return "I could not find a matching moment in this library. Try another person, location, or timeframe.";
  }

  if (strongMatchCount > 0) {
    return `I found ${strongMatchCount} strong match${strongMatchCount === 1 ? "" : "es"} for "${query}". Here ${strongMatchCount === 1 ? "is" : "are"} the closest memories.`;
  }

  const lowered = intentAnswer.toLowerCase();
  if (
    lowered.includes("could not find") ||
    lowered.includes("couldn't find") ||
    lowered.includes("no photos")
  ) {
    return `I found nearby matches for "${query}", but not an exact tagged hit yet. Here are the closest memories.`;
  }

  return `${intentAnswer} Here are ${resultCount} memories that look closest.`;
};

export const executeQuery = async ({
  query,
  conversation,
  selectedOption,
  sessionId,
}: QueryRequest): Promise<QueryResponse> => {
  const [photos, summary] = await Promise.all([
    getPhotoLibrary(),
    getLibrarySummary().catch(() => demoLibrarySummary),
  ]);

  const intent = await getIntent(
    query,
    conversation.slice(-5),
    summary,
    photos,
    selectedOption,
  );

  if (intent.confidence === "low" && intent.disambiguation) {
    await storeEvent({
      sessionId: sessionId ?? "anonymous",
      eventType: "fallback_triggered",
      queryText: query,
      metadata: {
        options: intent.disambiguation.join(", "),
      },
    });

    return {
      naturalAnswer:
        "I found a few strong interpretations for that memory. Pick one and I will narrow the results.",
      confidence: intent.confidence,
      searchMode: intent.searchMode,
      filters: intent.filters,
      disambiguation: intent.disambiguation,
      results: [],
    };
  }

  const results = rankPhotos(photos, intent);
  const strongMatchCount = countStrongMatches(results, intent.queryText);
  const looksLikeRefinement = conversation.some((turn) => turn.role === "assistant");

  await storeEvent({
    sessionId: sessionId ?? "anonymous",
    eventType: looksLikeRefinement ? "refinement_turn" : "query_submitted",
    queryText: query,
    photoIds: results.map((photo) => photo.id),
    metadata: {
      confidence: intent.confidence,
      resultCount: results.length,
    },
  });

  return {
    naturalAnswer: buildResultDrivenAnswer(
      query,
      intent.naturalAnswer,
      results.length,
      strongMatchCount,
    ),
    confidence: intent.confidence,
    searchMode: intent.searchMode,
    filters: intent.filters,
    disambiguation: null,
    results,
  };
};

export const logEvent = async (payload: EventPayload) => ({
  stored: await storeEvent(payload),
});
