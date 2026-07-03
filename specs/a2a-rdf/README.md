<!-- AUTHORED-BY Claude Fable 5 — AI-assisted draft awaiting maintainer review -->

# RDF Protocol Documents — an A2A Extension

> **Extension URI:** `https://w3id.org/jeswr/a2a-rdf/v1` (w3id redirect pending)
> **Spec:** [`index.html`](./index.html) (unofficial draft)
> **Reference codec:** [`@jeswr/solid-a2a`](https://github.com/jeswr/solid-a2a)

An extension to the Linux Foundation [Agent2Agent (A2A) protocol](https://a2a-protocol.org/latest/specification/)
— defined through A2A's own extension mechanism (spec §4.6; no core changes) — that lets two
agents negotiate **once** in natural language and then crystallise the routine into a
**hash-pinned Protocol Document whose body is a SHACL shape**. Thereafter every exchange under
that protocol is a SHACL-validated RDF graph carried in ordinary A2A message `Part`s:
machine-checkable, vocabulary-grounded, zero LLM inference on the hot path, with a fail-closed
**no-silent-downgrade** rule for security-bearing exchanges.

The design carries the [AGORA](https://arxiv.org/abs/2410.11905) hash-pinned protocol-document
result (the editor is an AGORA co-author) one step further, making the protocol document
RDF/SHACL-native so validated intents compose directly with ODRL policies and
[Agent Authorization Credentials](https://github.com/jeswr/agent-authz-credential-spec).

## What the spec defines

1. **Extension identity + Agent Card declaration** — the extension URI, the
   `AgentExtension` entry (`uri`/`description`/`required`/`params`), and a `params` schema
   (`formats`, `nlNegotiation`, `protocolDocuments`) that lets an agent pre-declare the
   protocols it already speaks.
2. **Activation** — standard A2A `A2A-Extensions` negotiation plus per-message tagging via
   the core `Message.extensions` field.
3. **Protocol Documents** — the `a2a:ProtocolDocument` data model (request/response SHACL
   shapes + Dublin Core metadata) and content addressing:
   `sha256:` over the RDFC-1.0 canonical N-Quads of the full graph, verified on every fetch.
4. **The upgrade handshake** — `upgrade-offer` / `upgrade-response` payloads (JSON and RDF
   forms) and the normative no-silent-downgrade rule: an unrelated/absent/malformed response
   never authorises NL fallback, and a declined `required` offer aborts the exchange.
5. **Message-content binding** — Part profiles for handshake, intent, response, and
   authorization payloads (`text/turtle` / `application/ld+json` / `application/vp`), with
   extension-namespaced `Part.metadata` keys and mandatory pre-action SHACL validation.
6. **Authorization composition** — how an intent references the ODRL policy it exercises and
   travels with an AgentAuthorizationCredential presentation (by reference to the
   [ODRL Agent-Delegation Profile](https://w3id.org/jeswr/odrl-delegation) and the AAC spec —
   composed, not restated).
7. **Security considerations** — untrusted-RDF hardening, strict security-flag parsing,
   downgrade resistance, SSRF-safe PD fetching, replay, validation-cost bounds.
8. **An honest implemented-vs-proposed inventory** and a worked end-to-end example whose
   payloads were generated and validated with the reference codec.

## Status

**Unofficial draft — nothing has been submitted to the A2A project.** This document is a
candidate proposal prepared per A2A's
[extension governance](https://github.com/a2aproject/A2A/blob/main/docs/topics/extension-and-binding-governance.md)
(proposal = an issue on `a2aproject/A2A`; then maintainer sponsorship → an
`experimental-ext-*` repo). Submission is maintainer-gated: the editor posts, the drafting
agent posts nothing externally.

AI-assisted draft (Claude Fable 5), verified against the A2A v1.0.0 specification, the A2A
extensions topic guide + governance doc, and the `@jeswr/solid-a2a` codec on 2026-07-03.
Design decisions and their alternatives are recorded in [`DECISIONS.md`](./DECISIONS.md).

## Viewing

`index.html` is a ReSpec document — open it in a browser (it fetches the ReSpec script from
w3.org) or view the rendered copy at <https://jeswr.github.io/a2a-rdf-extension/> once Pages
is enabled.
