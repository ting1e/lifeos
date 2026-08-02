"use client";

import { useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { isAiError } from "@/lib/ai/ai-error";
import { readAiStream } from "@/lib/ai/sse";

export type ParsedItem = {
  name: string;
  quantity?: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes?: string;
};

export type ParseResult = {
  meal: string;
  items: ParsedItem[];
  confidence?: number;
  search_used?: boolean;
};

/**
 * Shared state + actions for AI meal photo/voice/text parsing.
 * Used by both AiMealForm (logs to /api/food) and LibraryAiForm
 * (saves to /api/food-library). Previously ~90% duplicated in both.
 */
export function useMealParse(defaultMeal?: string) {
  const t = useT();

  function friendlyError(msg: string): string {
    switch (msg) {
      case "parse_failed":
        return t("food.errParseFailed");
      case "upload_failed":
        return t("food.errUploadFailed");
      case "heic_conversion_failed":
        return t("food.errHeicFailed");
      default:
        return msg;
    }
  }

  function fail(rawMsg: string) {
    setError(friendlyError(rawMsg));
    setAiHint(isAiError(rawMsg));
  }

  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiHint, setAiHint] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [streaming, setStreaming] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);

  // ---- photo ----
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDropKey, setPhotoDropKey] = useState(0);

  async function uploadPhoto(file: File) {
    setPhotoUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/food/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? t("food.errUploadFailed"));
      setPhotoPath(data.name);
      setPhotoPreviewUrl(URL.createObjectURL(file));
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    } finally {
      setPhotoUploading(false);
    }
  }

  function removePhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPath(null);
    setPhotoPreviewUrl(null);
    setPhotoDropKey((k) => k + 1);
  }

  // ---- voice recording ----
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  function pickMime(): string | undefined {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return undefined;
  }

  async function startRecording() {
    setError(null);
    setStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mrRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const type = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        streamRef.current?.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
        if (blob.size < 1000) {
          setAiHint(false);
          setError(t("food.recordingEmpty"));
          return;
        }
        setTranscribing(true);
        setStatus(t("food.transcribingStatus"));
        try {
          const fd = new FormData();
          const ext = type.includes("mp4")
            ? "m4a"
            : type.includes("ogg")
              ? "ogg"
              : type.includes("wav")
                ? "wav"
                : "webm";
          fd.append("audio", blob, `voice.${ext}`);
          const r = await fetch("/api/food/transcribe", { method: "POST", body: fd });
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error ?? `http_${r.status}`);
          const transcribed = (data.text ?? "").trim();
          if (!transcribed) {
            setAiHint(false);
            setError(t("food.transcribeEmpty"));
            return;
          }
          setText((prev) => (prev ? `${prev} ${transcribed}` : transcribed));
          setStatus(t("food.transcribedStatus"));
        } catch (e) {
          fail(e instanceof Error ? e.message : String(e));
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      setRecording(true);
      setStatus(t("food.recordingStatus"));
    } catch (e) {
      setAiHint(false);
      setError(
        e instanceof Error
          ? t("food.micBlocked", { msg: e.message })
          : t("food.micDenied"),
      );
    }
  }

  function stopRecording() {
    mrRef.current?.stop();
    mrRef.current = null;
    setRecording(false);
  }

  // ---- parse ----
  async function parse() {
    if (!photoPath && !text.trim()) return;
    setParsing(true);
    setError(null);
    setStatus(photoPath ? t("food.analyzingPhoto") : t("food.aiThinking"));
    setResult(null);
    setStreaming("");
    try {
      const r = await fetch("/api/food/parse-meal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: text.trim() || undefined,
          photoPath: photoPath ?? undefined,
          defaultMeal,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? `http_${r.status}`);
      }
      const data = (await readAiStream(r, {
        onChunk: (chunk) => setStreaming((p) => p + chunk),
      })) as { parsed: ParseResult };
      setResult(data.parsed);
      setStreaming("");
      setStatus(
        t(data.parsed.search_used ? "food.parsedNItemsWeb" : "food.parsedNItems", {
          n: data.parsed.items.length,
        }),
      );
      setText("");
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
      setStatus(null);
    } finally {
      setParsing(false);
    }
  }

  // ---- inline edits on the parsed preview ----
  function updateItem(i: number, patch: Partial<ParsedItem>) {
    setResult((prev) =>
      prev
        ? { ...prev, items: prev.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }
        : prev,
    );
  }
  function removeItem(i: number) {
    setResult((prev) =>
      prev ? { ...prev, items: prev.items.filter((_, idx) => idx !== i) } : prev,
    );
  }

  function resetPhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPath(null);
    setPhotoPreviewUrl(null);
    setPhotoDropKey((k) => k + 1);
  }

  return {
    // text
    text,
    setText,
    // parse
    parsing,
    parse,
    streaming,
    // result
    result,
    setResult,
    updateItem,
    removeItem,
    // status
    status,
    setStatus,
    error,
    aiHint,
    fail,
    // photo
    photoPath,
    photoPreviewUrl,
    photoUploading,
    photoDropKey,
    uploadPhoto,
    removePhoto,
    resetPhoto,
    // voice
    recording,
    transcribing,
    startRecording,
    stopRecording,
  };
}
