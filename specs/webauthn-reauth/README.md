# Redirect-Free WebAuthn Re-Authentication for Solid-OIDC

<!-- AUTHORED-BY Claude Fable 5 — AI-assisted draft awaiting maintainer review; see DECISIONS.md -->

An **unofficial W3C Solid Community Group-track editor's draft** specifying
redirect-free WebAuthn (passkey) re-authentication for Solid-OIDC: after a
normal login, the application (as WebAuthn Relying Party) registers an
origin-bound passkey with the user's OpenID Provider; thereafter it
re-authenticates with **no top-level redirect** — a single-use challenge, a
`navigator.credentials.get()` ceremony in the app, and an **RFC 8693 token
exchange** (`subject_token_type = urn:solid:token-type:webauthn-assertion`)
returning ordinary **DPoP-bound** (RFC 9449) Solid-OIDC tokens. One
origin-bound assertion attests **both** the user and the application. Resource
Servers (Pods) are **unchanged**.

## Status — EDITOR'S DRAFT AVAILABLE (unofficial; local)

The ReSpec Editor's Draft is **[`index.html`](index.html)** — open it in a
browser (or serve the repo root) to render it. It is an *unofficial* draft with
no standing: not a Solid CG work item, not endorsed. Publication (GitHub +
Pages + CG contribution) is a separate, maintainer-gated step.

The draft is **implementation-first**: its normative requirements are the
proven wire contract of the two reference implementations, plus a small number
of clearly marked additions/corrections (see the in-spec *Implementation
status* table and [`DECISIONS.md`](DECISIONS.md)):

- **OP side** — [`@jeswr/css-webauthn`](https://github.com/jeswr/solid-webauthn)
  (Community Solid Server component): registration, passkey store,
  assertion-options, atomic single-use challenge cache, SSRF-hardened Client-ID
  fetch, WebAuthn L3 verification, the token-exchange grant, rate limiting,
  audit, credential list/delete.
- **Client + wire format** —
  [`@jeswr/solid-webauthn-reauth`](https://github.com/jeswr/solid-webauthn-reauth):
  registration helper, redirect-free token provider, DPoP-bound exchange with
  downgrade refusal + nonce retry, and the fail-closed **canonical-base64url**
  assertion-bundle codec + origin-normalisation helpers.

Headline normative decisions made in this draft (full record in
[`DECISIONS.md`](DECISIONS.md)):

1. **Canonical base64url is REQUIRED** on every bundle field (decode→re-encode
   round-trip; fail-closed) — promoted from the reference codec.
2. **`issued_token_type` corrected** to
   `urn:ietf:params:oauth:token-type:access_token` (RFC 8693 §2.2.1) — the
   deployed OP returns the subject token's type; a one-line fix is flagged.
3. **Coarse `invalid_grant`** for all assertion-validation failures
   (anti-enumeration), with the RFC 8693 §2.2.2 divergence explicitly flagged
   as an open issue.
4. **DPoP failure MUST NOT consume the challenge** (makes the client's
   `use_dpop_nonce` single-retry sound).
5. **Client conformance**: MUST refuse a non-DPoP token (downgrade refusal);
   one DPoP keypair spans token-endpoint and resource proofs.

## Contents

- [`index.html`](index.html) — the Editor's Draft (ReSpec, CG-DRAFT shape).
  **Read this first.**
- [`DECISIONS.md`](DECISIONS.md) — every design call, alternatives, and the
  deviations from the prior Bikeshed draft / deployed code, per the
  proceed-and-document rule.

## Provenance

Protocol designed and implemented jointly by **Samu Lang** and **Jesse Wright**
(`jeswr/solid-webauthn`, `jeswr/solid-webauthn-reauth`). This standalone
editor's draft was AI-assisted (**Claude Fable 5**, 2026-07-02), porting the
monorepo's Bikeshed draft and the reference implementations' contracts, with
primary-source verification of every RFC/W3C citation — and is **awaiting
review by its human editor**.

## Licence

Spec text: W3C Community Contributor Licence / CC-BY-4.0 (to be confirmed on
CG contribution).
