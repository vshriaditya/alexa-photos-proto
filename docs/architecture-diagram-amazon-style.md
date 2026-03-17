# Talk to Your Memories

## Clean architecture diagram

```mermaid
flowchart LR
    reviewer[Reviewer]

    subgraph experience[Alexa+ Photos Demo Experience]
        ui[Public Review Web App<br/>3-panel experience]
        voice[Voice Capture<br/>Browser speech input]
    end

    subgraph app[Application Layer]
        query["Query Orchestrator<br/>/api/query"]
        events["Signal Logging<br/>/api/events"]
        policy[Public Review Controls<br/>rate limit + uploads off]
    end

    subgraph intelligence[Memory Intelligence Layer]
        intent[Intent Understanding<br/>natural language to filters]
        retrieve[Memory Retrieval<br/>ranking + filtering]
        fallback[Clarification Logic<br/>low-confidence disambiguation]
    end

    subgraph data[Memory Data Layer]
        seeded[Seeded Demo Library<br/>local-ready fallback]
        supabase[(Hosted Memory Store<br/>Supabase)]
    end

    subgraph models[Model Providers]
        openai[OpenAI<br/>query understanding]
        gemini[Gemini<br/>embeddings + image understanding]
    end

    subgraph hosting[Deployment Surface]
        vercel[Vercel<br/>public link + server secrets]
    end

    reviewer --> ui
    reviewer --> voice
    voice --> ui

    ui --> query
    ui --> events
    ui --> policy

    query --> intent
    query --> retrieve
    query --> fallback

    intent --> openai
    retrieve --> gemini
    retrieve --> seeded
    retrieve --> supabase

    events --> supabase
    policy --> vercel
    query --> vercel
```

## Reviewer flow

```mermaid
sequenceDiagram
    participant Reviewer
    participant WebApp as Public Review App
    participant Query as Query Orchestrator
    participant Memory as Memory Retrieval Layer
    participant Models as OpenAI / Gemini
    participant Store as Seeded Library / Supabase

    Reviewer->>WebApp: Ask a memory question
    WebApp->>Query: Send question and recent context
    Query->>Models: Understand intent
    Query->>Memory: Retrieve likely matches
    Memory->>Store: Read memory metadata
    Store-->>Memory: Candidate photos
    Memory-->>Query: Ranked results

    alt strong match
        Query-->>WebApp: Return answer and memory set
        WebApp-->>Reviewer: Show matching photos
    else ambiguous match
        Query-->>WebApp: Return clarification options
        WebApp-->>Reviewer: Ask follow-up to narrow results
    end
```

## Short framing for Amazon-style explanation

Use this wording:

> The experience is built as a thin review client on top of a server-side orchestration layer. The client captures multimodal input and displays results, while the server interprets the request, retrieves the most relevant memories, and safely manages model access and product signals. This lets us validate the core conversational recall loop with a public review link, without exposing credentials or requiring account setup.
