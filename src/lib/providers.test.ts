import { describe, expect, it } from "vitest";

import { normalizeImageAnalysisPayload } from "@/lib/providers";

describe("normalizeImageAnalysisPayload", () => {
  it("coerces array-valued scalar fields into stable strings", () => {
    const normalized = normalizeImageAnalysisPayload(
      {
        title: "Man Playing with Dog on Grass Near Beach",
        caption: "A man with a small dog on grass near the beach.",
        story: "A playful beachside moment.",
        primarySubject: "dog",
        secondarySubjects: ["man"],
        objects: ["grass", "beach"],
        scene: ["outdoor", "coastal"],
        activities: ["playing", "standing"],
        people: ["man"],
        location: ["beachfront", "Unknown"],
        emotion: ["joyful", "warm"],
        color: ["golden", "green"],
        searchTags: ["dog", "beach", "playful"],
      },
      "Fallback Title",
      ["fallback", "title"],
    );

    expect(normalized.location).toBe("beachfront");
    expect(normalized.emotion).toBe("joyful");
    expect(normalized.color).toBe("golden");
    expect(normalized.scene).toBe("outdoor");
    expect(normalized.labels).toContain("dog");
    expect(normalized.labels).toContain("beach");
    expect(normalized.normalizedTags).toContain("dog");
    expect(normalized.searchableText).toContain("playing");
  });

  it("falls back safely when mixed arrays contain non-string values", () => {
    const normalized = normalizeImageAnalysisPayload(
      {
        primarySubject: "mountain",
        secondarySubjects: ["sky", { bad: true }],
        objects: ["trees", 42, null],
        activities: [{ label: "hiking" }, "exploring"],
        people: [false, "family"],
        location: [{ name: "Yosemite" }],
        emotion: [{ label: "peaceful" }],
        color: [{ value: "blue" }],
        searchTags: ["peaks", { text: "landscape" }],
      },
      "Mountain Upload",
      ["mountain", "upload"],
    );

    expect(normalized.location).toBe("Yosemite");
    expect(normalized.emotion).toBe("peaceful");
    expect(normalized.color).toBe("blue");
    expect(normalized.activities).toEqual(["hiking", "exploring"]);
    expect(normalized.people).toEqual(["family"]);
    expect(normalized.labels).toContain("mountain");
    expect(normalized.normalizedTags).toContain("mountain");
  });
});
