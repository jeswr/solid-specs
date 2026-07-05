<!-- AUTHORED-BY Claude Fable 5 -->

# LWS alignment — how this extension composes on the JLWS substrate

**Substrate:** [JLWS — Linked Web Storage, clean-slate editor's draft](https://github.com/jeswr/lws-spec)
(`index.html`, the core) + its [RDF Content Transformation Profile](https://github.com/jeswr/lws-spec/blob/main/rdf-transform.html)
(`rdf-transform.html`). The composition design this document lands is the sibling half of
`lws-spec/docs/alignment/a2a-rdf.md` (JLWS DECISIONS.md D21); the spec edit itself is the
"Linked Web Storage (JLWS)" paragraph in this spec's *Relationship to other documents*
section.

## Verdict: an independent agent layer that REFERENCES LWS as its document substrate

This extension is an **agent-to-agent protocol** extension, declared in an A2A Agent Card
and negotiated per exchange (`#declaration`, `#handshake`) — a storage server never speaks
it. Every touchpoint with a storage is **document hosting**: Protocol Documents are
dereferenceable HTTPS resources pinned by hash (`#pd-model`, `#pd-hashing`), and the ODRL
policies + Agent Authorization Credential chains it binds by reference (`#authorization`)
are ordinary pod resources under ordinary access control. LWS deliberately makes storage a
**byte-native substrate that does not handle RDF natively** (JLWS core, *Resource model*;
RDF support is an advertised opt-in) — which suits this extension exactly, because nothing in
it requires the storage to understand the documents it hosts.

## 1. Byte-native PD hosting + the RDF-transform opt-in

- A Protocol Document stored on a JLWS storage is a plain data resource: the stored bytes
  are authoritative ([JLWS-RDF-TRANSFORM] *Authoritative bytes, entity-tags, and
  preconditions*: "the byte stream accepted at write time is the resource's authoritative
  representation").
- When the storage advertises the RDF transformation opt-in — a `ContentNegotiation`
  capability entry with `profile: https://w3id.org/jeswr/lws/transform/rdf-1` and a
  matching `conformsTo` in its storage description ([JLWS-RDF-TRANSFORM] *Capability
  declaration*) — a PD written as Turtle may be read as JSON-LD and vice versa, and the
  `rdf-1` contract guarantees the derived representation "MUST encode an RDF graph …
  **isomorphic** to that of the authoritative representation … no triples added, none
  removed" (*Transformation semantics*).
- Because this extension's protocol hash is computed over the **RDFC-1.0 canonicalization
  of the parsed graph** (`#pd-hashing` steps 1–3), not over bytes, that isomorphism
  guarantee makes the pin **representation-stable**: the same PD fetched as Turtle or as an
  rdf-1-derived JSON-LD rendering verifies against one pinned hash. (RDFC-1.0 assigns
  isomorphic graphs identical canonical N-Quads.)
- A storage **without** the opt-in still hosts PDs perfectly well — clients simply fetch
  the stored representation. Clients MUST NOT expect RDF content negotiation from a storage
  that does not advertise it ([JLWS-RDF-TRANSFORM] *Capability declaration*: clients "MUST
  NOT attempt transformation-dependent behaviour … against a storage that does not
  advertise it").

## 2. The `AgentInteractionService` discovery entry

Defined by this spec's Relationship section (informative vocabulary minting; no JLWS core
edit needed — the JLWS *Capability registry* already provides the extension-service
mechanism: "Extension services use absolute URIs", unknown types ignored per the
storage-description data model's forward-compatibility rule, JLWS core `#discovery-model`):

```json
{
  "type": "https://w3id.org/jeswr/a2a-rdf/v1#AgentInteractionService",
  "serviceEndpoint": "https://agent.example/.well-known/agent-card.json",
  "conformsTo": "https://w3id.org/jeswr/a2a-rdf/v1"
}
```

- `serviceEndpoint` — the **A2A Agent Card URL** (the card, not the A2A endpoint: the card
  carries the endpoint and the `capabilities.extensions` declaration per `#declaration`).
- `conformsTo` — asserts the agent declares this extension's URI.

A storage whose controller operates an A2A agent MAY carry this entry in its storage
description so a client that discovered the storage can find the agent that speaks for it.
It adds no requirement to either side.

## 3. The fail-closed no-NL-downgrade rule under LWS auth

The no-silent-downgrade rule (`#downgrade`) is evaluated at the **exchange layer** over the
pinned hash; it is independent of how the PD's host authenticates readers. JLWS's baseline
token presentation is **Bearer** (no DPoP), with proof-of-possession an optional negotiated
profile (JLWS core *Proof-of-possession profiles*, DECISIONS.md D9/S2). That weaker-than-
Solid-OIDC storage-auth posture does not weaken this extension, because:

- the hash — "not the URL and not TLS" (`#pd-hashing`), and equally not the storage's
  token-presentation mode — is the trust anchor: a compromised, substituted, or
  replay-served PD that misses its pin MUST be rejected and the exchange treated as never
  upgraded;
- a consuming client that cannot retrieve or verify a pinned PD declines the offer; for a
  `required` (security-bearing) offer, `#downgrade` condition 2 then **aborts** the
  exchange — it is never silently retried in prose;
- authorization for the *actions* an intent requests is carried by the ODRL/AAC references
  (`#authorization`), verified by the receiving agent — not delegated to the storage's
  access control. The storage's ACLs govern only who can read/write the hosted documents.

An agent whose verified AAC chain warrants access can additionally have that access
materialised as a JLWS grant through the storage's `AccessRequestService` (JLWS core
*Access requests and grants*, strict ODRL per its D15, with the ODRL delegation extension
adopted by reference) — the same policy family end to end. That flow is a runtime
composition (accountable-agent-runtime territory), not a requirement of either spec.

## Conformance vectors

- **Pure-function composition cases** (extraction methodology, reference codec
  `@jeswr/solid-a2a`) live in
  [`agentic-solid-conformance`](https://github.com/jeswr/agentic-solid-conformance)
  `vectors/a2a-rdf/`: `pd-hash-stable-across-representations` (one pin verifies the same
  PD graph as Turtle and as an rdf-1-faithful JSON-LD rendering) and
  `pd-hash-rejects-graph-change` (a one-triple graph delta breaks the pin regardless of
  serialization).
- **Server-surface cases** (the storage-description `AgentInteractionService` entry parse
  + forward-compatibility) home in `lws-spec/test-vectors/vectors/discovery/` per the
  homing rule of `lws-spec/docs/alignment/conformance-vectors.md` (server/AS surface →
  lws-spec; pure agent-layer function → agentic-solid-conformance). That case
  (`sd-agent-interaction-service`) is **specified, not yet landed** — it rides the
  config-gated storage-description entry (`lws-spec/docs/alignment/a2a-rdf.md` §3–§4).
