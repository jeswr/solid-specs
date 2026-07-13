<!-- AUTHORED-BY Claude Fable 5 — AI-assisted draft awaiting maintainer review -->

# Design decisions — a2a-rdf-extension

Recorded per the proceed-and-document rule: the drafting agent chose, the maintainer steers
after the fact. Sources were verified live on 2026-07-03 (A2A spec v1.0.0 pages,
`a2aproject/A2A@main` — `specification/a2a.proto`, `docs/topics/extensions.md`,
`docs/topics/extension-and-binding-governance.md`).

## D1 — Extension URI: `https://w3id.org/jeswr/a2a-rdf/v1`

A2A §4.6.3 recommends version-in-URI and requires a new URI for breaking changes. Official
A2A extensions use the `https://a2a-protocol.org/extensions/` prefix, but that prefix is
governance-gated (maintainer sponsorship → `experimental-ext-*` repo); we cannot mint under
it. The editor's `w3id.org/jeswr` home matches the sibling specs (`odrl-delegation`, the
`a2a#` vocabulary) and survives a repo move. The spec's Versioning section pre-declares the
migration path to an official URI on adoption. **Rejected:** the GitHub repo URL as the URI
(not stable across the governance lifecycle — the AGP sample does this and its URI would break
on promotion); minting under `a2a-protocol.org` (not ours to mint).

## D2 — Document format: ReSpec HTML, not a Markdown `spec.md`

A2A explicitly does **not** mandate an extension-spec format ("While the exact format is not
mandated, it should contain at least: …" — extensions.md). Their samples use Markdown, and the
required content list (URI, `params` schema, data-structure schemas, flows) is satisfied
either way. ReSpec HTML was chosen because (a) it is the house style of the sibling specs this
one composes with (AAC, the umbrella note) with working `localBiblio` cross-references,
(b) the normative-keyword and cross-reference tooling reduces spec-drafting errors, and
(c) the eventual A2A submission is a *proposal issue* with the draft attached/linked — the
governance process then reshapes it in the sponsored repo anyway ("to be reshaped to A2A's
extension conventions", per the outreach pack). A Markdown conversion at submission time is
mechanical; maintaining dual sources now would invite drift.

## D3 — Extension type: profile extension; no new methods, states, or core fields

Everything rides on published extension points: `Part.data`/`Part.text` + `Part.mediaType`
for payloads, `Part.metadata` for the extension's per-part keys, `Message.extensions` for
tagging, `AgentExtension.params` for card data, `A2A-Extensions` for activation. This respects
the §4.6 limitations (no core-structure changes, no new enum values) and keeps the extension
implementable purely in SDK middleware. **Rejected:** a method extension adding an
`UpgradeProtocol` RPC (heavier, needs SDK surface changes, and the handshake is semantically a
message exchange, not a control-plane call).

## D4 — Hashing: normatively RDFC-1.0, despite the reference codec differing

At drafting time, `@jeswr/solid-a2a` hashed a bespoke deterministic sorted-N-Quads form
(iterative blank-node refinement), not RDFC-1.0. The spec normatively requires RDFC-1.0
([rdf-canon], W3C Recommendation 2024-05-21) because a content hash only works if *independent*
implementations produce identical canonical bytes, and standardizing a bespoke canonicalization
when a W3C REC exists would be indefensible in A2A review. The codec gap was stated honestly in
the spec's implementation-status table as a tracked alignment work item on `solid-a2a`.
**Rejected:** speccing the codec's current algorithm (locks the ecosystem to one library's
internals); leaving canonicalization implementation-defined (defeats pinning entirely).

**Update (2026-07-07):** the alignment landed — `solid-a2a` 0.2.0 hashes
`ProtocolDocument.hash` over the RDFC-1.0 canonical N-Quads form via `rdf-canonize` (the W3C
reference implementation), closing the gap this decision recorded. The spec's
implementation-status table and `#pd-hashing` note are updated accordingly; this decision
record is left as the historical rationale for requiring RDFC-1.0 in the first place.

## D5 — Two-level `required` semantics kept distinct

A2A already gives `AgentExtension.required` card-level meaning (client must comply or be
rejected). The upgrade offer's `required` is per-exchange (this exchange must not be silently
downgraded). Conflating them (e.g. deriving exchange requiredness from the card) was rejected:
an agent typically speaks both casual and security-bearing routines, and the AGORA downgrade
rule is inherently per-exchange. The spec carries a table making the two scopes explicit.

## D6 — Error signalling via metadata code on the binding's standard error path

Extensions may not add enum values or fields to core structures, so no new error codes/states.
A namespaced metadata key (`…/v1/error`) with a small closed code set rides on the standard
JSON-RPC error / failed-task path. This mirrors how the spec's own extension guidance pushes
custom attributes into `metadata` maps.

## D7 — Authorization composes by reference; VP rides as its own Part

The intent graph is what gets SHACL-validated; the credential chain is presentation-layer
material with its own verification algorithm (AAC spec). Keeping them in separate Parts of the
same Message (an `authorization` part carrying a VC 2.0 Verifiable Presentation,
`application/vp` per the VC 2.0 REC's registered media types) lets the receiver's pipeline
validate shape and mandate independently and keeps this extension free of any normative
restatement of AAC/ODRL-delegation semantics. The one coupling rule: an intent's
`odrl:hasPolicy` reference, when present, must match the presented chain's `svc:policy`.

## D8 — Media types: `text/turtle` MUST, `application/ld+json` SHOULD

Matches the suite's RDF discipline (Turtle + JSON-LD only) and the reference codec's
serializers. `application/json` for the handshake objects keeps the handshake implementable by
a non-RDF A2A stack (the JSON form is the interop baseline; the RDF form is optional).

## D9 — Pre-declared PDs allow handshake skipping

`params.protocolDocuments` makes the Agent Card a standing offer: a client that already
implements a listed PD (same hash) may send a conforming intent directly. This is the
zero-round-trip path AGORA's economics point at; the mandatory pre-action validation and the
per-part `protocolHash` tag keep it safe. The handshake remains the path for negotiating
anything not card-listed.

## D10 — Related-work check

Searched `a2aproject/A2A` issues + discussions (2026-07-03): no existing RDF/SHACL extension
proposal. Nearest: issue #1577 (adopt ADMS/DCAT semantics in the *core* data model) — the spec
cites it as complementary; the eventual proposal should reference it rather than duplicate.

## D11 — LWS alignment: reference-composition, one discovery term, no normative change

Alignment with the JLWS clean-slate Linked Web Storage draft (`jeswr/lws-spec`; its
DECISIONS.md D21 / `docs/alignment/a2a-rdf.md` is the composition design). Verdict:
**reference, not capability** — a JLWS storage is the natural substrate for this
extension's documents (PDs, ODRL policies, AAC chains, PROV traces are ordinary byte-native
data resources), and nothing in either spec changes. The Relationship section gains one
informative paragraph stating (1) representation-stable pinning under the JLWS RDF Content
Transformation Profile's `rdf-1` graph-isomorphism contract (the protocol hash is over the
parsed graph, `#pd-hashing`, so an rdf-1-derived rendering pins identically), (2) the
`AgentInteractionService` extension-service term — minted HERE in the a2a-rdf namespace via
JLWS's extension-URI mechanism, so the JLWS core registry needs no edit — pointing a
storage at its controller's A2A Agent Card, and (3) that the fail-closed no-silent-downgrade
rule is independent of the storage's authentication posture (JLWS's Bearer baseline does not
weaken it: the hash is the trust anchor). Detail + vector homing in
`docs/lws-alignment.md`; the two pure-function vectors land in
`agentic-solid-conformance` `vectors/a2a-rdf/`, the server-surface discovery vector homes in
`lws-spec/test-vectors/` per the D21 homing rule (specified there; it rides the
config-gated storage-description entry, not this change). **Rejected:** a JLWS core capability term
for agent interaction (the extension-service mechanism already covers it; minting in the
JLWS registry would couple the substrate to an agent-layer spec).

## Verification notes

- AgentExtension schema (`uri`, `description`, `required`, `params`) confirmed from
  `specification/a2a.proto` (message `AgentExtension`, fields 1–4), not from secondary docs.
- `Message.extensions` (`repeated string`, field 7) and `Artifact.extensions` (field 6)
  confirmed from the same proto; `Part` is a `oneof {text, raw, url, data}` + `metadata`,
  `filename`, `media_type`.
- `A2A-Extensions` service-parameter mechanics + the request/response echo confirmed from
  spec §3.2.6/§4.6 and `docs/topics/extensions.md` (which also sources the four-type extension
  taxonomy, the data-only-shouldn't-be-required guidance, and the spec-content checklist).
- Governance lifecycle (proposal issue → sponsor → `experimental-ext-*` → `ext-*`) from
  `docs/topics/extension-and-binding-governance.md`.
- Every example payload in the spec (intent Turtle/JSON-LD, PD Turtle, offer/response JSON,
  the `conforms: true` validation) was generated by executing `@jeswr/solid-a2a@main` `dist/`.
  The example protocol hash (`sha256:4af1e70e…`) was computed **conformantly to the spec's
  RDFC-1.0 requirement** with an independent implementation (`rdf-canonize` 5.0.0,
  `algorithm: "RDFC-1.0"`) over the codec-built PD graph — deliberately NOT the codec's own
  `ProtocolDocument.hash` (`sha256:5662eb85…`), which uses the pre-RDFC canonicalization of D4
  and is non-conformant until the alignment lands (roborev caught an earlier draft using the
  codec hash in normatively-conformant examples; fixed).
- RDFC-1.0 status (W3C Recommendation, 2024-05-21) and VC 2.0 media types (`application/vc`,
  `application/vp`; REC 2025-05-15) verified against w3.org/TR.

## Follow-ups (tracked, not in this repo)

1. **LF A2A submission** — maintainer-gated (outreach pack
   `agentic-solid-vision/docs/outreach/04-lf-a2a.md`); the proposal issue per their governance.
2. ~~solid-a2a RDFC-1.0 alignment (D4)~~ — **done** (`solid-a2a` 0.2.0). Remaining: emitting the
   D1 `params` schema from `solid-agent-card`.
3. **w3id redirects** for `jeswr/a2a-rdf` and `jeswr/a2a#` — needs:user (w3id PR).
4. **Transport integration** — wire the codec into an A2A SDK runtime (the natural first
   joint work item if the proposal is sponsored).
5. Add this spec's row to the umbrella note's maturity table (flip the L5 cell from "not yet
   drafted" to "drafted, unsubmitted") — a one-line edit in `agentic-solid-note`.
