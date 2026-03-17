import { NextRequest, NextResponse } from "next/server";

import { photoResultSchema, photoUpdateRequestSchema } from "@/lib/contracts";
import { getPhotoById, updatePhotoMetadata } from "@/lib/repository";

type RouteContext = {
  params: Promise<unknown>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  const { id } = (await context.params) as { id: string };
  const photo = await getPhotoById(id);

  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  return NextResponse.json(
    photoResultSchema.parse({
      ...photo,
      score: 1,
      topLabels: photo.labels.slice(0, 2),
    }),
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = (await context.params) as { id: string };
  const payload = photoUpdateRequestSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const updated = await updatePhotoMetadata(id, payload.data);
  if (!updated) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  return NextResponse.json(
    photoResultSchema.parse({
      ...updated,
      score: 1,
      topLabels: updated.labels.slice(0, 2),
    }),
  );
}
