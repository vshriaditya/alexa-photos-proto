import { NextResponse } from "next/server";

import { resetUploadsResponseSchema } from "@/lib/contracts";
import { resetUploadedPhotos } from "@/lib/repository";

export async function POST() {
  try {
    const response = await resetUploadedPhotos();
    const parsed = resetUploadsResponseSchema.parse(response);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not reset uploaded photos.",
      },
      { status: 500 },
    );
  }
}
