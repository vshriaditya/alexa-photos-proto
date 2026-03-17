import { describe, expect, it } from "vitest";

import { demoLibrary, goldenQueries } from "@/lib/demo-library";
import { parseIntent, rankPhotos, runQuery } from "@/lib/search";

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
});
