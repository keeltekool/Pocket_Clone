"use client";
import { useState } from "react";
import { Login } from "./Login";
import { Main, type InitialData } from "./Main";
import type { View } from "./types";

// Logged out → the login form in place; a successful login reloads so the server renders the list with fresh data.
// A 401 mid-use flips back to the form (SPEC §6.9).
export function Shell({ authed: initialAuthed, initial, view }: { authed: boolean; initial: InitialData | null; view: View }) {
  const [authed, setAuthed] = useState(initialAuthed);
  if (!authed || !initial) return <Login onAuthed={() => location.reload()} />;
  return <Main initial={initial} initialView={view} onExpired={() => setAuthed(false)} />;
}
