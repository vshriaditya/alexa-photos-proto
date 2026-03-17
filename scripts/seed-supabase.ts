import { createClient } from "@supabase/supabase-js";

import { demoLibrary } from "../src/lib/demo-library";
import { env, hasSupabase } from "../src/lib/env";

if (!hasSupabase) {
  console.error(
    "Supabase env vars are missing. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY first.",
  );
  process.exit(1);
}

const client = createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const seed = async () => {
  const rows = demoLibrary.map((photo) => ({
    id: photo.id,
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
  }));

  const { error } = await client.from("photos").upsert(rows, {
    onConflict: "id",
  });

  if (error) {
    console.error("Failed to seed Supabase photos table:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${demoLibrary.length} demo photos into Supabase.`);
};

void seed();
