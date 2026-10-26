<!-- AUTHORED-BY Codex GPT-6.1-Sol -->

`manifest.json` pins the profile IRI and Yjs version. Each case has an ID, a description,
the paragraph IDs it exercises, and resources with a relative name and a hexadecimal body.
Treat names as final path segments under one room IRI.

An expectation either gives `text` (Y.Text name → string), `valid` and `invalid` resource
name lists, or gives the decoded `kind`, `time` and unsigned big-endian `nonce`.
Invalid-resource cases use empty expected text and an `invalid` classification; an invalid
record supplies no usable ordering key.
Load cases apply every valid resource, including supported legacy resources, in ordering-key
order and in reverse order. Snapshot times never filter updates. Fixed nonces are test
fixtures; production writers must use a cryptographically secure random source.

From the repository root, with the workspace dependencies installed:

```sh
PATH=/opt/node24/bin:$PATH node specs/y-protocol/vectors/generate.mjs
PATH=/opt/node24/bin:$PATH pnpm run gate
```

The generator uses Yjs from `tools/spec-check/node_modules` and accepts an optional output
filename. The gate regenerates into a temporary directory and compares bytes with the manifest.
