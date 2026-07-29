"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function GeneratePlanForm() {
  const [days, setDays] = useState("7");
  const [status, setStatus] = useState<string | null>(null);

  function gen() {
    setStatus(
      "Demo: meal-plan generation runs Claude Sonnet via fal.ai in the self-hosted version. github.com/egebese/lifeos",
    );
  }

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-end gap-3">
        <div>
          <div className="mono-label mb-1">DAYS</div>
          <Select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
          </Select>
        </div>
        <Button onClick={gen} variant="accent">
          GENERATE →
        </Button>
      </div>
      {status && (
        <div className="font-mono text-[13px] text-[color:var(--text-secondary)] uppercase tracking-[0.06em]">
          → {status}
        </div>
      )}
      <div className="font-mono text-[13px] text-[color:var(--text-disabled)]">
        Uses profile goal + preferences + pantry. Sonnet 4.6 via fal openrouter.
      </div>
    </div>
  );
}
