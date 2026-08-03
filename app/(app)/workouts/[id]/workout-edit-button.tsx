"use client";

import { useT } from "@/lib/i18n/client";
import { useEdit } from "./workout-edit-context";

export function WorkoutEditButton() {
  const t = useT();
  const { editing, setEditing } = useEdit();
  return (
    <button
      type="button"
      onClick={() => setEditing((e) => !e)}
      className="btn btn--outline btn--sm"
    >
      {editing ? t("common.exitEdit") : t("common.edit")}
    </button>
  );
}
