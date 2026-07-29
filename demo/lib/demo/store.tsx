"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { buildSeed, generateId, type DemoState, DEMO_USER_ID } from "./seed";

const STORAGE_KEY = "lifeos-demo-state-v2";

type Updater =
  | Partial<DemoState>
  | ((prev: DemoState) => Partial<DemoState>);

type DemoStore = {
  state: DemoState;
  update: (u: Updater) => void;
  reset: () => void;
  ready: boolean;
};

const DemoStoreContext = createContext<DemoStore | null>(null);

/**
 * Revive Date instances and BigInt-like fields. We serialize as JSON which
 * loses Date types — reconstitute them so the rest of the app's
 * `new Date(x.startedAt)` calls work uniformly.
 */
function reviveDates(value: unknown, key?: string): unknown {
  // Field names that should be Date instances after parse.
  const DATE_KEYS = new Set([
    "createdAt",
    "updatedAt",
    "consumedAt",
    "recordedAt",
    "startedAt",
    "endedAt",
    "completedAt",
    "start",
    "end",
  ]);
  if (typeof value === "string") {
    if (key && DATE_KEYS.has(key) && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => reviveDates(v));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = reviveDates(v, k);
    }
    return out;
  }
  return value;
}

function loadFromStorage(): DemoState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return reviveDates(parsed) as DemoState;
  } catch {
    return null;
  }
}

function saveToStorage(state: DemoState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota / private mode — silently skip
  }
}

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  // We render nothing during SSR / first client render. After mount we build
  // the seed (using current time), then overlay any persisted state from
  // localStorage. This avoids two problems:
  //   1. SSR/CSR mismatch: `new Date()` in the seed differs between the build
  //      machine and the visitor's browser.
  //   2. Stale localStorage from earlier deploys with a different shape.
  const [state, setState] = useState<DemoState | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const seed = buildSeed();
    const stored = loadFromStorage();
    // Adopt stored state only if its shape matches the current schema —
    // require all top-level keys we expect. Otherwise fall back to seed.
    if (
      stored &&
      stored.profile &&
      Array.isArray(stored.workouts) &&
      Array.isArray(stored.foodEntries) &&
      Array.isArray(stored.workoutSets) &&
      Array.isArray(stored.exercises) &&
      Array.isArray(stored.whoopRecovery) &&
      typeof stored.whoopEnabled === "boolean"
    ) {
      setState(stored);
    } else {
      setState(seed);
    }
  }, []);

  // Persist on every change once we have state.
  useEffect(() => {
    if (!state) return;
    saveToStorage(state);
  }, [state]);

  const update = useCallback<DemoStore["update"]>((u) => {
    setState((prev) => {
      if (!prev) return prev;
      const patch = typeof u === "function" ? u(prev) : u;
      return { ...prev, ...patch };
    });
  }, []);

  const reset = useCallback(() => {
    const fresh = buildSeed();
    setState(fresh);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const ready = state !== null;
  const value = useMemo<DemoStore>(
    () => ({ state: state ?? ({} as DemoState), update, reset, ready }),
    [state, update, reset, ready],
  );

  // Until the store is hydrated client-side, render a minimal placeholder
  // (matches the empty SSR output so React hydration never sees a mismatch).
  if (!ready) {
    return (
      <DemoStoreContext.Provider value={value}>
        <div
          aria-hidden
          style={{ minHeight: "100vh", background: "var(--black)" }}
        />
      </DemoStoreContext.Provider>
    );
  }

  return (
    <DemoStoreContext.Provider value={value}>
      {children}
    </DemoStoreContext.Provider>
  );
}

export function useDemoStore(): DemoStore {
  const ctx = useContext(DemoStoreContext);
  if (!ctx) {
    throw new Error("useDemoStore must be used inside <DemoStoreProvider>");
  }
  return ctx;
}

export { generateId, DEMO_USER_ID };
