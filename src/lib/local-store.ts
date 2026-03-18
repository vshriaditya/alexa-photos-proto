import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { demoLibrary } from "@/lib/demo-library";
import type { PhotoRecord, UploadBatch } from "@/lib/types";

type LocalState = {
  photos: PhotoRecord[];
  batches: UploadBatch[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "local-upload-state.json");

const defaultState = (): LocalState => ({
  photos: [],
  batches: [],
});

const ensureStore = async () => {
  await mkdir(DATA_DIR, { recursive: true });
};

export const readLocalState = async (): Promise<LocalState> => {
  await ensureStore();

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as LocalState;
  } catch {
    const state = defaultState();
    await writeLocalState(state);
    return state;
  }
};

export const writeLocalState = async (state: LocalState) => {
  await ensureStore();
  await writeFile(STORE_PATH, JSON.stringify(state, null, 2), "utf8");
};

export const getLocalPhotos = async () => {
  const state = await readLocalState();
  return [...demoLibrary, ...state.photos.filter((photo) => photo.status === "ready")];
};

export const upsertLocalPhoto = async (photo: PhotoRecord) => {
  const state = await readLocalState();
  const nextPhotos = state.photos.filter((existing) => existing.id !== photo.id);
  nextPhotos.push(photo);
  await writeLocalState({
    ...state,
    photos: nextPhotos,
  });
};

export const upsertLocalBatch = async (batch: UploadBatch) => {
  const state = await readLocalState();
  const nextBatches = state.batches.filter((existing) => existing.id !== batch.id);
  nextBatches.push(batch);
  await writeLocalState({
    ...state,
    batches: nextBatches,
  });
};

export const getLocalBatch = async (batchId: string) => {
  const state = await readLocalState();
  return state.batches.find((batch) => batch.id === batchId) ?? null;
};

export const resetLocalUploads = async () => {
  await writeLocalState(defaultState());
};
