"use client";
import { useState, type FormEvent } from "react";
import { Button, Checkbox, ErrorNote, TextField } from "./ui";

// SPEC §4.1: centred hero over a soft terracotta glow, password, "Remember this device", Unlock.
export function Login({ onAuthed, compact }: { onAuthed: () => void; compact?: boolean }) {
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, remember }),
      });
      if (!r.ok) {
        setError((await r.json().catch(() => ({}))).error || "Wrong password");
        return;
      }
      setPassword("");
      onAuthed();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`animate-auth-in bg-glow text-center ${compact ? "p-6" : "min-h-screen p-10"}`}>
      <h1 className={`mb-1 font-display text-ink text-shadow-glow ${compact ? "text-title" : "text-hero"}`}>Pocket Clone</h1>
      <p className={`text-lede text-ink-muted ${compact ? "mb-6" : "mb-10"}`}>Save links for later</p>
      <form id="auth-form" onSubmit={submit} className="mx-auto flex w-full max-w-form flex-col gap-4">
        <TextField
          id="password-input"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Checkbox id="remember-input" label="Remember this device for 180 days" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <Button id="auth-btn" type="submit" disabled={busy} className="w-full">
          Unlock
        </Button>
        {error && <ErrorNote id="auth-error">{error}</ErrorNote>}
      </form>
    </div>
  );
}
