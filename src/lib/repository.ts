import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { demoLibrary, demoLibrarySummary } from "@/lib/demo-library";
import { env, hasSupabase } from "@/lib/env";
import {
  getLocalBatch,
  getLocalPhotos,
  resetLocalUploads,
  upsertLocalBatch,
  upsertLocalPhoto,
} from "@/lib/local-store";
import type {
  EventPayload,
  LibrarySummary,
  PhotoRecord,
  UploadBatch,
} from "@/lib/types";

type SupabaseRow = {
  id: string;
  title: string;
  image_url: string;
  caption: string;
  story: string;
  labels: string[];
  people: string[];
  year: number;
  month: number;
  location: string;
  emotion: string;
  color: string;
  searchable_text?: string | null;
  raw_analysis?: string | null;
  primary_subject?: string | null;
  secondary_subjects?: string[] | null;
  objects?: string[] | null;
  scene?: string | null;
  activities?: string[] | null;
  normalized_tags?: string[] | null;
  batch_id?: string | null;
  status?: "uploading" | "indexing" | "ready" | "failed";
  source?: "seeded" | "uploaded";
};

const createAdminClient = () => {
  if (!hasSupabase) {
    return null;
  }

  return createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const mapPhotoRow = (row: SupabaseRow): PhotoRecord => ({
  id: row.id,
  title: row.title,
  imageUrl: row.image_url,
  caption: row.caption,
  story: row.story,
  labels: row.labels,
  people: row.people,
  year: row.year,
  month: row.month,
  location: row.location,
  emotion: row.emotion,
  color: row.color,
  searchableText: row.searchable_text ?? undefined,
  rawAnalysis: row.raw_analysis ?? null,
  primarySubject: row.primary_subject ?? null,
  secondarySubjects: row.secondary_subjects ?? [],
  objects: row.objects ?? [],
  scene: row.scene ?? null,
  activities: row.activities ?? [],
  normalizedTags: row.normalized_tags ?? [],
  batchId: row.batch_id ?? null,
  status: row.status ?? "ready",
  source: row.source ?? "uploaded",
});

export const getLibrarySummary = async (): Promise<LibrarySummary> => {
  if (!hasSupabase) {
    const localPhotos = await getLocalPhotos();
    const chipPool = localPhotos.flatMap((photo) => photo.labels ?? []);
    return {
      ...demoLibrarySummary,
      photoCount: localPhotos.length,
      tagChips: [...new Set(chipPool)].slice(0, 6),
    };
  }

  const client = createAdminClient();
  const { data, error } = await client!
    .from("photos")
    .select("labels");

  if (error || !data) {
    return demoLibrarySummary;
  }

  const chipPool = data.flatMap((row) => row.labels ?? []);
  const tagChips = [...new Set(chipPool)].slice(0, 6);

  return {
    ...demoLibrarySummary,
    photoCount: data.length,
    tagChips,
  };
};

export const getPhotoLibrary = async (): Promise<PhotoRecord[]> => {
  if (!hasSupabase) {
    return getLocalPhotos();
  }

  const client = createAdminClient();
  const { data, error } = await client!.from("photos").select("*");

  if (error || !data?.length) {
    return demoLibrary;
  }

  return (data as SupabaseRow[]).map(mapPhotoRow);
};

export const storeEvent = async (payload: EventPayload) => {
  if (!hasSupabase) {
    console.info("[demo-event]", payload);
    return false;
  }

  const client = createAdminClient();
  const { error } = await client!.from("events").insert({
    session_id: payload.sessionId,
    event_type: payload.eventType,
    query_text: payload.queryText ?? null,
    photo_ids: payload.photoIds ?? [],
    metadata: payload.metadata ?? {},
  });

  return !error;
};

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "public", "user-uploads");
const UPLOAD_BUCKET = "user-uploads";

export const createUploadBatch = async (totalCount: number, batchId = crypto.randomUUID()) => {
  const batch: UploadBatch = {
    id: batchId,
    totalCount,
    processedCount: 0,
    readyCount: 0,
    failedCount: 0,
    status: "uploading",
  };

  if (!hasSupabase) {
    await upsertLocalBatch(batch);
    return batch;
  }

  const client = createAdminClient();
  await client!.from("upload_batches").upsert({
    id: batch.id,
    total_count: batch.totalCount,
    processed_count: batch.processedCount,
    ready_count: batch.readyCount,
    failed_count: batch.failedCount,
    status: batch.status,
  });

  return batch;
};

export const getUploadBatch = async (batchId: string): Promise<UploadBatch | null> => {
  if (!hasSupabase) {
    return getLocalBatch(batchId);
  }

  const client = createAdminClient();
  const { data, error } = await client!
    .from("upload_batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    totalCount: data.total_count,
    processedCount: data.processed_count,
    readyCount: data.ready_count,
    failedCount: data.failed_count,
    status: data.status,
  };
};

export const updateUploadBatch = async (batch: UploadBatch) => {
  if (!hasSupabase) {
    await upsertLocalBatch(batch);
    return batch;
  }

  const client = createAdminClient();
  await client!.from("upload_batches").upsert({
    id: batch.id,
    total_count: batch.totalCount,
    processed_count: batch.processedCount,
    ready_count: batch.readyCount,
    failed_count: batch.failedCount,
    status: batch.status,
  });

  return batch;
};

export const uploadPhotoAsset = async (photoId: string, file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const objectPath = `${photoId}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (!hasSupabase) {
    await mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
    const destination = path.join(LOCAL_UPLOADS_DIR, objectPath);
    await writeFile(destination, bytes);
    return `/user-uploads/${objectPath}`;
  }

  const client = createAdminClient();
  const { error } = await client!.storage
    .from(UPLOAD_BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = client!.storage.from(UPLOAD_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
};

export const saveIndexedPhoto = async (photo: PhotoRecord) => {
  if (!hasSupabase) {
    await upsertLocalPhoto(photo);
    return photo;
  }

  const client = createAdminClient();
  const payload = {
    id: photo.id,
    batch_id: photo.batchId ?? null,
    source: photo.source ?? "uploaded",
    status: photo.status ?? "ready",
    title: photo.title,
    image_url: photo.imageUrl,
    caption: photo.caption,
    story: photo.story,
    labels: photo.labels,
    people: photo.people,
    year: photo.year,
    month: photo.month,
    location: photo.location,
    emotion: photo.emotion,
    color: photo.color,
    searchable_text: photo.searchableText ?? null,
    raw_analysis: photo.rawAnalysis ?? null,
    primary_subject: photo.primarySubject ?? null,
    secondary_subjects: photo.secondarySubjects ?? [],
    objects: photo.objects ?? [],
    scene: photo.scene ?? null,
    activities: photo.activities ?? [],
    normalized_tags: photo.normalizedTags ?? [],
  };

  const { error } = await client!.from("photos").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(`Photo save failed: ${error.message}`);
  }

  return photo;
};

export const getPhotoById = async (photoId: string): Promise<PhotoRecord | null> => {
  if (!hasSupabase) {
    const localPhotos = await getLocalPhotos();
    return localPhotos.find((photo) => photo.id === photoId) ?? null;
  }

  const client = createAdminClient();
  const { data, error } = await client!
    .from("photos")
    .select("*")
    .eq("id", photoId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapPhotoRow(data as SupabaseRow);
};

export const updatePhotoMetadata = async (
  photoId: string,
  updates: Pick<
    PhotoRecord,
    "title" | "caption" | "story" | "labels" | "people" | "location" | "emotion"
  >,
) => {
  if (!hasSupabase) {
    const photo = await getPhotoById(photoId);
    if (!photo) {
      throw new Error("Photo not found.");
    }

    const updatedPhoto: PhotoRecord = {
      ...photo,
      ...updates,
      searchableText: [
        updates.title,
        updates.caption,
        updates.story,
        ...updates.labels,
        ...updates.people,
        updates.location,
        updates.emotion,
      ]
        .filter(Boolean)
        .join(" "),
    };

    await upsertLocalPhoto(updatedPhoto);
    return updatedPhoto;
  }

  const client = createAdminClient();
  const payload = {
    title: updates.title,
    caption: updates.caption,
    story: updates.story,
    labels: updates.labels,
    people: updates.people,
    location: updates.location,
    emotion: updates.emotion,
    searchable_text: [
      updates.title,
      updates.caption,
      updates.story,
      ...updates.labels,
      ...updates.people,
      updates.location,
      updates.emotion,
    ]
      .filter(Boolean)
      .join(" "),
  };

  const { error } = await client!.from("photos").update(payload).eq("id", photoId);
  if (error) {
    throw new Error(`Photo update failed: ${error.message}`);
  }

  return getPhotoById(photoId);
};

export const resetUploadedPhotos = async () => {
  if (!hasSupabase) {
    await resetLocalUploads();
    await rm(LOCAL_UPLOADS_DIR, { recursive: true, force: true });
    return {
      librarySummary: await getLibrarySummary(),
      results: await getPhotoLibrary(),
    };
  }

  const client = createAdminClient();
  const { data: objects } = await client!.storage.from(UPLOAD_BUCKET).list("", {
    limit: 1000,
  });

  const fileNames = (objects ?? [])
    .map((object) => object.name)
    .filter(Boolean);

  if (fileNames.length) {
    await client!.storage.from(UPLOAD_BUCKET).remove(fileNames);
  }

  const { error: photoDeleteError } = await client!
    .from("photos")
    .delete()
    .eq("source", "uploaded");

  if (photoDeleteError) {
    throw new Error(`Could not clear uploaded photos: ${photoDeleteError.message}`);
  }

  const { error: batchDeleteError } = await client!
    .from("upload_batches")
    .delete()
    .neq("id", "");

  if (batchDeleteError) {
    throw new Error(`Could not clear upload batches: ${batchDeleteError.message}`);
  }

  return {
    librarySummary: await getLibrarySummary(),
    results: await getPhotoLibrary(),
  };
};
