# Talk to Your Memories

Public review demo for conversational photo recall on Alexa+.

## What is implemented

- Public no-password review experience with a seeded family library
- 3-panel interface for library context, conversational search, and ranked photo results
- `POST /api/query` for conversational retrieval with low-confidence fallback chips
- `POST /api/events` for lightweight reviewer feedback logging
- Browser voice input via the Web Speech API
- Real image upload and indexing for batches of up to 25 photos
- Supabase-ready repository layer with local seeded fallback for development
- A small set of real public-source demo photos mixed into the seeded library
- Golden-query tests and a smoke script to catch recall regressions early

## Local development

1. Copy `.env.example` to `.env.local`
2. Add provider keys only if you want live OpenAI, Gemini, or Supabase integrations
3. Install dependencies with `npm install`
4. Start the app with `npm run dev`

If no cloud keys are configured, the app still works in local seeded-demo mode.
If `ENABLE_PUBLIC_UPLOADS=true`, local uploads are stored in a local runtime store for development and in Supabase Storage when those credentials are configured.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run check:demo`

## Public deployment

- Deploy the repo to Vercel
- Add the env vars from `.env.example`
- Apply the SQL in [`supabase/schema.sql`](/Users/aditya/CodexProjects/Photos/Chatbot_LLM/supabase/schema.sql)
- Create a public storage bucket named `user-uploads`
- Run `npm run seed:supabase` if you want the seeded library stored in Supabase instead of local fallback mode
- Keep `ENABLE_PUBLIC_UPLOADS=false` for public review mode
- Share the generated Vercel URL with the reviewer

## Manual review flow

1. Open the public URL and confirm the seeded library loads with no auth wall
2. Run a recall query like `Show our Yosemite trip last June`
3. Run a refinement like `Only the ones with Jake`
4. Trigger fallback with `Show me beach photos`
5. Submit feedback with the result batch buttons
