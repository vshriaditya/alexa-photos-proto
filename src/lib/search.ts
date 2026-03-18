import type {
  ConversationTurn,
  ParsedIntent,
  PhotoRecord,
  PhotoResult,
  QueryFilters,
  QueryResponse,
} from "@/lib/types";

const monthMap: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const unique = (items: string[]) => [...new Set(items)];
const stopWords = new Set([
  "show",
  "me",
  "and",
  "together",
  "near",
  "please",
  "photos",
  "photo",
  "pictures",
  "picture",
  "images",
  "image",
  "of",
  "the",
  "a",
  "an",
  "our",
  "my",
  "find",
  "only",
  "just",
]);

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const getMeaningfulTokens = (text: string) =>
  tokenize(text).filter((token) => !stopWords.has(token));

const buildExactPool = (photo: PhotoRecord) =>
  [
    ...photo.labels,
    ...(photo.normalizedTags ?? []),
    ...(photo.primarySubject ? [photo.primarySubject] : []),
    ...(photo.people ?? []),
    ...(photo.location ? [photo.location] : []),
  ].map((value) => value.toLowerCase());

const inferYear = (query: string) => {
  const match = query.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
};

const inferMonth = (query: string) => {
  const lowered = query.toLowerCase();
  for (const [name, month] of Object.entries(monthMap)) {
    if (lowered.includes(name)) {
      return month;
    }
  }
  return null;
};

const findInCollection = (queryTokens: string[], candidates: string[]) =>
  candidates.filter((candidate) => {
    const normalized = candidate.toLowerCase();
    return queryTokens.some((token) => normalized.includes(token));
  });

export const parseIntent = (
  query: string,
  conversation: ConversationTurn[],
  photoLibrary: PhotoRecord[],
  selectedOption?: string | null,
): ParsedIntent => {
  const mergedQuery = [query, selectedOption].filter(Boolean).join(" ");
  const queryTokens = tokenize(mergedQuery);
  const labels = unique(findInCollection(queryTokens, photoLibrary.flatMap((photo) => photo.labels)));
  const people = unique(findInCollection(queryTokens, photoLibrary.flatMap((photo) => photo.people)));
  const locations = unique(photoLibrary.map((photo) => photo.location)).filter((location) =>
    queryTokens.some((token) => location.toLowerCase().includes(token)),
  );
  const year = inferYear(mergedQuery);
  const month = inferMonth(mergedQuery);
  const previousUserTurn = [...conversation].reverse().find((turn) => turn.role === "user")?.content;
  const looksLikeRefinement = /\b(now|just|only|with|from)\b/i.test(query) && Boolean(previousUserTurn);

  let confidence: ParsedIntent["confidence"] = "high";
  let disambiguation: string[] | null = null;

  if (mergedQuery.toLowerCase().includes("beach") && !locations.length) {
    confidence = "low";
    disambiguation = ["Hawaii", "Santa Cruz"];
  } else if (!labels.length && !people.length && !year && !month && queryTokens.length < 3) {
    confidence = "medium";
  }

  const naturalAnswerParts: string[] = [];

  if (looksLikeRefinement) {
    naturalAnswerParts.push("I refined the last result set.");
  }

  if (people.length) {
    naturalAnswerParts.push(`Looking for ${people.join(", ")}.`);
  }

  if (labels.length) {
    naturalAnswerParts.push(`Matching ${labels.slice(0, 3).join(", ")} moments.`);
  }

  if (locations.length) {
    naturalAnswerParts.push(`Focusing on ${locations.join(", ")}.`);
  }

  if (year) {
    naturalAnswerParts.push(`Limited to ${year}.`);
  }

  return {
    naturalAnswer:
      naturalAnswerParts.join(" ") ||
      "I pulled the closest matches from the seeded family library.",
    filters: {
      labels,
      people,
      year,
      month,
      location: locations[0] ?? null,
    },
    searchMode: labels.length || people.length || year || month ? "hybrid" : "semantic",
    confidence,
    disambiguation,
    queryText: mergedQuery,
  };
};

export const scorePhoto = (photo: PhotoRecord, intent: ParsedIntent) => {
  const queryTokens = getMeaningfulTokens(intent.queryText);
  const photoText = [
    photo.title,
    photo.caption,
    photo.story,
    photo.searchableText,
    photo.primarySubject,
    photo.scene,
    photo.location,
    photo.emotion,
    ...photo.labels,
    ...photo.people,
    ...(photo.objects ?? []),
    ...(photo.activities ?? []),
    ...(photo.normalizedTags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const token of queryTokens) {
    if (photoText.includes(token)) {
      score += 1;
    }
  }

  if (intent.filters.people?.some((person) => photo.people.includes(person))) {
    score += 4;
  }

  if (intent.filters.labels?.some((label) => photo.labels.includes(label))) {
    score += 3;
  }

  if (
    photo.normalizedTags?.some((tag) =>
      queryTokens.some((token) => tag.includes(token)),
    )
  ) {
    score += 6;
  }

  if (
    photo.primarySubject &&
    queryTokens.some((token) => photo.primarySubject?.includes(token))
  ) {
    score += 5;
  }

  if (intent.filters.location && photo.location === intent.filters.location) {
    score += 5;
  }

  if (intent.filters.year && photo.year === intent.filters.year) {
    score += 2;
  }

  if (intent.filters.month && photo.month === intent.filters.month) {
    score += 2;
  }

  return score;
};

export const applyFilters = (photos: PhotoRecord[], filters: QueryFilters) =>
  photos.filter((photo) => {
    const labelsMatch =
      !filters.labels?.length ||
      filters.labels.every((label) =>
        [
          ...photo.labels,
          ...(photo.normalizedTags ?? []),
          ...(photo.primarySubject ? [photo.primarySubject] : []),
        ].some((photoLabel) =>
          photoLabel.toLowerCase().includes(label.toLowerCase()),
        ),
      );

    const peopleMatch =
      !filters.people?.length ||
      filters.people.every((person) =>
        photo.people.some((photoPerson) =>
          photoPerson.toLowerCase().includes(person.toLowerCase()),
        ),
      );

    const yearMatch = !filters.year || photo.year === filters.year;
    const monthMatch = !filters.month || photo.month === filters.month;
    const locationMatch =
      !filters.location ||
      photo.location.toLowerCase().includes(filters.location.toLowerCase());

    return labelsMatch && peopleMatch && yearMatch && monthMatch && locationMatch;
  });

export const rankPhotos = (photos: PhotoRecord[], intent: ParsedIntent): PhotoResult[] => {
  const candidates = applyFilters(photos, intent.filters).length
    ? applyFilters(photos, intent.filters)
    : photos;

  return candidates
    .map((photo) => ({
      ...photo,
      score: scorePhoto(photo, intent),
      topLabels: photo.labels.slice(0, 2),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 12);
};

export const countStrongMatches = (photos: PhotoResult[], queryText: string) => {
  const queryTokens = getMeaningfulTokens(queryText);

  return photos.filter((photo) => {
    const exactPool = buildExactPool(photo);

    return queryTokens.length > 0 && queryTokens.every((token) =>
      exactPool.some((candidate) => candidate.includes(token)),
    );
  }).length;
};

export const filterStrongMatches = (photos: PhotoResult[], queryText: string) => {
  const queryTokens = getMeaningfulTokens(queryText);

  return photos.filter((photo) => {
    const exactPool = buildExactPool(photo);

    return queryTokens.length > 0 && queryTokens.every((token) =>
      exactPool.some((candidate) => candidate.includes(token)),
    );
  });
};

export const runQuery = (
  photos: PhotoRecord[],
  query: string,
  conversation: ConversationTurn[],
  selectedOption?: string | null,
): QueryResponse => {
  const intent = parseIntent(query, conversation, photos, selectedOption);

  if (intent.confidence === "low" && intent.disambiguation) {
    return {
      naturalAnswer: "I found a few strong interpretations. Pick one to narrow the memory.",
      confidence: intent.confidence,
      searchMode: intent.searchMode,
      filters: intent.filters,
      disambiguation: intent.disambiguation,
      results: [],
    };
  }

  const rankedResults = rankPhotos(photos, intent);
  const strongMatches = filterStrongMatches(rankedResults, intent.queryText);
  const results = strongMatches.length > 0 ? strongMatches : rankedResults;

  return {
    naturalAnswer:
      results.length > 0
        ? `${intent.naturalAnswer} Here are ${results.length} matching memories.`
        : "I could not find a good match in the seeded library. Try another detail like a person, place, or year.",
    confidence: intent.confidence,
    searchMode: intent.searchMode,
    filters: intent.filters,
    disambiguation: null,
    results,
  };
};
