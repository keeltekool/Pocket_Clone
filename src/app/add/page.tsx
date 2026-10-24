import { cookies } from "next/headers";
import { AddClient } from "@/components/AddClient";
import { hasSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Bookmarklet window (SPEC §4.3): /add?url=… saves and closes itself; logged out shows the login form first.
export default async function AddPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { url = "" } = await searchParams;
  return <AddClient authed={hasSession((await cookies()).toString())} url={url} />;
}
