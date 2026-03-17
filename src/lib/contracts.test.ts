import { describe, expect, it } from "vitest";

import {
  eventPayloadSchema,
  queryResponseSchema,
  uploadResponseSchema,
} from "@/lib/contracts";

describe("contract guards", () => {
  it("accepts a query response payload shaped for the UI", () => {
    const parsed = queryResponseSchema.parse({
      naturalAnswer: "Here are a few matching memories.",
      confidence: "high",
      searchMode: "hybrid",
      filters: {
        labels: ["beach"],
        people: ["Jake"],
        year: 2023,
        month: null,
        location: "Maui",
      },
      disambiguation: null,
      results: [],
    });

    expect(parsed.confidence).toBe("high");
  });

  it("accepts public analytics events", () => {
    const parsed = eventPayloadSchema.parse({
      sessionId: "session-123",
      eventType: "result_feedback",
      photoIds: ["hawaii-beach-2023"],
      metadata: { liked: true },
    });

    expect(parsed.eventType).toBe("result_feedback");
  });

  it("accepts upload progress payloads", () => {
    const parsed = uploadResponseSchema.parse({
      batch: {
        id: "batch-1",
        totalCount: 3,
        processedCount: 1,
        readyCount: 1,
        failedCount: 0,
        status: "indexing",
      },
      photo: {
        id: "photo-1",
        batchId: "batch-1",
        status: "ready",
        source: "uploaded",
        title: "Beach Day",
        imageUrl: "/user-uploads/photo-1.jpg",
        caption: "A beach day.",
        story: "A personal memory.",
        labels: ["beach"],
        people: [],
        year: 2026,
        month: 3,
        location: "Unknown",
        emotion: "warm",
        color: "#6a994e",
      },
      librarySummary: {
        photoCount: 11,
        tagChips: ["Beach"],
        prompts: [],
        highlights: [],
      },
    });

    expect(parsed.batch.status).toBe("indexing");
  });
});
