<!-- AUTHORED-BY Claude Fable 5 -->

# Design decisions — the Agentic Solid umbrella note

Proceed-and-document record (maintainer steers after the fact). Drafted 2026-07-03 by Claude
Fable 5.

## D1 — A map, not a spec: the note is wholly informative

The note defines **zero** normative requirements, mints no terms, and has no RFC 2119 language
of its own. Every requirement lives in a component specification; the note's `id="conformance-profiles"`
section (deliberately *not* `id="conformance"`, so ReSpec injects no normative-conformance
boilerplate) defines *named bundles of component-spec conformance* only. Rationale: (a) an
umbrella that re-states requirements will drift from its components — the same
single-home rule the suite applies to docs; (b) W3C group Notes are conventionally informative;
(c) it keeps the CG-contribution ask small: adopting the map commits the group to nothing
normative. `noRecTrack: true` is set in the ReSpec config to make the non-Rec-track intent
machine-readable.

## D2 — Six layers + federation as a cross-cutting plane, not a seventh layer

The layer list follows the brief exactly (identity → access-control → policy → credential →
agent-comms → accountability). Federations are presented as a *plane* because they genuinely
touch several layers at once (self-description read at consent/discovery time; membership
credentials issued with the L4 machinery; sector shapes governing the data plane; spec-version
advertisement on servers) — forcing them into a stack position would misstate the dependency
structure the vision paper's own five-layer diagram already simplifies. The `fut:` futures
sector is cited as the worked example of the repeatable sector pattern (a new domain onboards
with no federation-machinery changes).

## D3 — Staged conformance profiles AS-0…AS-4, by role

"Agentic-Solid conformant" is framed as *stage × role* (server / principal tooling / agent /
verifier / registry), cumulative, defined purely by reference:

- **AS-0** = exactly today's Solid (Protocol + WAC/ACP + Solid-OIDC + DPoP; AC-SPARQL an
  orthogonal server capability). Making AS-0 *identical* to existing Solid is what makes
  "extends, does not replace" a checkable claim rather than a slogan: every conforming Solid
  server is already AS-0.
- **AS-1** = + PROV attribution + Data Integrity proofs.
- **AS-2** = + AgentAuthorizationCredential + ODRL delegation profile + the four-phase
  fail-closed verification — the stage at which the accountability thesis holds in full.
- **AS-3** = + discovery descriptors + hash-pinned SHACL protocol documents
  (no-silent-downgrade). Honestly flagged as resting on implementation-defined conventions
  until the A2A-extension / CG contributions land.
- **AS-4** = + federation self-description, registry-asserted membership, VC-backed trust,
  spec-version advertisement.

Alternative considered: a flat "implements specs {A,B,C}" checklist. Rejected — it hides the
deployment reality that the base is adoptable today while upper stages mature at different
rates, and it gives standards bodies no incremental adoption story.

## D4 — Solid CG shape (`group: "cg/solid"`), unofficial-ED SOTD

The umbrella's eventual home is the Solid CG (adoption roadmap §3 item 6); the AAC note stays
CCG-shaped, the delegation profile targets the ODRL CG — the umbrella does not re-home them, it
points at them. The SOTD mirrors the sibling `agent-authz-credential-spec` pattern verbatim in
structure: unofficial, not adopted, not standards-track, AI-assist disclosure naming Claude
Fable 5, plus an explicit "entirely informative" statement (D1).

## D5 — The accountability thesis stated once, as four properties + one boundary

The differentiator is stated in a single blockquote, then decomposed into the four mechanically
checkable properties (attributable / authorized / bounded-and-revocable / verifiable-offline),
each attributed to its supplying layer. The **accountability-not-prevention** boundary (and the
anti-DRM rationale) is stated in the thesis section *once*, sourced from paper §4 and the
runtime design §5, and elsewhere only referenced — repeating a caveat weakens it and invites
drift.

## D6 — Maturity table statuses and evidence discipline

Five status vocabulary values: **External base / Standard** (someone else's finished spec),
**Drafted** (our ED written, not contributed), **Implemented (experimental)** (names the repo),
**Partially implemented** (names the gap — e.g. the four-phase verifier = AAR gap G7),
**Design-only / Proposed / Not implemented**. Every row was verified against the working trees
on 2026-07-03; the branch-pending state of the delegation profile (`feat/delegation-profile @
18df183`, unmerged) and the not-yet-live AC-SPARQL endpoint are stated rather than smoothed
over. The table also names the two ecosystem-level absences (independent federation operators;
ZK selective disclosure) and the fact that *no* component is an adopted work item anywhere yet.

## D7 — Links to sibling repos use their canonical future GitHub URLs

`agentic-solid-vision`, `agent-authz-credential-spec`, and `accountable-agent-runtime` are
local-only at drafting time (publication is orchestrator/maintainer-gated). The note links
their `github.com/jeswr/…` URLs anyway — the same convention those siblings already use for
each other — and their localBiblio `status` fields say "pending publication" where true.
Follow-up: drop the qualifiers once published.

## D8 — MCP is an edge note inside L5, not a layer

MCP is the tool seam between an LLM host and a pod — host-to-resource, not agent-to-agent — so
it gets one sentence locating it, not a stack position. Same treatment as in the vision paper
(§3.3 "the pragmatic edges").

## D9 — Security/privacy sections are meta + composition-only

Per the brief: each component keeps its own analysis; the umbrella indexes them and adds only
what emerges from composition — layer conflation (the characteristic composed failure),
trust-anchoring-precedes-evaluation, unavailability-resolves-closed as a composition invariant
("only as fail-closed as the most fail-open member"), the NL edge as an injection surface kept
outside the authority path, SSRF on discovery fetches, and (privacy) the accountability trail
itself being access-controlled personal data, mandate correlatability, and
discovery-as-advertisement.

## D10 — No new namespace, no new terms

The umbrella mints nothing. Where the ecosystem still needs vocabulary (e.g. a future
machine-readable conformance-profile vocabulary), that belongs in a component spec, minted when
a second consumer exists — the same premature-standardisation discipline the federation
vocabularies follow.

## D11 — LWS as a second substrate: an unnumbered band, not a new layer

Alignment with the JLWS clean-slate Linked Web Storage draft (`jeswr/lws-spec`; its
DECISIONS.md D21 / `docs/alignment/agentic-solid-note.md` is the composition design).
Verdict: **reference** — the Note gains an unnumbered SUBSTRATE band beneath L1 in the
layer diagram (the Solid Protocol pod today; Linked Web Storage as it standardises), a
substrate-portability bullet in the Relationship section (JLWS composes the same layers
over the LWS WG direction: the RDF Content Transformation opt-in restores RDF-readable
resources + sketches Solid-on-JLWS; strict-ODRL access grants are the L3 model; the
reserved `SparqlQueryService` is the L2 read interface), one honest maturity row, and the
`[[JLWS]]` biblio entry. The band is deliberately UNNUMBERED and the AS-x ladder is
untouched: AS-0 stays exactly Solid Protocol + WAC/ACP + Solid-OIDC, and the substrate is
presented as the base the architecture extends, not a component of it — renumbering the
layers (an "L0") would ripple through every component spec that cites Lx names and
falsely imply the substrate is part of this architecture's conformance story.
**Rejected:** redefining AS-0 to admit either base (kills the ladder's precision);
leaving LWS named only in the venue bullet (readers kept asking where storage sits in
the diagram — the map should answer its own most-asked question). Composition record:
`docs/lws-alignment.md`.
