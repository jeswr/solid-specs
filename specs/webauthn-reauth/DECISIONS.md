# Design decisions — solid-webauthn-reauth-spec

> AUTHORED-BY Claude Fable 5 — AI-assisted drafting, awaiting maintainer review.

This records every design call made while writing the editor's draft
(`index.html`), with alternatives, per the suite's *proceed-and-document* rule.
The draft is **implementation-first**: it specs the proven wire contract of the
reference implementations, deviating only where a primary source contradicts
them — and every deviation is listed here.

Sources of truth used (read before drafting):

- `jeswr/solid-webauthn` `spec/index.bs` — the maintainer's existing Bikeshed
  normative draft (ported, not redesigned).
- `jeswr/solid-webauthn` `spec/ARCHITECTURE.md` — the arc42/C4 architecture +
  STRIDE/LINDDUN threat model + ADR index (referenced, not restated).
- `jeswr/solid-webauthn-reauth` `src/protocol/` + `DESIGN.md` — the proven
  client/wire contract (canonical-base64url fail-closed codec, origin
  normalisation, the URN constants, the 5-bullet threat model).
- Primary sources verified live on 2026-07-02: RFC 8693 (§2.1, §2.2.1, §2.2.2,
  §3), RFC 9449 (§4.2, §5, §6.1, §7, §8, §12.2), RFC 9068 (§2.1, §2.2),
  WebAuthn Level 3 (CR Snapshot 26 May 2026 — §7.1, §7.2, base64url in §3
  Dependencies, `AuthenticationResponseJSON` cited by stable fragment anchor),
  Solid-OIDC 0.1.0 + the 23 June 2026 editor's draft.

## 1. Standalone ReSpec repo, porting (not superseding-in-place) the Bikeshed draft

**Decision.** A new local repo `solid-webauthn-reauth-spec` containing a
single-file ReSpec `CG-DRAFT` `index.html`, exactly the shape of the sibling
AC-SPARQL spec (`jeswr/solid-sparql-query`). The monorepo's `spec/index.bs`
remains in place; this document ports its normative content and is now the
document to evolve.

**Alternatives.** (a) Keep evolving `index.bs` in the monorepo — rejected:
Bikeshed needs a Python toolchain to render, the monorepo is a design-first
research workspace, and the suite's spec convention (established by
`solid-sparql-query`) is a standalone browser-renderable ReSpec repo the
orchestrator can publish to GitHub Pages. (b) ReSpec inside the monorepo —
rejected for the same repo-shape reason and because the bead asks for its own
directory. **Follow-up:** once published, the monorepo spec should gain a
"superseded by" pointer.

## 2. `specStatus: CG-DRAFT` + an explicit unofficial-SOTD

**Decision.** ReSpec `specStatus: "CG-DRAFT"`, `group: "cg/solid"` (matching
`solid-sparql-query`), **plus** a custom SOTD paragraph stating the document is
an unofficial editor's draft with *no standing*, not a CG work item, not
endorsed — and an AI-assisted-drafting disclosure (Claude Fable 5, awaiting
editor review), the same convention as the agentic-solid-vision paper.

**Alternatives.** `specStatus: "unofficial"` — renders a generic unofficial
banner but drops the CG framing the document is destined for; the sibling spec
set the CG-DRAFT-plus-explicit-SOTD pattern, so consistency won.

## 3. Canonical base64url is normative (NEW vs the Bikeshed draft)

**Decision.** Promoted the reference implementation's decode→re-encode
round-trip rule to a normative MUST (`#req-canonical-b64u`): every base64url
field of the bundle must be *canonical* — unpadded, `length mod 4 ≠ 1`, zero
unused trailing bits. The old draft only required "valid base64url".

**Rationale.** This rule was added to `@jeswr/solid-webauthn-reauth`'s codec
under review (a roborev Medium): alphabet-valid non-canonical strings (e.g.
`"AB"` vs `"AA"`) decode to identical bytes but are distinct strings — an
aliasing/malleability hazard for the string-keyed credential lookup, dedupe,
rate-limiting, and audit. Making string identity coincide with byte identity
closes it. **Alternative:** leave it an implementation note — rejected; it is a
verifier-facing security property and interop-relevant (a bundle a strict OP
rejects must be rejected everywhere).

**Honesty marker.** The monorepo's OP-side codec predates the rule; the
implementation-status table marks canonicality "implemented in the reauth
protocol layer; proposed for the CSS verifier".

## 4. `issued_token_type` corrected to `…:access_token` (deviation from BOTH the Bikeshed draft and the deployed OP)

**Decision.** The success response requires
`issued_token_type = urn:ietf:params:oauth:token-type:access_token`.

**Rationale.** RFC 8693 §2.2.1 (verified): `issued_token_type` is REQUIRED and
identifies "the representation of the **issued** security token" — the access
token, not the subject token. Both `index.bs` (`#req-idp-verified`) and the
deployed grant (`WebAuthnIdentityProviderFactory.ts:355`) return the *subject*
token's type (`urn:solid:token-type:webauthn-assertion`), which misuses the
parameter. Spec'd correctly; the implementation-status table flags the deployed
behaviour as needing a one-line fix. **Alternative:** spec the deployed
behaviour — rejected: it is a plain RFC violation, trivially fixable, and no
client is known to depend on it (the reference client ignores the field).

## 5. Error mapping keeps the implemented `invalid_grant`, with the RFC 8693 §2.2.2 tension flagged

**Decision.** Assertion-validation failures → one coarse `invalid_grant`
(anti-enumeration); malformed bundle / bad `subject_token_type` →
`invalid_request`; DPoP → `invalid_dpop_proof` / `use_dpop_nonce`. A normative
note (`#note-8693-tension`) acknowledges RFC 8693 §2.2.2's direction that an
invalid subject token MUST be `invalid_request`, explains the deliberate
divergence (RFC 6749 `invalid_grant` semantics; an actionable re-run-the-
ceremony signal vs re-encode-the-request), and lists it as an open issue for CG
review.

**Alternatives.** (a) Collapse everything to `invalid_request` for strict 8693
conformance — preserves anti-enumeration but tells a client with a stale
challenge to "fix the request" when the fix is a fresh ceremony, and breaks the
deployed contract. (b) Silently keep `invalid_grant` — rejected: hiding a MUST-
level divergence from the profiled RFC would be dishonest. Chose (implemented
behaviour + explicit flagged divergence).

## 6. DPoP-failure-before-challenge-consumption made explicit (NEW ordering requirement)

**Decision.** The verification preamble states DPoP validation precedes the
six-step sequence and a request failing DPoP MUST NOT consume the challenge.

**Rationale.** The reference client retries once on `use_dpop_nonce` **with the
same assertion bundle** (RFC 9449 §8 nonce flow). That retry can only succeed
if the nonce-rejected first attempt did not consume the single-use challenge.
The old draft left this ordering implicit; a conforming-but-different OP that
consumed the challenge first would break every nonce-demanding deployment.
Marked "proposed" in the implementation-status table (needs an OP-side
conformance test). **Alternative:** require the client to re-run the ceremony
on nonce retry — rejected: a second passkey prompt per login on nonce-enforcing
OPs is unacceptable UX and not what the proven client does.

## 7. Client conformance requirements added: downgrade refusal + key continuity + nonce retry

**Decision.** Three client-side normative requirements
(`#req-client-downgrade`, `#req-single-keypair`, `#req-client-nonce`), lifted
from the reference implementation's threat model (DESIGN.md §4 bullet 2) and
tested behaviour: reject `token_type !== "DPoP"` (case-insensitive per RFC 6749
§5.1); one keypair spans the token-endpoint proof and resource proofs
(RFC 9449 §7 `ath`); retry once on `use_dpop_nonce`.

**Rationale.** The bead's threat model names token-downgrade refusal and
one-keypair binding as load-bearing; the old Bikeshed draft had *no* client
conformance section beyond ceremony mechanics. **Alternative:** leave
client behaviour non-normative — rejected: downgrade refusal is a security
property of the *ecosystem* (a sloppy client silently strips sender-constraint).

## 8. Issued-token claims: follow deployed practice, cite Solid-OIDC honestly

**Decision.** The OP MUST mint a DPoP-bound access token (`cnf.jkt`, RFC 9449
§6.1) with a `webid` claim; JWT deployments SHOULD follow RFC 9068
(`typ: at+jwt`). A note records that Solid-OIDC 0.1.0 defines `webid` only on
the ID Token and declares the global access token out of scope (verified
against both the TR and the 2026-06-23 editor's draft), while deployed servers
accept RFC 9068 access tokens with `webid` — and that this profile tracks
Solid-OIDC as that lands (open issue).

**Alternatives.** (a) Cite Solid-OIDC as if it required `webid` access tokens —
rejected: it doesn't (verified). (b) Require RFC 9068 with MUST — rejected:
Solid-OIDC deployments aren't uniformly JWT-based; the profile's contract is
"whatever your interactive flow issues, DPoP-bound, with the resolved WebID".
Also note RFC 9068 itself does not define `cnf` (verified) — sender-constraint
cites RFC 9449 §6.1 directly.

## 9. Endpoint paths conventional, not normative

**Decision.** `/.oidc/webauthn/assertion-options` and the account registration
routes are documented as the reference implementation's conventional defaults;
behaviour is normative, paths are not. POST is required; GET is a MAY for
genuinely side-effect-free issuance (mirroring the client's
`assertionOptionsMethod` seam).

**Alternative.** Normative well-known paths or OIDC-discovery metadata (e.g. a
`webauthn_assertion_options_endpoint` AS-metadata field) — better long-term,
but the reference stack doesn't implement discovery metadata yet; listed
implicitly under open issues via the conventional-default framing. Discovery
metadata is the natural v2 request.

## 10. Sequence diagrams as accessible ASCII `<pre>`, not SVG

**Decision.** Prose + two ASCII sequence diagrams with `aria-label`s.
**Alternatives:** embed the monorepo's Mermaid-rendered SVGs — rejected: the
SVG artifacts live in the monorepo (`spec/diagrams/*.mmd`), copying binaries
into a single-file spec repo adds build/maintenance drift, and the sibling spec
is also single-file. A rendered-SVG upgrade is cosmetic and can come with publication.

## 11. Registrations section is IANA-*style*, registering nothing

**Decision.** A "Registrations" section records the token-type URN in IANA
OAuth-registry table style, states explicitly that no IANA action is taken
(RFC 8693 §3 verified: "Other URIs MAY be used"), defines a tiny
assertion-bundle version registry (v1), and clarifies that **no new grant type
is defined** — the profile is recognised by its `subject_token_type`.

## 12. The five threat-model bullets map 1:1 to Security Considerations subsections

**Decision.** §Security has one subsection per DESIGN.md §4 bullet
(phishing/origin → origin-model reqs; downgrade/confused-deputy → DPoP +
client reqs; untrusted verifier input → fail-closed + canonicality reqs;
registration credential handling → registration reqs; replay/freshness/
revocation-are-OP-side → challenge + lifecycle reqs), each citing its normative
anchors, plus three more (enumeration, SSRF, embedding/assurance) carried over
from the architecture. Privacy Considerations is a separate section (LINDDUN-
derived: no new correlator, non-derivable user handle, log truncation,
attestation=none as an anti-fingerprinting default) — the old Bikeshed draft
had no privacy section.

## Follow-ups (for the orchestrator / builder)

1. **Publish** (orchestrator step, per the bead): create `jeswr/
   solid-webauthn-reauth-spec` on GitHub + Pages; then add a "superseded by"
   note to `jeswr/solid-webauthn` `spec/index.bs`.
2. **One-line OP fix**: `WebAuthnIdentityProviderFactory.ts:355` —
   `issued_token_type` → `urn:ietf:params:oauth:token-type:access_token`
   (decision 4).
3. **Port canonical-base64url** into the monorepo protocol/verifier codec
   (decision 3) — or re-point the monorepo at the reauth repo's protocol layer.
4. **OP conformance test** for nonce-rejection-does-not-consume-the-challenge
   (decision 6).
5. **CG contribution**: new-work-item issue to `solid/specification` when the
   maintainer signs off; the open-issues list is the discussion agenda.
6. Consider OIDC discovery metadata for the assertion-options endpoint
   (decision 9).
