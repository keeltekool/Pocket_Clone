# Pocket Clone — RESUME HERE

> Updated 24.10.2026 after the v2.1 build (Reader + Favourite). Both builds are complete and live; do not restart them.

## State

- **Prod:** https://pocket-clone-virid.vercel.app runs **v2** (Next.js 16, fra1). Every phase gate and the finish review
  are answered in the plan and `docs/reviews/`. Prod proofs: `check-ui-flows` 40/40, `check-mcp` 9/9, `check-agent`
  (3 links filed in 6–9 s, $0.03–0.06 per sort), `claude mcp list` → `pocket ✔ Connected`.
- **Repo:** github.com/keeltekool/Pocket_Clone, branch `master`, tree clean after the final ship.
- **Read next:** `STACK.md` (stack, env, scripts, gotchas), `docs/SPEC.md` (what it does), the plan (what was built,
  deviations, review notes).

## v2.1 shipped (24.10.2026, late evening): Reader view + Favourite

Built from `docs/SPEC.md` (v2.1 sections) and `docs/plans/2026-10-24-reader-favourite.md` (all tasks ticked, both gate
reviews and the finish review `docs/reviews/2026-10-24-2215-finish.md` answered). Live as 627942a, deployment
`dpl_91rurCbchJ6tQ9ze8HLqRHewnc44`; prod proofs: `ship.mjs` PASS (verify-deploy 375 + 1440, `check-ui-flows` 55/55 with
the real agent), `check-mcp` 10/10 on prod. Do not restart it.

Next feature: not picked yet; the ranked list is `docs/research/2026-10-24-raindrop-next-features.md`. Unverified on a
real device: Back from the Reader on iPhone Safari (back/forward cache restore → the list reloads; simulated in the flows).

## Owner items

- [ ] Set up the iPhone Shortcut from https://pocket-clone-virid.vercel.app/setup (a few taps, once).
- [ ] Drop the old tables: `drop table v1_links; drop table v1_buckets;` — the permission classifier refused the drop
  twice (24.10, also on the owner's explicit go), so it has to be run by hand (Neon SQL editor or `neonctl psql`).
- [ ] Optional: delete the unused Clerk application `better-ferret-13` (the live-browser connection was not available
  when tried on 24.10).

## Settled decisions (do not re-ask)

Automatic sorting by a Managed Agent on Fable 5.1 through the app's MCP server; one long main list, buckets as filters;
no fit → Unsorted; the AI suggests buckets, the owner creates them; plain Move, no learning, no chips; `pocket #N` copy
+ MCP is a hard requirement; password gate, no accounts; the existing warm-paper design; v1 is the minimum
(SPEC §11 lists what is out).
