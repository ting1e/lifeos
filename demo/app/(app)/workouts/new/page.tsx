"use client";

import { useDemoStore } from "@/lib/demo/store";
import { Card, CardLabel } from "@/components/ui/card";
import { NewWorkoutForm } from "./new-workout-form";

export default function NewWorkoutPage() {
  const { state } = useDemoStore();
  const progs = state.programs;

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">NEW SESSION</div>
        <h1 className="font-display text-5xl mt-1">start workout</h1>
      </header>
      <Card>
        <CardLabel>PROGRAM</CardLabel>
        <NewWorkoutForm programs={progs} />
      </Card>
    </div>
  );
}
