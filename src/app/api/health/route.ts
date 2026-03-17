import { NextResponse } from "next/server";

import { env, hasRemoteProviders, hasSupabase } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    reviewMode: env.publicReviewMode,
    uploadsEnabled: env.enableUploads,
    providersConfigured: hasRemoteProviders,
    supabaseConfigured: hasSupabase,
  });
}
