// Applies agent/sorter.md + the settings below to Claude Managed Agents (SPEC §7.3). Idempotent: creates what is
// missing, updates the rest, stores IDs (not secrets) in agent/ids.json.
//   npx tsx --env-file=.env.local scripts/agent-sync.mts
import Anthropic from "@anthropic-ai/sdk";
import type { AgentCreateParams } from "@anthropic-ai/sdk/resources/beta/agents/agents";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const client = new Anthropic();
const MCP_URL = "https://pocket-clone-virid.vercel.app/api/mcp";
const idsPath = new URL("../agent/ids.json", import.meta.url);
const ids: Record<string, string | number> = existsSync(idsPath) ? JSON.parse(readFileSync(idsPath, "utf8")) : {};
const save = () => writeFileSync(idsPath, JSON.stringify(ids, null, 2) + "\n");
if (!process.env.MCP_TOKEN) throw new Error("MCP_TOKEN missing in .env.local");

// 1. Environment: the agent uses no sandbox tools, so a plain cloud environment is enough.
if (!ids.environment_id) {
  const env = await client.beta.environments.create({ name: "pocket-env", config: { type: "cloud" } });
  ids.environment_id = env.id;
  console.log("environment created", env.id);
} else console.log("environment ok", ids.environment_id);
save();

// 2. Vault: the MCP bearer token. Anthropic injects it into calls to MCP_URL; the agent never sees it.
if (!ids.vault_id) {
  const vault = await client.beta.vaults.create({ display_name: "pocket-clone" });
  ids.vault_id = vault.id;
  console.log("vault created", vault.id);
}
if (!ids.credential_id) {
  const cred = await client.beta.vaults.credentials.create(String(ids.vault_id), {
    display_name: "pocket MCP bearer",
    auth: { type: "static_bearer", mcp_server_url: MCP_URL, token: process.env.MCP_TOKEN },
  });
  ids.credential_id = cred.id;
  console.log("credential created", cred.id, "for", MCP_URL);
} else {
  await client.beta.vaults.credentials.update(String(ids.credential_id), {
    vault_id: String(ids.vault_id),
    auth: { type: "static_bearer", token: process.env.MCP_TOKEN },
  });
  console.log("credential token refreshed", ids.credential_id);
}
save();

// 3. Agent: Fable 5.1, the sorting rules, only the pocket MCP toolset (always_allow: the default always_ask would stall
//    every unattended session on its first tool call).
const agentParams: AgentCreateParams = {
  name: "pocket-sorter",
  description: "Pocket Clone librarian: files each saved link into one of the owner's buckets through the pocket MCP server.",
  model: { id: "claude-fable-5-1", effort: "medium" },
  system: readFileSync(new URL("../agent/sorter.md", import.meta.url), "utf8"),
  mcp_servers: [{ type: "url", name: "pocket", url: MCP_URL }],
  tools: [
    { type: "agent_toolset_20260401", default_config: { enabled: false } },
    { type: "mcp_toolset", mcp_server_name: "pocket", default_config: { permission_policy: { type: "always_allow" } } },
  ],
};
if (!ids.agent_id) {
  const agent = await client.beta.agents.create(agentParams);
  Object.assign(ids, { agent_id: agent.id, agent_version: agent.version });
  console.log("agent created", agent.id, "v" + agent.version);
} else {
  const cur = await client.beta.agents.retrieve(String(ids.agent_id));
  const next = await client.beta.agents.update(String(ids.agent_id), { version: cur.version, ...agentParams });
  ids.agent_version = next.version;
  console.log(next.version === cur.version ? `agent unchanged v${next.version}` : `agent updated v${cur.version} → v${next.version}`);
}
save();
console.log("ids →", JSON.stringify(ids));
