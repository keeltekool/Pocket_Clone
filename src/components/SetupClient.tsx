"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Login } from "./Login";
import { GhostButton } from "./ui";

type Secrets = { shortcutKey: string; mcpToken: string };

// Set up saving (SPEC §4.4): iPhone Shortcut steps, the desktop bookmark button, the Claude Code connection.
// A Read surface in the app's own world: serif headings, a measured column, values set as data to copy.
export function SetupClient({ site, secrets: initial }: { site: string; secrets: Secrets | null }) {
  const [secrets, setSecrets] = useState(initial);
  if (!secrets) return <Login onAuthed={() => location.reload()} />;

  const saveUrl = `${site}/api/save`;
  const bookmarklet = `javascript:window.open('${site}/add?url='+encodeURIComponent(location.href),'pocket','width=420,height=260,popup')`;
  const mcpCommand = `claude mcp add --scope user --transport http pocket ${site}/api/mcp --header "Authorization: Bearer ${secrets.mcpToken}"`;
  const mcpShown = `claude mcp add --scope user --transport http pocket ${site}/api/mcp --header "Authorization: Bearer ••••••••"`;

  return (
    <div className="mx-auto max-w-page animate-main-in p-4 md:px-6 md:pt-6 md:pb-16">
      <header className="mb-6 flex items-center justify-between border-b border-cream-dark pt-2 pb-4 md:mb-10 md:pt-4 md:pb-10">
        <h1 className="font-display text-title-sm text-ink md:text-title">Set up saving</h1>
        <a href="/" className="rounded-sm px-2 py-1.5 text-small font-medium text-ink-muted transition-colors hover:bg-warm-white hover:text-ink md:px-4 md:py-2">
          ← All links
        </a>
      </header>

      <div className="flex flex-col gap-10 md:flex-row">
        <nav aria-label="Sections" className="hidden w-[220px] shrink-0 md:block xl:w-[260px]">
          <ol className="sticky top-6 flex flex-col">
            {[
              ["iphone", "iPhone"],
              ["desktop", "Desktop"],
              ["claude-code", "Claude Code"],
            ].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded-sm px-4 py-2 text-label text-ink-soft transition-colors hover:bg-terracotta-glow">
                  {label}
                </a>
              </li>
            ))}
          </ol>
          <p className="mt-6 px-4 text-micro text-ink-faint">Once per device. Nothing here changes how the list works.</p>
        </nav>

        <main className="flex min-w-0 max-w-[72ch] flex-1 flex-col gap-12">
          <Section id="iphone" title="iPhone — Share → Save to Pocket" lede="One Shortcut, built once in the Shortcuts app. After that every share sheet has Save to Pocket.">
            <ol className="flex list-decimal flex-col gap-4 pl-6 text-body text-ink">
              <li>
                Open <b>Shortcuts</b>, tap <b>+</b>, name it <Value>Save to Pocket</Value>.
              </li>
              <li>
                Tap <b>ⓘ</b> → turn on <b>Show in Share Sheet</b>; accept <b>URLs</b>, <b>Safari web pages</b> and <b>Text</b>.
              </li>
              <li>
                Add action <b>Get Contents of URL</b>:
                <ul className="mt-2 flex flex-col gap-2 pl-0">
                  <li className="flex flex-wrap items-center gap-2">
                    URL <Value id="save-url">{saveUrl}</Value> <Copy id="copy-save-url" text={saveUrl} />
                  </li>
                  <li>
                    Method <b>POST</b>
                  </li>
                  <li className="flex flex-wrap items-center gap-2">
                    Header <Value>x-api-key</Value> = <Value id="shortcut-key">{secrets.shortcutKey}</Value> <Copy id="copy-key" text={secrets.shortcutKey} />
                  </li>
                  <li>
                    Request Body <b>JSON</b>: key <Value>url</Value> = <b>Shortcut Input</b>
                  </li>
                </ul>
              </li>
              <li>
                Add <b>Get Dictionary Value</b> → key <Value>message</Value> from <b>Contents of URL</b>.
              </li>
              <li>
                Add <b>Show Notification</b> with <b>Dictionary Value</b>.
              </li>
              <li>
                Test: share any page → <b>Save to Pocket</b> → you see <Value>Saved #58</Value>.
              </li>
            </ol>
          </Section>

          <Section id="desktop" title="Desktop — bookmark button" lede="Drag this to your bookmarks bar. Click it on any page to save that page.">
            <Bookmarklet code={bookmarklet} />
            <p className="mt-3 text-small text-ink-muted">A small window reports <Value>Saved #58 · sorting…</Value> and closes itself. Logged out, it asks for the password first.</p>
          </Section>

          <Section id="claude-code" title="Claude Code" lede={`Connected as MCP server "pocket". In any Claude Code window, paste pocket #58 to pull a link.`}>
            <p className="mb-2 text-small text-ink-muted">To connect another machine, run this once (the token is hidden here; Copy gives the full command):</p>
            <div className="flex flex-col gap-2 md:flex-row md:items-start">
              <code id="mcp-command" className="block min-w-0 flex-1 overflow-x-auto rounded-md border border-cream-dark bg-warm-white px-4 py-3 font-mono text-meta text-ink-soft whitespace-pre">
                {mcpShown}
              </code>
              <Copy id="copy-mcp" text={mcpCommand} />
            </div>
          </Section>

          <p className="text-micro text-ink-faint">
            Signed in on this device.{" "}
            <button type="button" className="cursor-pointer underline-offset-2 hover:text-ink hover:underline" onClick={() => fetch("/api/auth", { method: "DELETE" }).then(() => setSecrets(null))}>
              Log out
            </button>
          </p>
        </main>
      </div>
    </div>
  );
}

function Section({ id, title, lede, children }: { id: string; title: string; lede: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="font-display text-heading text-ink">{title}</h2>
      <p className="mt-1 mb-5 text-lede text-ink-muted">{lede}</p>
      {children}
    </section>
  );
}

// A literal value the owner types or copies.
function Value({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <code id={id} className="rounded-sm border border-cream-dark bg-warm-white px-1.5 py-0.5 font-mono text-small text-ink break-all">
      {children}
    </code>
  );
}

function Copy({ id, text }: { id: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <GhostButton
      id={id}
      className="px-3 py-1 text-micro md:px-3 md:py-1"
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1_500);
      }}
    >
      {done ? "Copied" : "Copy"}
    </GhostButton>
  );
}

// The draggable bookmark. The href is set on the DOM node: React refuses javascript: URLs in JSX.
function Bookmarklet({ code }: { code: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("href", code);
  }, [code]);
  return (
    <a
      ref={ref}
      id="bookmarklet"
      draggable
      onClick={(e) => e.preventDefault()}
      title="Drag me to your bookmarks bar"
      className="inline-flex cursor-grab items-center gap-2 rounded-md bg-terracotta px-5 py-3 text-body font-semibold text-warm-white shadow-sm transition-all duration-200 hover:bg-terracotta-soft active:cursor-grabbing"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      Save to Pocket
    </a>
  );
}
