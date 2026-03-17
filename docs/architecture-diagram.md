# Talk to Your Memories Architecture

## High-level architecture

```mermaid
flowchart LR
    reviewer[Reviewer in Browser]
    ui[Next.js UI<br/>3-panel review experience]
    speech[Web Speech API<br/>voice to text]
    queryApi["POST /api/query"]
    eventApi["POST /api/events"]
    uploadApi["POST /api/upload<br/>disabled in public mode"]
    service[Query Service]
    search[Local Retrieval + Ranking]
    repo[Repository Layer]
    seeded[Seeded Demo Library<br/>local fallback]
    supabase[(Supabase<br/>photos + events)]
    openai[OpenAI<br/>intent parsing]
    gemini[Gemini<br/>embeddings / image understanding]
    vercel[Vercel Deployment<br/>server env vars]

    reviewer --> ui
    speech --> ui
    ui --> queryApi
    ui --> eventApi
    ui -. optional .-> uploadApi
    queryApi --> service
    service --> openai
    service --> gemini
    service --> search
    search --> repo
    repo --> seeded
    repo --> supabase
    queryApi --> vercel
    eventApi --> repo
    uploadApi --> repo
```

## Runtime explanation

```mermaid
sequenceDiagram
    participant R as Reviewer
    participant B as Browser UI
    participant Q as /api/query
    participant S as Query Service
    participant O as OpenAI
    participant G as Gemini
    participant D as Seeded Library / Supabase

    R->>B: Ask a memory query
    Note over B: Typing or microphone input
    B->>Q: Send query + recent chat context
    Q->>S: Validate request
    S->>O: Parse intent into filters and confidence
    S->>G: Create embedding or semantic query signal
    S->>D: Retrieve candidate photos
    S->>S: Rank and filter results
    alt low confidence
        S-->>Q: Return disambiguation choices
        Q-->>B: Show clarification chips
    else confident match
        S-->>Q: Return answer + ranked photos
        Q-->>B: Update photo grid and assistant reply
    end
```

## Local fallback mode

```mermaid
flowchart TD
    env{Keys configured?}
    local[Use local seeded data<br/>and local search logic]
    remote[Use hosted providers<br/>and Supabase]

    env -- No --> local
    env -- Yes --> remote
```

## Component map

- `Browser UI`
  - Built with `Next.js + React`
  - Shows library summary, chat, and results grid
- `Web Speech API`
  - Lets the reviewer speak instead of type
  - Converts voice into text in the browser
- `/api/query`
  - Safe server-side endpoint for search requests
  - Prevents model keys from being exposed to the browser
- `Query Service`
  - Central orchestration layer
  - Combines intent parsing, retrieval, ranking, and fallback behavior
- `Repository Layer`
  - Hides whether data comes from local seeded content or Supabase
- `Seeded Demo Library`
  - Makes the app usable immediately with no setup
- `Supabase`
  - Intended hosted store for photo metadata and event logs
- `OpenAI`
  - Intended LLM layer for turning natural language into structured search intent
- `Gemini`
  - Intended multimodal layer for embeddings and image understanding
- `Vercel`
  - Intended public hosting surface with server-side secret management

## Interview-friendly summary

You can describe the architecture like this:

> The browser is intentionally thin. It handles interaction, display, and voice capture, but all intelligence runs behind server routes. The server interprets the query, retrieves matching memories from either seeded local data or Supabase, and returns ranked results. That lets the demo work locally with no keys, while preserving a production-shaped architecture for public deployment.
