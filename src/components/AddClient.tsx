"use client";
import { useCallback, useEffect, useState } from "react";
import { domainOf } from "@/lib/format";
import { Login } from "./Login";
import { cardLabel, type Card } from "./types";
import { GhostButton } from "./ui";

type State = { kind: "saving" } | { kind: "done"; text: string; closeIn: number } | { kind: "failed"; text: string };

// SPEC §4.3: Saved #58 · sorting… (closes in 1.5 s) · Already saved as #57 · Jobs (2.5 s) · Couldn't save (Retry).
export function AddClient({ authed: initialAuthed, url }: { authed: boolean; url: string }) {
  const [authed, setAuthed] = useState(initialAuthed);
  const [state, setState] = useState<State>({ kind: "saving" });
  let domain = "";
  try {
    domain = domainOf(url);
  } catch {}

  const save = useCallback(async () => {
    setState({ kind: "saving" });
    try {
      const r = await fetch("/api/items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      if (r.status === 401) return setAuthed(false);
      const body = await r.json().catch(() => ({}));
      if (r.status === 400) return setState({ kind: "failed", text: body.error || "That doesn't look like a link." });
      if (!r.ok) throw new Error();
      const item: Card = body.item;
      if (body.duplicate) setState({ kind: "done", text: `Already saved as #${item.number} · ${cardLabel(item)}`, closeIn: 2_500 });
      else setState({ kind: "done", text: `Saved #${item.number} · sorting…`, closeIn: 1_500 });
    } catch {
      setState({ kind: "failed", text: "Couldn't save. Try again." });
    }
  }, [url]);

  useEffect(() => {
    if (authed) void save();
  }, [authed, save]);

  useEffect(() => {
    if (state.kind !== "done") return;
    const t = setTimeout(() => window.close(), state.closeIn);
    return () => clearTimeout(t);
  }, [state]);

  if (!authed) return <Login compact onAuthed={() => setAuthed(true)} />;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-glow p-6 text-center">
      <h1 className="font-display text-title-sm text-ink">Pocket Clone</h1>
      <p id="add-status" className="text-lede text-ink-soft">
        {state.kind === "saving" ? "Saving…" : state.text}
      </p>
      {domain && <p className="text-meta font-medium lowercase text-ink-muted">{domain}</p>}
      {state.kind === "failed" && (
        <GhostButton id="add-retry" onClick={() => void save()} className="mt-2">
          Retry
        </GhostButton>
      )}
    </div>
  );
}
