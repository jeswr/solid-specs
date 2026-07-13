<!-- AUTHORED-BY Claude Fable 5 -->

# Agentic Solid: Architecture Overview — the umbrella note

**Spec:** [`index.html`](./index.html) (ReSpec) — *Agentic Solid: Architecture Overview*: the
top-level W3C-CG-shaped Note that maps how the agentic-Solid component specifications and
standards compose into one architecture for **accountable agents on web standards**.

**Status:** unofficial editor's draft, shaped as a W3C **Solid Community Group** Note. **Not**
an adopted Solid CG work item; not a W3C Standard; not on the W3C standards track. Contributing
it to the Solid CG is a deliberate later step (maintainer-gated), taken only after the component
specifications it maps have themselves been contributed — per the adoption roadmap in
[`jeswr/agentic-solid-vision`](https://github.com/jeswr/agentic-solid-vision) (§3 item 6: the
umbrella document comes **last**, once the components exist to point at — they now do).
AI-assisted drafting (Claude Fable 5) is disclosed in the SOTD.

## What it is — a map, not a spec

The note is **entirely informative**. It defines no protocol, mints no vocabulary, and contains
no normative requirements; every conformance statement lives in a component specification it
points at. What it adds is the one document a standards body reads first:

1. **The layered architecture** — six layers (identity/DPoP → access control + AC-SPARQL →
   ODRL policy/delegation → VC credentials/integrity → agent comms/discovery → PROV
   accountability) plus the cross-cutting federation plane, each pointing at its normative spec.
2. **The accountability thesis**, stated once, precisely: every agent action traces to a
   delegating principal via a signed, revocable, scoped chain — with the honest
   accountability-not-prevention boundary.
3. **Staged conformance profiles** (AS-0 … AS-4, by role: server / principal tooling / agent /
   verifier / registry) — what "Agentic-Solid conformant" means, by reference.
4. **An honest maturity table** — implemented / drafted / proposed, per component, verified
   2026-07-03 against the repositories and running services.
5. **Relationship to existing Solid specs** — extends, does not replace: AS-0 is exactly
   today's Solid Protocol + WAC/ACP + Solid-OIDC, unmodified.
6. **Security + privacy meta-sections** — pointers to each component's own analysis, plus the
   concerns only the *composition* raises (layer conflation, trust anchoring, fail-closed
   unavailability, the NL injection edge, trail-as-personal-data).

## The components it maps (read those for the normative content)

| Component | Where |
|---|---|
| Vision paper (narrative + worked §4 scenario) | [`jeswr/agentic-solid-vision`](https://github.com/jeswr/agentic-solid-vision) |
| Access-Controlled SPARQL Query over a Solid Pod (ED) | [`jeswr/solid-sparql-query`](https://github.com/jeswr/solid-sparql-query) |
| ODRL Agent-Delegation Profile | [`jeswr/solid-odrl`](https://github.com/jeswr/solid-odrl) `docs/delegation-profile.md` (`https://w3id.org/jeswr/odrl-delegation`) |
| Agent Authorization Credentials (CCG-shaped ED) | [`jeswr/agent-authz-credential-spec`](https://github.com/jeswr/agent-authz-credential-spec) |
| Accountable agent runtime (design + gap list) | [`jeswr/accountable-agent-runtime`](https://github.com/jeswr/accountable-agent-runtime) |
| Discovery / NL→RDF / VC libraries | [`solid-agent-card`](https://github.com/jeswr/solid-agent-card) · [`solid-a2a`](https://github.com/jeswr/solid-a2a) · [`solid-vc`](https://github.com/jeswr/solid-vc) |
| Federation vocabularies + registry + trust | [`solid-federation-vocab`](https://github.com/jeswr/solid-federation-vocab) · [`federation-registry`](https://github.com/jeswr/federation-registry) · [`federation-trust`](https://github.com/jeswr/federation-trust) |

## Viewing

Open `index.html` in a browser (ReSpec renders client-side from
`https://www.w3.org/Tools/respec/`), or serve the directory statically. Design rationale per
decision: [`DECISIONS.md`](./DECISIONS.md).

## Provenance

Drafted by Claude Fable 5 (AI-assisted; awaiting maintainer review) on 2026-07-03, against the
component specifications and primary sources verified by their own repos on 2026-07-02/03 (VC-DM
2.0, VC-DI 1.0 and cryptosuites — W3C RECs 2025-05-15; ODRL 2.2 IM/Vocab — RECs 2018-02-15;
PROV-O — REC 2013-04-30; RDFC-1.0 — REC 2024-05-21; RFC 9449; the Solid CG draft reports; the
W3C LWS WG charter page, fetched 2026-07-03).

MIT © Jesse Wright (spec prose intended for W3C Community Contributor Licence / CC-BY-4.0 on CG
contribution).
