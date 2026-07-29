"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDemoStore, generateId, DEMO_USER_ID } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewProgramForm() {
  const t = useT();
  const router = useRouter();
  const { update } = useDemoStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const id = generateId();
      update((prev) => ({
        programs: [
          ...prev.programs,
          {
            id,
            userId: DEMO_USER_ID,
            name,
            description: description || null,
            isTemplate: false,
            createdAt: new Date(),
          },
        ],
      }));
      router.push(`/programs/${id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <div className="mono-label mb-1">{t("prog.nameLabel")}</div>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <div className="mono-label mb-1">{t("prog.descriptionLabel")}</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-2 font-body text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)] resize-none"
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? t("common.busy") : t("common.createButton")}
        </Button>
      </div>
    </form>
  );
}
