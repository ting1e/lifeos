"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";

export type ModalityInitial = {
  baseUrl: string;
  model: string;
  reasoning: string;
  maxTokens: string;
  apiKeyMasked: string;
  hasKey: boolean;
};

export type AiConfigInitial = {
  text: ModalityInitial;
  image: ModalityInitial;
  audio: ModalityInitial;
};

type SectionState = {
  baseUrl: string;
  apiKey: string;
  model: string;
  reasoning: string;
  maxTokens: string;
};

function toState(m: ModalityInitial): SectionState {
  return {
    baseUrl: m.baseUrl,
    apiKey: "",
    model: m.model,
    reasoning: m.reasoning,
    maxTokens: m.maxTokens,
  };
}

function parseMaxTokens(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function AiConfigForm({ initial }: { initial: AiConfigInitial }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<SectionState>(() => toState(initial.text));
  const [image, setImage] = useState<SectionState>(() => toState(initial.image));
  const [audio, setAudio] = useState<SectionState>(() => toState(initial.audio));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        // text = global connection
        baseUrl: text.baseUrl,
        textModel: text.model,
        textReasoning: text.reasoning,
        textMaxTokens: parseMaxTokens(text.maxTokens),
        imageBaseUrl: image.baseUrl,
        imageModel: image.model,
        imageReasoning: image.reasoning,
        imageMaxTokens: parseMaxTokens(image.maxTokens),
        audioBaseUrl: audio.baseUrl,
        audioModel: audio.model,
        audioReasoning: audio.reasoning,
        audioMaxTokens: parseMaxTokens(audio.maxTokens),
      };
      if (text.apiKey.trim()) body.apiKey = text.apiKey.trim();
      if (image.apiKey.trim()) body.imageApiKey = image.apiKey.trim();
      if (audio.apiKey.trim()) body.audioApiKey = audio.apiKey.trim();
      const r = await fetch("/api/profile/ai-config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        setError(t("prof.aiSaveError"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("prof.aiSaveError"));
    } finally {
      setBusy(false);
    }
  }

  function section(
    title: string,
    titleHint: string,
    state: SectionState,
    setState: (s: SectionState) => void,
    init: ModalityInitial,
    inherit: boolean,
  ) {
    const keyHint = inherit
      ? init.hasKey
        ? t("prof.aiApiKeyKeep")
        : t("prof.aiInheritHint")
      : init.hasKey
        ? t("prof.aiApiKeyKeep")
        : t("prof.aiModelsHint");
    return (
      <div className="border border-[color:var(--border-visible)] p-4 space-y-4">
        <div>
          <div className="mono-label">{title}</div>
          <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-1">
            {titleHint}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <div className="mono-label mb-1">{t("prof.aiBaseUrl")}</div>
            <Input
              type="url"
              value={state.baseUrl}
              placeholder="https://api.openai.com/v1"
              onChange={(e) => setState({ ...state, baseUrl: e.target.value })}
            />
            {inherit && (
              <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-1">
                {t("prof.aiInheritHint")}
              </div>
            )}
          </div>
          <div className="col-span-2">
            <div className="mono-label mb-1">{t("prof.aiApiKey")}</div>
            <Input
              type="text"
              value={state.apiKey}
              placeholder={init.hasKey ? init.apiKeyMasked : ""}
              onChange={(e) => setState({ ...state, apiKey: e.target.value })}
            />
            <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-1">
              {keyHint}
            </div>
          </div>
          <div className="col-span-2">
            <div className="mono-label mb-1">{t("prof.aiModel")}</div>
            <Input
              type="text"
              value={state.model}
              onChange={(e) => setState({ ...state, model: e.target.value })}
            />
          </div>
          <div>
            <div className="mono-label mb-1">{t("prof.aiReasoning")}</div>
            <Input
              type="text"
              value={state.reasoning}
              placeholder="low / medium / high"
              onChange={(e) => setState({ ...state, reasoning: e.target.value })}
            />
          </div>
          <div>
            <div className="mono-label mb-1">{t("prof.aiMaxTokens")}</div>
            <Input
              type="number"
              min={1}
              value={state.maxTokens}
              placeholder="—"
              onChange={(e) => setState({ ...state, maxTokens: e.target.value })}
            />
          </div>
          <div className="col-span-2 font-mono text-[12px] text-[color:var(--text-disabled)]">
            {t("prof.aiReasoningHint")}
          </div>
          <div className="col-span-2 font-mono text-[12px] text-[color:var(--text-disabled)]">
            {t("prof.aiMaxTokensHint")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-4 mt-4">
      {section(t("prof.aiTextModel"), t("prof.aiTextModelHint"), text, setText, initial.text, false)}
      {section(t("prof.aiImageModel"), t("prof.aiImageModelHint"), image, setImage, initial.image, true)}
      {section(t("prof.aiAudioModel"), t("prof.aiAudioModelHint"), audio, setAudio, initial.audio, true)}
      {error && (
        <div className="font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--accent)]">
          → {error}
        </div>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? t("common.busy") : t("prof.save")}
        </Button>
      </div>
    </form>
  );
}
