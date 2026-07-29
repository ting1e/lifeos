"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";

export type AiConfigInitial = {
  baseUrl: string;
  textModel: string;
  imageModel: string;
  audioModel: string;
  apiKeyMasked: string;
  hasKey: boolean;
};

export function AiConfigForm({ initial }: { initial: AiConfigInitial }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    baseUrl: initial.baseUrl,
    apiKey: "",
    textModel: initial.textModel,
    imageModel: initial.imageModel,
    audioModel: initial.audioModel,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/profile/ai-config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          baseUrl: form.baseUrl,
          apiKey: form.apiKey,
          textModel: form.textModel,
          imageModel: form.imageModel,
          audioModel: form.audioModel,
        }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5 mt-4">
      <div className="grid grid-cols-2 gap-6">
        <div className="col-span-2">
          <div className="mono-label mb-1">{t("prof.aiBaseUrl")}</div>
          <Input
            type="url"
            value={form.baseUrl}
            placeholder="https://api.openai.com/v1"
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          />
          <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-1">
            {t("prof.aiBaseUrlHint")}
          </div>
        </div>
        <div className="col-span-2">
          <div className="mono-label mb-1">{t("prof.aiApiKey")}</div>
          <Input
            type="password"
            value={form.apiKey}
            placeholder={initial.hasKey ? initial.apiKeyMasked : ""}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          />
          <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-1">
            {initial.hasKey ? t("prof.aiApiKeyKeep") : t("prof.aiModelsHint")}
          </div>
        </div>
        <div>
          <div className="mono-label mb-1">{t("prof.aiTextModel")}</div>
          <Input
            type="text"
            value={form.textModel}
            onChange={(e) => setForm({ ...form, textModel: e.target.value })}
          />
          <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-1">
            {t("prof.aiTextModelHint")}
          </div>
        </div>
        <div>
          <div className="mono-label mb-1">{t("prof.aiImageModel")}</div>
          <Input
            type="text"
            value={form.imageModel}
            onChange={(e) => setForm({ ...form, imageModel: e.target.value })}
          />
          <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-1">
            {t("prof.aiImageModelHint")}
          </div>
        </div>
        <div className="col-span-2">
          <div className="mono-label mb-1">{t("prof.aiAudioModel")}</div>
          <Input
            type="text"
            value={form.audioModel}
            onChange={(e) => setForm({ ...form, audioModel: e.target.value })}
          />
          <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-1">
            {t("prof.aiAudioModelHint")}
          </div>
        </div>
        <div className="col-span-2 font-mono text-[12px] text-[color:var(--text-disabled)]">
          {t("prof.aiModelsHint")}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? t("common.busy") : t("prof.save")}
        </Button>
      </div>
    </form>
  );
}
