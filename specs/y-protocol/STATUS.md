<!-- AUTHORED-BY Claude Opus 5.5 -->
# Status

**Venue state: experiment** (unofficial personal draft, first cut 2026-10-26).

- Completes the `ssd:CrdtSyncService` entry of the [Solid Storage Service Description](../service-description/)
  draft, which names the profile IRI `https://jeswr.org/ns/solid-sd#y-protocol-v1` and leaves its
  protocol to this document (service description DECISIONS D8).
- The namespace is provisional, like the service description's: the jeswr.org `/ns/solid-sd`
  redirect is not deployed yet (tracker T-091, needs the maintainer's go).
- Implementations: none conform yet. `@jeswr/y-solid` 0.1 writes the legacy headerless form;
  the re-platformed provider (suite ADR-006) and a sparq relay are tracked.
