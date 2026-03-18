import { describe, expect, it } from "vitest";

import { demoLibrary, goldenQueries } from "@/lib/demo-library";
import {
  countStrongMatches,
  filterStrongMatches,
  parseIntent,
  rankPhotos,
  runQuery,
} from "@/lib/search";

describe("search contracts", () => {
  it("extracts structured filters from a direct recall query", () => {
    const intent = parseIntent(
      "Find pictures of Jake playing soccer in 2023",
      [],
      demoLibrary,
    );

    expect(intent.filters.people).toContain("Jake");
    expect(intent.filters.labels).toContain("soccer");
    expect(intent.filters.year).toBe(2023);
    expect(intent.searchMode).toBe("hybrid");
  });

  it("returns low confidence disambiguation for an ambiguous beach query", () => {
    const response = runQuery(demoLibrary, "Show me beach photos", []);

    expect(response.confidence).toBe("low");
    expect(response.disambiguation).toEqual(["Hawaii", "Santa Cruz"]);
    expect(response.results).toHaveLength(0);
  });

  it("ranks the expected photos first for golden queries", () => {
    for (const fixture of goldenQueries) {
      const intent = parseIntent(fixture.query, [], demoLibrary);
      const results = rankPhotos(demoLibrary, intent);
      expect(results[0]?.id).toBe(fixture.expectedTopId);
    }
  });

  it("counts explicit tag matches for uploaded-photo style queries", () => {
    const photos = [
      {
        id: "photo-1",
        title: "Peaceful Naptime",
        imageUrl: "/baby.jpg",
        caption: "A baby sleeping on a bed.",
        story: "A baby naptime moment.",
        labels: ["baby", "bed"],
        people: [],
        year: 2026,
        month: 3,
        location: "Unknown",
        emotion: "peaceful",
        color: "#ffffff",
        normalizedTags: ["baby", "infant", "bed"],
      },
      {
        id: "photo-2",
        title: "Mountain Range",
        imageUrl: "/mountain.jpg",
        caption: "A mountain landscape.",
        story: "Autumn mountains.",
        labels: ["mountain", "trees"],
        people: [],
        year: 2026,
        month: 3,
        location: "Unknown",
        emotion: "calm",
        color: "#88aaff",
        normalizedTags: ["mountain", "forest"],
      },
    ];

    const intent = parseIntent("Show me baby photos", [], photos);
    const results = rankPhotos(photos, intent);
    const strongMatches = filterStrongMatches(results, "Show me baby photos");

    expect(countStrongMatches(results, "Show me baby photos")).toBe(1);
    expect(strongMatches).toHaveLength(1);
    expect(strongMatches[0]?.id).toBe("photo-1");
  });

  it("requires all requested concepts for a strong multi-tag match", () => {
    const photos = [
      {
        id: "photo-1",
        title: "Baby and Dog",
        imageUrl: "/baby-dog.jpg",
        caption: "A baby with a dog.",
        story: "A baby and dog together.",
        labels: ["baby", "dog"],
        people: [],
        year: 2026,
        month: 3,
        location: "Unknown",
        emotion: "happy",
        color: "#ffffff",
        normalizedTags: ["baby", "dog"],
      },
      {
        id: "photo-2",
        title: "Baby Only",
        imageUrl: "/baby.jpg",
        caption: "A sleeping baby.",
        story: "Baby naptime.",
        labels: ["baby"],
        people: [],
        year: 2026,
        month: 3,
        location: "Unknown",
        emotion: "calm",
        color: "#eeeeee",
        normalizedTags: ["baby", "infant"],
      },
    ];

    const intent = parseIntent("Show me dog and baby photo together", [], photos);
    const results = rankPhotos(photos, intent);
    const strongMatches = filterStrongMatches(results, "Show me dog and baby photo together");

    expect(strongMatches).toHaveLength(1);
    expect(strongMatches[0]?.id).toBe("photo-1");
  });

  it("treats exact location matches like Yosemite as strong results", () => {
    const intent = parseIntent("Show me yosemite", [], demoLibrary);
    const results = rankPhotos(demoLibrary, intent);
    const strongMatches = filterStrongMatches(results, "Show me yosemite");

    expect(strongMatches).toHaveLength(1);
    expect(strongMatches[0]?.id).toBe("yosemite-cabin-2024");
  });

  it("matches plural dog queries to singular dog tags", () => {
    const photos = [
      {
        id: "photo-1",
        title: "Dog on Ferry Deck",
        imageUrl: "/dog.jpg",
        caption: "A dog resting on a ferry deck.",
        story: "A dog resting near the railing.",
        labels: ["dog", "people"],
        people: [],
        year: 2026,
        month: 3,
        location: "Unknown",
        emotion: "calm",
        color: "#cccccc",
        normalizedTags: ["dog", "canine"],
      },
      {
        id: "photo-2",
        title: "Yosemite Valley",
        imageUrl: "/yosemite.jpg",
        caption: "A mountain valley view.",
        story: "Granite cliffs and misty forest.",
        labels: ["mountains", "forest"],
        people: [],
        year: 2026,
        month: 3,
        location: "Yosemite National Park",
        emotion: "calm",
        color: "#88aaff",
        normalizedTags: ["mountain", "forest"],
      },
    ];

    const intent = parseIntent("Show me dogs", [], photos);
    const results = rankPhotos(photos, intent);
    const strongMatches = filterStrongMatches(results, "Show me dogs");

    expect(strongMatches).toHaveLength(1);
    expect(strongMatches[0]?.id).toBe("photo-1");
  });
});
