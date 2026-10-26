<!-- AUTHORED-BY Claude Opus 5.5 — AI-assisted draft awaiting maintainer review -->

# Design decisions — Solid Storage Service Description

Recorded per the proceed-and-document rule: the drafting agent chose, the maintainer steers
after the fact. Inputs: the suite's ADR-008 Part A outline and ADR-002 (client algorithm),
LWS WD sources at `w3c/lws-protocol@181ed0d` (Discovery, Notifications, lws10-index, the
vocabulary YAML), the CID v1 context at `w3c/cid@8d2398e`, the Solid Notifications Protocol,
the JLWS draft (`jeswr/lws-spec`), and what sparq's `sparq-lws-core` serves today.

## D1 — Reuse `notify:channelType`; no `ssd:channelType`

ADR-008 sketched an `ssd:channelType` on the notification service. Solid Notifications already
defines `notify:channelType` with exactly this meaning, and using it lets one node be both the
`notify:subscription` object and the `did:service` entry, so old and new clients read the same
triples. **Rejected:** a parallel `ssd:channelType` (a duplicate term any CG reviewer would ask
to remove). sparq emits `ssd:channelType` today; tracked as a sparq change.

## D2 — Flat `ssd:PatchSupport`, one capability per source media type

The LWS discovery example shows `{"type": ".../PatchSupport", "format": {"text/turtle": [...]}}`.
That JSON object keyed by media type has no RDF meaning under JSON-LD (the keys are not terms),
and the generated LWS context maps `format` to `dct:format`, so reusing the key would also clash
with a protected term. The draft uses `{type: PatchSupport, source, patchType[]}` per media type,
the same flat shape as LWS's own `ContentNegotiation` example (`source`, `target[]`).
**Rejected:** `ssd:format` nodes (ADR-008, sparq Solid mode today; works in RDF but needs a nested
object in JSON and a term that collides with LWS); a JSON-LD property-based index map (valid
JSON-LD 1.1, but values would have to be node objects, not the arrays LWS shows).

## D3 — No re-minted access request/grant types

ADR-008 listed `ssd:AccessRequestService`/`ssd:AccessGrantService` as `owl:equivalentClass` of
the LWS terms. A Solid storage that offers these services can use `lws:AccessRequestService` and
`lws:AccessGrantService` directly, and SSD-SVC-LWS-1 forbids re-typing LWS-covered services.
Fewer terms, one parser path. **Rejected:** equivalent-class aliases.

## D4 — The extension context defines nothing CID or LWS defines

The CID v1 context is `@protected`, and the generated LWS context is expected to be too. A later
context that redefines a protected term with a different definition makes JSON-LD processing
fail. So the solid-sd context leaves `id`, `type`, `service`, `serviceEndpoint`, `capability`,
`conformsTo`, `subscriptionType` and `format` to CID/LWS and requires those two contexts to come
first (SSD-REP-3). The LWS context is not published yet; the gate tests against a stand-in, and
the spec carries an open issue naming the terms it assumes LWS leaves free (`source`, `target`,
`model`, `patchType`).

## D5 — Profiles via `dcterms:conformsTo`, not versioned type IRIs

A service type says what a service is; the protocol and its version is a profile IRI. New
protocol versions add a profile, not a type, so clients keep matching the type. Same mechanism
LWS uses for access profiles. **Rejected:** `ssd:CrdtSyncServiceV1`-style types; `ssd:protocol`
(sparq's context has it; `conformsTo` covers it).

## D6 — Version history found from the resource (`rel=version-history`)

`did:serviceEndpoint` must be an IRI, so ADR-008's "endpoint template `{resource}`" cannot be
the endpoint. Versions are found from the resource's `version-history` link (RFC 5829), versions
carry `Memento-Datetime` and `rel=original` (RFC 7089). The endpoint identifies the service and
has no operation in this draft. **Rejected:** a `ssd:versionHistoryTemplate` property (one more
term, and a template invites clients to guess URLs the server may not honour).

## D7 — Trash protocol in the spec

The trash protocol of tracker task SDK-APP-12 (POST `{resource}` to trash, POST `{restore}`,
DELETE to purge, `rel=original` on trashed copies, `ssd:retention`) is normative here rather
than in an appendix, because a service type without its protocol is not implementable. Solid
restores to the original IRI or refuses with 409; LWS may restore under a new identifier.

## D8 — CRDT tickets are authoritative; `ssd:roomTemplate` is informative

ADR-006 gets the room URL from a ticket (`POST {room}` → `{url, expires}`); ADR-008 also had a
`roomTemplate`. Two sources for one URL invite drift and let a client skip the authorization
the ticket carries. The ticket URL is authoritative; the template is kept as an optional hint
because sparq's context and the client already know it.

## D9 — Origin rules: storage credentials never leave the storage's origin

A client ignores services and capabilities from a Solid description on another origin
(SSD-CLI-1), never sends the storage's credentials to an endpoint on another origin or across a
redirect to one (SSD-CLI-8, SSD-CLI-17), never sends them when fetching a description on another
origin (SSD-CLI-14), and never dereferences JSON-LD contexts at run time (SSD-CLI-15). Solid
Notifications allows a subscription service on another origin; such a service is used only with
credentials the client obtains for that origin. CRDT room URLs are capability URLs and carry no
credentials. The first cut allowed cross-origin notification endpoints to receive the storage's
credentials; Codex review flagged it [high] and it was removed.

## D10 — Absence means unknown

A description is not a complete list of behaviours, so a missing entry means "unknown", never
"not offered" (SSD-CLI-10). The first cut let one solid-sd entry imply completeness; review
showed that advertising only `AccessControl` would then hide notifications. Clients fall back
to paths that work either way (log-mode Yjs, probing). ADR-002's `deriveFeatures` rule
"description present → unavailable" should become "unknown" for these features.

## D12 — Yjs loading replays every update; compaction deletes only what a snapshot contains

ADR-006 §D1 has loaders apply "updates with ms ≥ snapshot ms". That loses an update written
offline with an older timestamp after a snapshot that does not contain it. Yjs updates are
idempotent, so loaders apply the newest snapshot and then every update (SSD-Y-11), and a
compactor deletes only updates its snapshot was built from (SSD-Y-12). `y-solid` needs the same
change (tracker follow-up).

## D13 — Authorization of the trash, versions and sync rooms

Trashing needs delete permission on a resource in the same storage; restoring needs delete on
the trashed copy and create at the restore location; refusals answer as the storage would
(SSD-SVC-TRASH-8/9). Versions and histories are never more readable than the live resource
(SSD-SVC-VER-5). A sync ticket needs read access to the room container and every resource in
it, because members can carry their own ACLs (SSD-Y-2/3/8).

## D11 — Not done in this draft

- Byte-level test vectors for the Yjs update encoding (open issue in the appendix).
- The jeswr.org `/ns/solid-sd` redirect and context hosting (needs the maintainer's go).
- An `application/lws+cid` Link relation for Solid storages: whether a Solid storage also emits
  `rel=lws#storage` is left to a later draft, since it changes how LWS clients treat the storage.
