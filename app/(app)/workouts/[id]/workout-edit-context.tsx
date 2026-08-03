"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type EditCtx = {
  editing: boolean;
  setEditing: (e: boolean | ((prev: boolean) => boolean)) => void;
};

const Ctx = createContext<EditCtx>({
  editing: false,
  setEditing: () => {},
});

export function EditProvider({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  return <Ctx.Provider value={{ editing, setEditing }}>{children}</Ctx.Provider>;
}

export function useEdit() {
  return useContext(Ctx);
}
