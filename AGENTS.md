<!-- AUTHORED-BY Claude Fable 5 -->

# AGENTS.md — solid-specs

> A README for coding agents. `CLAUDE.md` is a symlink to this file. Inherits the suite-wide
> conventions (see `prod-solid-server/AGENTS.md`: namespace rule, provenance trailers,
> roborev flow, tracker rules, the PERSISTENT-ID RULE) and adds only what is specific here.

## What this is

The **@jeswr Solid specifications monorepo**: ReSpec drafts, informative Notes, normative
Turtle, and conformance vectors, consolidated from ~10 per-spec repos. Founding ADR:
[`decisions/0001-monorepo-architecture.md`](decisions/0001-monorepo-architecture.md)
(imported from `prod-solid-server/decisions/0022`, the ADR of record — see esp. §2b
inventory, §7.2 layout, §8 Phase 3s).

**Current state: Phase 0 — scaffold only, zero specs imported.** Spec imports happen in
Phase 3s of the ADR plan (history-preserving `git filter-repo` grafts), in parallel with the
`solid-sdk` bulk import but independent of it.

## The rules that differ from a package repo

1. **Documents, not artifacts.** Nothing here is npm-installed and nothing commits a
   `dist/`. There are no mirrors and no consumer pins — the whole mirror-publish machinery
   lives in `solid-sdk`, not here.
2. **Spec IRIs are hosting-independent.** Minted identifiers are served by the `jeswr.org`
   persistent-ID redirect layer (portfolio `config/persistent-ids.ts`); moving a spec's
   hosting means one small portfolio repoint, never a new IRI. Never PR w3id.org.
3. **Every spec dir carries a `STATUS.md`** naming its venue state (CG-draft /
   LF-submission-pending / experiment). The structural gate enforces `index.html` +
   `STATUS.md` per `specs/<name>/`.
4. **Extraction is first-class.** A venue adoption extracts the spec with
   `git filter-repo --subdirectory-filter specs/<name>` into the venue repo — consolidation
   must never read as a one-way door. Venue submissions themselves (CG new-work-items, LF
   proposals) stay maintainer-gated.
5. **Review audience differs.** roborev (codex / gpt-5.6-sol, min severity low) reviews
   every commit as usual, but normative-language changes also warrant a human-readable
   summary in the commit body — CG readers review prose, not diffs.
6. **Licensing:** the scaffold/tooling is MIT; each imported spec keeps the license it was
   authored under, checked in inside its own dir. (Some existing spec repos carry no
   LICENSE — resolve per spec at import; a licence pick is a maintainer call.)

## Gate

`pnpm run gate` = `check:structure` (scripts/check-structure.mjs, node:test-covered) +
`node --test scripts/` + recursive `--if-present` lint/typecheck/test/build over `tools/*`.
The root has ZERO npm dependencies by design; before adding ANY (e.g. a link-checker under
`tools/`), run `pnpm run check:packages <name>` (guardrails ported from prod-solid-server).
`.npmrc` pins `ignore-scripts=true`.

## Follow-ups tracked for later phases (not Phase 0)

Phase 3s wires: the single GitHub Pages deploy (`.github/workflows/pages.yml`, one
`/<spec>/` path per spec), per-spec persistent-ID repoints (portfolio PRs), and the
`agentic-solid-conformance` tooling repoint. A link-checker + ReSpec/HTML validator under
`tools/` joins the gate when the first spec lands.
