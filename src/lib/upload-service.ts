import { analyzeImage } from "@/lib/providers";
import {
  createUploadBatch,
  getLibrarySummary,
  getUploadBatch,
  saveIndexedPhoto,
  updateUploadBatch,
  uploadPhotoAsset,
} from "@/lib/repository";
import type { PhotoRecord, UploadBatch, UploadResponse } from "@/lib/types";

const MAX_FILES_PER_BATCH = 25;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export const validateUploadFile = (file: File) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image uploads are supported.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Each file must be 15MB or smaller.");
  }
};

export const getOrCreateBatch = async (
  batchId: string | null,
  totalCount: number,
): Promise<UploadBatch> => {
  if (totalCount < 1 || totalCount > MAX_FILES_PER_BATCH) {
    throw new Error("Upload batches must contain between 1 and 25 images.");
  }

  if (batchId) {
    const existing = await getUploadBatch(batchId);
    if (existing) {
      return existing;
    }
  }

  return createUploadBatch(totalCount, batchId ?? undefined);
};

export const ingestUploadedPhoto = async (
  file: File,
  batchId: string | null,
  totalCount: number,
): Promise<UploadResponse> => {
  validateUploadFile(file);

  let batch = await getOrCreateBatch(batchId, totalCount);
  batch = await updateUploadBatch({
    ...batch,
    status: "indexing",
  });

  const photoId = crypto.randomUUID();

  try {
    const imageUrl = await uploadPhotoAsset(photoId, file);
    const analysis = await analyzeImage(file);
    const now = new Date();
    const photo: PhotoRecord = {
      id: photoId,
      batchId: batch.id,
      status: "ready",
      source: "uploaded",
      title: analysis.title,
      imageUrl,
      caption: analysis.caption,
      story: analysis.story,
      labels: analysis.labels,
      people: analysis.people,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      location: analysis.location,
      emotion: analysis.emotion,
      color: analysis.color,
      searchableText: analysis.searchableText,
    };

    await saveIndexedPhoto(photo);

    const processedCount = batch.processedCount + 1;
    const readyCount = batch.readyCount + 1;
    batch = await updateUploadBatch({
      ...batch,
      processedCount,
      readyCount,
      status: processedCount >= batch.totalCount ? "ready" : "indexing",
    });

    return {
      batch,
      photo,
      librarySummary: await getLibrarySummary(),
    };
  } catch (error) {
    const processedCount = batch.processedCount + 1;
    const failedCount = batch.failedCount + 1;
    batch = await updateUploadBatch({
      ...batch,
      processedCount,
      failedCount,
      status:
        processedCount >= batch.totalCount
          ? failedCount === batch.totalCount
            ? "failed"
            : "ready"
          : "indexing",
    });

    return {
      batch,
      photo: null,
      error: error instanceof Error ? error.message : "Upload failed.",
      librarySummary: await getLibrarySummary(),
    };
  }
};
