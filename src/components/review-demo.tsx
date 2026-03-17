"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useRef, useState, useTransition } from "react";

import { createSessionId } from "@/lib/session";
import type {
  ConversationTurn,
  LibrarySummary,
  PhotoResult,
  QueryResponse,
  UploadBatch,
  UploadResponse,
} from "@/lib/types";

type ReviewDemoProps = {
  initialResults: PhotoResult[];
  librarySummary: LibrarySummary;
  uploadsEnabled: boolean;
};

type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    start: () => void;
    stop: () => void;
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent {
    error: string;
  }
}

const starters: ConversationTurn[] = [
  {
    role: "assistant",
    content:
      "The seeded family library is ready. Ask about a trip, a person, or a feeling to explore the memories.",
  },
];

const postEvent = async (payload: Record<string, unknown>) => {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("Event logging unavailable", error);
  }
};

export function ReviewDemo({
  initialResults,
  librarySummary,
  uploadsEnabled,
}: ReviewDemoProps) {
  const [libraryState, setLibraryState] = useState(librarySummary);
  const [conversation, setConversation] = useState<ConversationTurn[]>(starters);
  const [results, setResults] = useState<PhotoResult[]>(initialResults);
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [statusText, setStatusText] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [uploadBatch, setUploadBatch] = useState<UploadBatch | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoResult | null>(null);
  const [editDraft, setEditDraft] = useState({
    title: "",
    caption: "",
    story: "",
    labels: "",
    people: "",
    location: "",
    emotion: "",
  });
  const [sessionId] = useState(createSessionId);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void postEvent({
      sessionId,
      eventType: "session_started",
      metadata: { surface: "public-review" },
    });
  }, [sessionId]);

  const sendQuery = async (queryText: string, selectedOption?: string | null) => {
    setStatusText("Searching...");
    setError(null);

    const nextConversation: ConversationTurn[] = [
      ...conversation,
      { role: "user", content: selectedOption ? `${queryText} (${selectedOption})` : queryText },
    ];

    setConversation(nextConversation);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: queryText,
          selectedOption: selectedOption ?? null,
          conversation,
          sessionId,
        }),
      });

      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          failure?.error || "The demo could not complete that request.",
        );
      }

      const data = (await response.json()) as QueryResponse;
      setConversation((current) => [
        ...current,
        {
          role: "assistant",
          content: data.naturalAnswer,
        },
      ]);

      setStatusText(data.confidence === "low" ? "Need clarification" : "Ready");
      setChips(data.disambiguation ?? []);

      if (data.results.length) {
        setResults(data.results);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong during the search.",
      );
      setStatusText("Error");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      return;
    }

    const queryText = query.trim();
    setQuery("");
    await sendQuery(queryText);
  };

  const toggleListening = () => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError("Speech recognition is not available in this browser.");
      return;
    }

    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    setListening(true);
    setStatusText("Listening...");
    setError(null);

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (!transcript) {
        return;
      }

      setQuery(transcript);
      void postEvent({
        sessionId,
        eventType: "voice_used",
        queryText: transcript,
      });

      startTransition(() => {
        void sendQuery(transcript);
      });
    };

    recognition.onerror = (event) => {
      setError(`Voice capture failed: ${event.error}`);
      setListening(false);
      setStatusText("Ready");
    };

    recognition.onend = () => {
      setListening(false);
      setStatusText("Ready");
    };

    recognition.start();
  };

  const handleFeedback = async (liked: boolean) => {
    await postEvent({
      sessionId,
      eventType: "result_feedback",
      photoIds: results.map((photo) => photo.id),
      metadata: { liked },
    });
  };

  const latestAssistantMessage =
    [...conversation].reverse().find((turn) => turn.role === "assistant")?.content ??
    starters[0].content;

  const openMetadataEditor = (photo: PhotoResult) => {
    setSelectedPhoto(photo);
    setEditDraft({
      title: photo.title,
      caption: photo.caption,
      story: photo.story,
      labels: photo.labels.join(", "),
      people: photo.people.join(", "),
      location: photo.location,
      emotion: photo.emotion,
    });
  };

  const saveMetadataEdits = async () => {
    if (!selectedPhoto) {
      return;
    }

    const response = await fetch(`/api/photos/${selectedPhoto.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: editDraft.title,
        caption: editDraft.caption,
        story: editDraft.story,
        labels: editDraft.labels
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        people: editDraft.people
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        location: editDraft.location,
        emotion: editDraft.emotion,
      }),
    });

    if (!response.ok) {
      const failure = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(failure?.error || "Could not save photo metadata.");
      return;
    }

    const updated = (await response.json()) as PhotoResult;
    setResults((current) =>
      current.map((photo) => (photo.id === updated.id ? updated : photo)),
    );
    setSelectedPhoto(updated);
    setError(null);
  };

  const handleUploadSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (!selectedFiles.length) {
      return;
    }

    if (selectedFiles.length > 25) {
      setError("Please upload 25 images or fewer per batch.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setStatusText("Indexing uploads...");

    let currentBatchId: string | null = null;
    const uploadedResults: PhotoResult[] = [];

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("totalCount", String(selectedFiles.length));

      if (currentBatchId) {
        formData.append("batchId", currentBatchId);
      }

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as UploadResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Upload failed.");
        }

        currentBatchId = data.batch.id;
        setUploadBatch(data.batch);
        setLibraryState(data.librarySummary);

        if (data.photo) {
          const uploadedPhoto: PhotoResult = {
            ...data.photo,
            score: 1,
            topLabels: data.photo.labels.slice(0, 2),
          };

          uploadedResults.unshift(uploadedPhoto);
          setResults((current) => [uploadedPhoto, ...current].slice(0, 12));
        }

        if (data.error) {
          setError(data.error);
        }
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "A file failed during upload.",
        );
      }
    }

    setIsUploading(false);
    setStatusText("Ready");
    setConversation((current) => [
      ...current,
      {
        role: "assistant",
        content:
          uploadedResults.length > 0
            ? `I indexed ${uploadedResults.length} uploaded photos. You can ask about them right away.`
            : "The upload batch finished, but I could not index any new photos.",
      },
    ]);
    event.target.value = "";
  };

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Photos on Alexa+ prototype</p>
          <h1>Talk to Your Memories</h1>
          <p className="lede">
            Public review mode is live with a seeded family library, multi-turn
            recall, browser voice input, and lightweight evaluation hooks.
          </p>
        </div>
        <div className="heroBadge" aria-label="review status">
          <span className="statusDot" />
          {statusText}
        </div>
      </section>

      <section className="dashboard">
        <aside className="panel libraryPanel">
          <div className="panelHeader">
            <h2>Library</h2>
            <span>{libraryState.photoCount} photos</span>
          </div>
          <p className="panelCopy">
            {uploadsEnabled
              ? "Add up to 25 images per batch. The app stores them, indexes them, and makes them searchable in the same session."
              : "Seeded review library is active. Uploads are disabled for this deployment mode."}
          </p>
          <div className="chipWrap">
            {libraryState.highlights.map((highlight) => (
              <span key={highlight} className="chip accent">
                {highlight}
              </span>
            ))}
          </div>
          <div className="chipWrap">
            {libraryState.tagChips.map((tag) => (
              <span key={tag} className="chip">
                {tag}
              </span>
            ))}
          </div>
          {uploadsEnabled ? (
            <div className="uploadCard">
              <h3>Upload images</h3>
              <p>JPG, PNG, or WebP. Max 25 images per batch.</p>
              <label className="uploadButton" htmlFor="library-upload">
                {isUploading ? "Uploading..." : "Choose images"}
              </label>
              <input
                id="library-upload"
                type="file"
                accept="image/*"
                multiple
                disabled={isUploading}
                className="srOnly"
                onChange={handleUploadSelection}
              />
              {uploadBatch ? (
                <div className="progressCard">
                  <p>
                    Batch progress: {uploadBatch.processedCount}/{uploadBatch.totalCount}
                  </p>
                  <div className="progressBar">
                    <span
                      style={{
                        width: `${(uploadBatch.processedCount / uploadBatch.totalCount) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="panelCopy">
                    Ready: {uploadBatch.readyCount} · Failed: {uploadBatch.failedCount}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="promptList">
            <h3>Try asking</h3>
            {libraryState.prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="promptButton"
                onClick={() => {
                  setQuery(prompt);
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </aside>

        <section className="panel chatPanel">
          <div className="panelHeader">
            <h2>Chat</h2>
            <span>{isPending ? "Working..." : "Review ready"}</span>
          </div>
          <div className="messages" aria-live="polite">
            {conversation.map((turn, index) => (
              <article
                key={`${turn.role}-${index}`}
                className={`message ${turn.role === "user" ? "user" : "assistant"}`}
              >
                <p className="messageRole">
                  {turn.role === "user" ? "Reviewer" : "Assistant"}
                </p>
                <p>{turn.content}</p>
              </article>
            ))}
            {chips.length > 0 ? (
              <div className="chipWrap">
                {chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="chipButton"
                    onClick={() => {
                      void sendQuery(query || latestAssistantMessage, chip);
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <form className="composer" onSubmit={handleSubmit}>
            <label className="srOnly" htmlFor="memory-query">
              Ask about a memory
            </label>
            <textarea
              id="memory-query"
              value={query}
              rows={3}
              placeholder="Ask anything about the seeded library..."
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="composerActions">
              <button
                type="button"
                className={`micButton ${listening ? "active" : ""}`}
                onClick={toggleListening}
                disabled={isUploading}
              >
                {listening ? "Listening..." : "Use mic"}
              </button>
              <button type="submit" className="submitButton" disabled={isPending || isUploading}>
                Send
              </button>
            </div>
          </form>
          {error ? <p className="errorText">{error}</p> : null}
        </section>

        <section className="panel resultsPanel">
          <div className="panelHeader">
            <h2>Results</h2>
            <span>{results.length} shown</span>
          </div>
          <p className="panelCopy">{latestAssistantMessage}</p>
          <div className="feedbackRow">
            <button type="button" className="feedbackButton" onClick={() => void handleFeedback(true)}>
              👍 Right direction
            </button>
            <button type="button" className="feedbackButton" onClick={() => void handleFeedback(false)}>
              👎 Needs work
            </button>
          </div>
          <div className="photoGrid">
            {results.map((photo) => (
              <article key={photo.id} className="photoCard">
                <Image
                  src={photo.imageUrl}
                  alt={photo.title}
                  className="photoImage"
                  width={1200}
                  height={900}
                  unoptimized
                />
                <div className="photoMeta">
                  <div className="photoTitleRow">
                    <h3>{photo.title}</h3>
                    <span>{photo.score.toFixed(1)}</span>
                  </div>
                  <p>{photo.caption}</p>
                  <div className="chipWrap">
                    <span className="chip subtle">{photo.location}</span>
                    <span className="chip subtle">{photo.year}</span>
                    {photo.topLabels.map((label) => (
                      <span key={label} className="chip subtle">
                        {label}
                      </span>
                    ))}
                  </div>
                  {photo.source === "uploaded" ? (
                    <button
                      type="button"
                      className="metaButton"
                      onClick={() => openMetadataEditor(photo)}
                    >
                      Inspect metadata
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          {selectedPhoto ? (
            <section className="metadataPanel">
              <div className="panelHeader">
                <h2>Edit Metadata</h2>
                <button
                  type="button"
                  className="feedbackButton"
                  onClick={() => setSelectedPhoto(null)}
                >
                  Close
                </button>
              </div>
              <p className="panelCopy">
                Review the generated tags and fix anything that looks wrong before relying on search quality.
              </p>
              <div className="fieldGrid">
                <label>
                  <span>Title</span>
                  <input
                    value={editDraft.title}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Location</span>
                  <input
                    value={editDraft.location}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, location: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Caption</span>
                  <textarea
                    rows={3}
                    value={editDraft.caption}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, caption: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Story</span>
                  <textarea
                    rows={3}
                    value={editDraft.story}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, story: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Labels</span>
                  <input
                    value={editDraft.labels}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, labels: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>People</span>
                  <input
                    value={editDraft.people}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, people: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Emotion</span>
                  <input
                    value={editDraft.emotion}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, emotion: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="metadataActions">
                <button type="button" className="submitButton" onClick={() => void saveMetadataEdits()}>
                  Save edits
                </button>
              </div>
              <details className="rawAnalysis">
                <summary>Raw model output</summary>
                <pre>{selectedPhoto.rawAnalysis || "No raw analysis stored for this photo."}</pre>
              </details>
            </section>
          ) : null}
        </section>
      </section>
    </main>
  );
}
