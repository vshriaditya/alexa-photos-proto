import { describe, expect, it } from "vitest";

import { demoLibrary, goldenQueries } from "@/lib/demo-library";
import { countStrongMatches, parseIntent, rankPhotos, runQuery } from "@/lib/search";

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
    ];

    const intent = parseIntent("Show me baby photos", [], photos);
    const results = rankPhotos(photos, intent);

    expect(countStrongMatches(results, "Show me baby photos")).toBe(1);
  });
});
