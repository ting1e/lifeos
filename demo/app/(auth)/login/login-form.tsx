"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error === "too_many_attempts" ? "Too many attempts" : "Invalid credentials");
      return;
    }
    startTransition(() => {
      router.replace(from);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="block font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] mb-2">
          email
        </label>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-3 font-body text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)] caret-[color:var(--accent)]"
        />
      </div>
      <div>
        <label className="block font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] mb-2">
          password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-3 font-body text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)] caret-[color:var(--accent)]"
        />
      </div>

      {error && (
        <div className="font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--accent)]">
          → {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[color:var(--accent)] text-white font-mono font-bold text-[14px] uppercase tracking-[0.12em] py-4 hover:opacity-90 transition disabled:opacity-40 min-h-[48px]"
      >
        {pending ? "..." : "ENTER →"}
      </button>
    </form>
  );
}
