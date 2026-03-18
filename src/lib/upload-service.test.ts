import { beforeEach, describe, expect, it } from "vitest";

import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import { ingestUploadedPhoto, validateUploadFile } from "@/lib/upload-service";

describe("upload service", () => {
  beforeEach(async () => {
    await rm(path.join(process.cwd(), "data"), { recursive: true, force: true });
    await rm(path.join(process.cwd(), "public", "user-uploads"), {
      recursive: true,
      force: true,
    });
  });

  it("rejects non-image files", () => {
    const file = new File(["plain text"], "notes.txt", { type: "text/plain" });
    expect(() => validateUploadFile(file)).toThrow("Only image uploads are supported.");
  });

  it("stores a local uploaded image and updates batch progress", async () => {
    const file = new File(["fake-image"], "beach-day.jpg", { type: "image/jpeg" });
    const response = await ingestUploadedPhoto(file, null, 1);

    expect(response.photo?.source).toBe("uploaded");
    expect(response.batch.readyCount).toBe(1);
    expect(response.batch.status).toBe("ready");

    const uploadPath = path.join(
      process.cwd(),
      "public",
      "user-uploads",
      `${response.photo?.id}.jpg`,
    );

    const stored = await readFile(uploadPath, "utf8");
    expect(stored).toBe("fake-image");
    expect(response.photo?.primarySubject).toBeTruthy();
    expect(response.photo?.normalizedTags?.length).toBeGreaterThan(0);
  });
});
