<!-- AUTHORED-BY Claude Opus 5.5 -->
# @jeswr/solid-specs-check

Gate checks for specs that ship shapes, examples and a statement companion. Run with
`pnpm -r run test` (part of the root `pnpm run gate`). Currently covers
`specs/service-description`:

- every example in `examples/` conforms to `shapes/`, and every `examples/invalid/` vector fails
  with a result citing the statement or section named on its `# EXPECT:` line;
- every JSON-LD example means the same graph as its Turtle twin (RDFC-1.0 canonical N-Quads),
  expanded in JSON-LD safe mode so a member no context maps is an error;
- the examples inside the spec text parse and conform;
- every `ssd:` term used is defined in the vocabulary, and every vocabulary term is named in
  the spec;
- every statement in `spec.statements.ttl` is a verbatim quote of the spec, its anchor exists,
  its level matches its keyword, every normative paragraph of the spec is listed, the spec lists
  every requirement, and the companion conforms to the spec-companion shape.

Also covers `specs/y-protocol`:

- the companion conforms to the same shape, pins the draft's SHA-256, lists exactly one
  verbatim statement per normative paragraph, and links vector cases or explicit test gaps;
- every vector decodes according to the 16-byte header table or the legacy name rule,
  including timestamp limits, unsigned nonces and invalid payloads;
- loading every valid resource in ordering-key order and in reverse order yields the same
  expected Y.Text content, including offline updates older than a snapshot, concurrent
  snapshots and pending dependencies; invalid resources never partially mutate room state;
- regenerating with the installed, pinned Yjs version reproduces the manifest byte-for-byte,
  and every vector's statement reference names a normative paragraph in the draft.

Regenerate the vectors from the repository root with
`node specs/y-protocol/vectors/generate.mjs` (Node 24). See the
[vector README](../../specs/y-protocol/vectors/README.md) for the manifest format. These
offline checks do not exercise HTTP, compaction races, tickets, relay authorization or
durability exchanges; those companion statements carry explicit coverage gaps.

Checks are offline. JSON-LD contexts resolve only from `contexts/`:

| File | Source |
|---|---|
| `cid-v1.jsonld` | `https://www.w3.org/ns/cid/v1`, copied from `w3c/cid@8d2398e` `context/v1.jsonld` (W3C Software and Document License). |
| `lws-v1.stand-in.jsonld` | A stand-in for `https://www.w3.org/ns/lws/v1`, which the LWS WG has not published. Hand-written from `w3c/lws-protocol@181ed0d` `lws10-vocab/vocabulary.yml`, protected like the generated contexts, with only the terms the examples use. Replace it with the published context when it exists. |

`shapes/spec-companion.shape.ttl` is copied verbatim from `jeswr/spec-companion@578c0de`
`shapes/spec-companion.shape.ttl` (MIT). Refresh it from that repository; do not edit it here.
