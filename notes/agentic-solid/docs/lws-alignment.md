<!-- AUTHORED-BY Claude Fable 5 -->

# LWS alignment — the Note's substrate story

**Substrate:** [JLWS — Linked Web Storage, clean-slate editor's draft](https://github.com/jeswr/lws-spec)
(core `index.html` + the RDF Content Transformation Profile `rdf-transform.html`). The
composition design this document lands is the sibling half of
`lws-spec/docs/alignment/agentic-solid-note.md` (JLWS DECISIONS.md D21).

## Verdict: the Note REFERENCES LWS; the stack is substrate-portable

The Note is wholly informative — it mints nothing and specifies nothing (its own SOTD).
It already named the W3C Linked Web Storage WG as "the base's standards-track home"
(Relationship section, final bullet). The alignment adds JLWS as a **second concrete
substrate under the same six layers**, not as a new layer: everything above L2 (ODRL
delegation, AAC, agent cards/A2A, PROV accountability) is substrate-agnostic pod content
plus client/verifier logic, and the Note's own thesis — "Nothing requires pods to change
shape. Credentials, policies, protocol documents, and traces are ordinary pod resources
under ordinary access control" — holds verbatim over a JLWS storage.

The substrate model matters for one clarification the Note now carries: **LWS is a
byte-native web-storage substrate that does not handle RDF natively** — RDF support is an
advertised opt-in in the storage description (the JLWS RDF Content Transformation Profile:
a `ContentNegotiation` capability with `profile: …/transform/rdf-1` + a matching
`conformsTo`). That is exactly why the substrate can swap without the layers noticing:
the layers consume documents (credentials, policies, PDs, traces), not storage semantics.

## The edits this alignment made (all informative)

1. **Layer diagram + architecture intro** — an unnumbered SUBSTRATE band beneath L1
   naming the base the stack sits on: the Solid Protocol pod today, Linked Web Storage
   ([[LWS-WG]] direction; [[JLWS]] clean-slate composition) as it standardises. Unnumbered
   deliberately: the substrate is not a component of this architecture but the base it
   extends, so the AS-0…AS-4 conformance ladder keeps its precision (AS-0 stays exactly
   Solid Protocol + WAC/ACP + Solid-OIDC; the JLWS base is a parallel substrate, not a
   redefined AS-0).
2. **Relationship section** — a substrate-portability bullet: JLWS composes the same
   layers over the LWS WG's protocol direction; its RDF Content Transformation profile
   restores RDF-readable resources and sketches the Solid-on-JLWS mapping (WebID → CID
   subject; `solid:oidcIssuer` → `jlws:OpenIdProvider`; WAC/ACP → ODRL grants); its
   access layer is already the strict-ODRL model L3 builds on; the L2 read interface
   ([[SOLID-SPARQL-QUERY]]) is its reserved `SparqlQueryService`.
3. **Maturity table** — one honest JLWS row (drafted, public, personal editor's draft;
   flag-gated experimental implementation on `jeswr/solid-server-rs` `feat/lws`; a
   125-case spec-derived vector suite in the draft's repository; nothing merged or
   deployed; the LWS WG remains the standards-track home).
4. **Biblio** — the `[[JLWS]]` localBiblio entry.

## No conformance vectors

The Note has no conformance surface (its SOTD says so); the agentic-solid-conformance
suites vector its *components*. The LWS-composition coverage lives in the component
suites: pure-function cases in `agentic-solid-conformance` (`vectors/a2a-rdf/`
representation-stable pinning), server-surface cases in `lws-spec/test-vectors/` — per
the homing rule of `lws-spec/docs/alignment/conformance-vectors.md`.
