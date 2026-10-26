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

Checks are offline. JSON-LD contexts resolve only from `contexts/`:

| File | Source |
|---|---|
| `cid-v1.jsonld` | `https://www.w3.org/ns/cid/v1`, copied from `w3c/cid@8d2398e` `context/v1.jsonld` (W3C Software and Document License). |
| `lws-v1.stand-in.jsonld` | A stand-in for `https://www.w3.org/ns/lws/v1`, which the LWS WG has not published. Hand-written from `w3c/lws-protocol@181ed0d` `lws10-vocab/vocabulary.yml`, protected like the generated contexts, with only the terms the examples use. Replace it with the published context when it exists. |

`shapes/spec-companion.shape.ttl` is copied verbatim from `jeswr/spec-companion@578c0de`
`shapes/spec-companion.shape.ttl` (MIT). Refresh it from that repository; do not edit it here.
