<!-- AUTHORED-BY Claude Opus 5.5 -->
# Solid Storage Service Description

A draft that lets a Solid storage say what it supports (notifications, server-side query,
real-time sync, version history, trash, patch formats, its access control model) in the storage
description resource it already has, using RDF terms that map one to one onto the `service` and
`capability` entries of a Linked Web Storage storage description. One client parser then serves
both protocols, and a Solid storage can serve a description that is also a valid Linked Web
Storage description.

## Contents

| Path | What |
|---|---|
| [`index.html`](index.html) | The draft (ReSpec). Read this first. |
| [`spec.statements.ttl`](spec.statements.ttl) | Its normative statements, one per paragraph, with test links or gaps. |
| [`vocab/solid-sd.ttl`](vocab/solid-sd.ttl) | The terms it defines (`ssd:`). |
| [`context/v1.jsonld`](context/v1.jsonld) | The JSON-LD context, used after the CID and LWS contexts. |
| [`shapes/solid-sd.ttl`](shapes/solid-sd.ttl) | SHACL shapes for a description graph. |
| [`examples/`](examples/) | Valid descriptions (Community Solid Server today, sparq Solid mode, sparq LWS mode as JSON-LD with its Turtle twin) and `invalid/` vectors, each naming the statement it breaks. |
| [`DECISIONS.md`](DECISIONS.md) | Design decisions and what was rejected. |

## Checks

`pnpm run gate` at the repository root runs `tools/spec-check`, which validates every example
against the shapes, checks each invalid vector fails for the statement it names, checks each
JSON-LD example means the same graph as its Turtle twin (offline, with vendored contexts),
checks vocabulary coverage, and checks that every statement in the companion is a verbatim quote
of a normative paragraph and that every normative paragraph is listed.

Design record of the suite that motivated it: `jeswr/solid-suite-planning`,
`specs/sdk-core/ADR-008-service-description-and-sparq-asks.md` (Part A) and ADR-002 (client).
