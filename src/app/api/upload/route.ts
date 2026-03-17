import { NextRequest, NextResponse } from "next/server";

import { uploadResponseSchema } from "@/lib/contracts";
import { env } from "@/lib/env";
import { ingestUploadedPhoto } from "@/lib/upload-service";

export async function POST(request: NextRequest) {
  if (!env.enableUploads) {
    return NextResponse.json(
      {
        error:
          "Public uploads are disabled for review mode. Use the seeding script for demo content.",
      },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const batchId = formData.get("batchId");
  const totalCount = Number(formData.get("totalCount") ?? "1");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "A single image file is required." },
      { status: 400 },
    );
  }

  const response = await ingestUploadedPhoto(
    file,
    typeof batchId === "string" ? batchId : null,
    totalCount,
  );

  return NextResponse.json(uploadResponseSchema.parse(response));
}
