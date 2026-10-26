<!-- AUTHORED-BY Claude Opus 5.5 -->
# Yjs Sync Profile for Solid Storages (y-protocol-v1)

A draft profile for collaborative Yjs documents kept in a Solid or Linked Web Storage
container. It fixes how the document is stored (a log of write-once update resources with a
16-byte header), how readers load it and compactors shrink it without losing updates, and how
a relay listed as a `ssd:CrdtSyncService` hands out tickets, authorizes every message against
current access control, and stays in step with the stored log.

## Contents

| Path | What |
|---|---|
| [`index.html`](index.html) | The draft (ReSpec). Read this first. |
| [`spec.statements.ttl`](spec.statements.ttl) | Its normative statements, one per paragraph, with test links or gaps. |
| [`vectors/`](vectors/) | Byte-level test vectors for the record layout and the loading rule. |
| [`DECISIONS.md`](DECISIONS.md) | Design decisions and what was rejected. |

## Checks

`pnpm run gate` at the repository root runs `tools/spec-check`, which checks every vector
against the layout and loading rules with a pinned Yjs, and checks the statement companion
against the draft.
