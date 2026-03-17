import { NextRequest, NextResponse } from "next/server";

import { queryRequestSchema, queryResponseSchema } from "@/lib/contracts";
import { env } from "@/lib/env";
import { executeQuery } from "@/lib/query-service";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "local";
  const rateLimit = checkRateLimit(
    forwardedFor,
    env.rateLimitMax,
    env.rateLimitWindowMs,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  const payload = queryRequestSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const response = await executeQuery(payload.data);
  const parsed = queryResponseSchema.parse(response);

  return NextResponse.json(parsed);
}
