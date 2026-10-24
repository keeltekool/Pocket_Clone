import { cookies } from "next/headers";
import { SetupClient } from "@/components/SetupClient";
import { hasSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
const SITE = "https://pocket-clone-virid.vercel.app";

// Set up saving (SPEC §4.4). The Shortcut key and the Claude Code command (with the MCP token) are rendered only for
// the logged-in owner; logged out, the page is the login form.
export default async function SetupPage() {
  const authed = hasSession((await cookies()).toString());
  const secrets = authed ? { shortcutKey: process.env.SHORTCUT_API_KEY ?? "", mcpToken: process.env.MCP_TOKEN ?? "" } : null;
  return <SetupClient site={SITE} secrets={secrets} />;
}
