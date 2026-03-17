import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReviewDemo } from "@/components/review-demo";
import { demoLibrary, demoLibrarySummary } from "@/lib/demo-library";

describe("ReviewDemo", () => {
  it("renders the seeded review experience and prompt shortcuts", () => {
    render(
      <ReviewDemo
        librarySummary={demoLibrarySummary}
        uploadsEnabled
        initialResults={demoLibrary.slice(0, 3).map((photo) => ({
          ...photo,
          score: 1,
          topLabels: photo.labels.slice(0, 2),
        }))}
      />,
    );

    expect(screen.getByText("Talk to Your Memories")).toBeInTheDocument();
    expect(screen.getByText("Seeded demo library")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Show our Yosemite trip last June"));

    expect(
      screen.getByPlaceholderText("Ask anything about the seeded library..."),
    ).toHaveValue("Show our Yosemite trip last June");
  });

  it("records feedback through the event endpoint", () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ stored: true }),
    })) as unknown as typeof fetch;

    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReviewDemo
        librarySummary={demoLibrarySummary}
        uploadsEnabled
        initialResults={demoLibrary.slice(0, 2).map((photo) => ({
          ...photo,
          score: 1,
          topLabels: photo.labels.slice(0, 2),
        }))}
      />,
    );

    fireEvent.click(screen.getAllByText("👍 Right direction")[0]);

    expect(fetchMock).toHaveBeenCalled();
  });
});
