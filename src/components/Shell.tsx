"use client";
import { useState } from "react";
import { Login } from "./Login";
import { Main, type InitialData } from "./Main";
import type { View } from "./types";

// Logged out → the login form in place; logged in → the app. A 401 mid-use flips back (SPEC §6.9).
export function Shell({ authed: initialAuthed, initial, view }: { authed: boolean; initial: InitialData | null; view: View }) {
  const [authed, setAuthed] = useState(initialAuthed);
  if (!authed) return <Login onAuthed={() => setAuthed(true)} />;
  return <Main initial={initialAuthed ? initial : null} initialView={view} onExpired={() => setAuthed(false)} />;
}
