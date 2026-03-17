import { NextRequest, NextResponse } from "next/server";

import { eventPayloadSchema, eventResponseSchema } from "@/lib/contracts";
import { logEvent } from "@/lib/query-service";

export async function POST(request: NextRequest) {
  const payload = eventPayloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const response = await logEvent(payload.data);
  return NextResponse.json(eventResponseSchema.parse(response));
}
