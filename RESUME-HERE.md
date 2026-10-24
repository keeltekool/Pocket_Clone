# Pocket Clone — RESUME HERE

> Updated 24.10.2026 after the v2 build. The unattended build in `docs/plans/2026-10-24-pocket-clone-v2.md` is complete
> and live; do not restart it.

## State

- **Prod:** https://pocket-clone-virid.vercel.app runs **v2** (Next.js 16, fra1). Every phase gate and the finish review
  are answered in the plan and `docs/reviews/`. Prod proofs: `check-ui-flows` 40/40, `check-mcp` 9/9, `check-agent`
  (3 links filed in 6–9 s, $0.03–0.06 per sort), `claude mcp list` → `pocket ✔ Connected`.
- **Repo:** github.com/keeltekool/Pocket_Clone, branch `master`, tree clean after the final ship.
- **Read next:** `STACK.md` (stack, env, scripts, gotchas), `docs/SPEC.md` (what it does), the plan (what was built,
  deviations, review notes).

## Owner items

- [ ] Set up the iPhone Shortcut from https://pocket-clone-virid.vercel.app/setup (a few taps, once).
- [ ] Drop the old tables when convenient: `drop table v1_links; drop table v1_buckets;` (kept because the unattended
  run's classifier refused the drop).
- [ ] Optional: delete the unused Clerk application `better-ferret-13`.

## Settled decisions (do not re-ask)

Automatic sorting by a Managed Agent on Fable 5.1 through the app's MCP server; one long main list, buckets as filters;
no fit → Unsorted; the AI suggests buckets, the owner creates them; plain Move, no learning, no chips; `pocket #N` copy
+ MCP is a hard requirement; password gate, no accounts; the existing warm-paper design; v1 is the minimum
(SPEC §11 lists what is out).
