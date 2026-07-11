# solid-specs

The **@jeswr Solid specifications monorepo** — the single home for the suite's agent-authored
specification documents: ReSpec drafts, informative Notes, normative Turtle, and conformance
test vectors.

**Status: Phase 0 (scaffold).** No spec has been imported yet. The full design, inventory,
and phased migration plan live in
[`decisions/0001-monorepo-architecture.md`](decisions/0001-monorepo-architecture.md).

## Layout

| Path | Contents |
|---|---|
| `specs/<name>/` | One ReSpec spec per dir — `index.html` + `STATUS.md` (venue state: CG-draft / LF-submission-pending / experiment) |
| `notes/<name>/` | Informative Notes (e.g. the umbrella "Agentic Solid" map) |
| `conformance/<name>/` | Golden test vectors (JSON + Turtle) + gap catalogues |
| `tools/` | Validator/companion tooling (a small pnpm workspace) |
| `scripts/` | The structural gate (`pnpm run check:structure`) |

## Invariants

- **Spec IRIs never move with hosting.** Every minted identifier is served through the
  `jeswr.org` persistent-ID redirect layer (`jeswr.org/spec/*`, `jeswr.org/ns/*`), so
  consolidating repos changes only the Pages path behind a redirect — never a citation URL.
- **Consolidation is not a one-way door.** When a venue (Solid CG, LF) adopts a spec, it is
  extracted with `git filter-repo --subdirectory-filter specs/<name>` into the venue's repo,
  history intact.
- **Gate:** `pnpm run gate` — structural check (every spec dir carries `index.html` +
  `STATUS.md`) + the tooling suites. roborev reviews every commit.

Imported specs keep the license they were authored under (checked in per spec dir); the
repo scaffold and tooling are MIT.
