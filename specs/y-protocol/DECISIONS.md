<!-- AUTHORED-BY Claude Opus 5.5 -->
# Design decisions — y-protocol-v1

## Y1 — One storage encoding for relays and log-only clients

The relay persists into the same room container that log-only clients write to, in the same
record format, and ingests what they write. **Rejected:** a relay with its own store that
snapshots into the pod occasionally (two sources of truth, and log-only clients never see live
edits); a relay that only persists and never ingests (review of the service description draft,
DECISIONS D8, found that splits the document).

## Y2 — A 16-byte header on every record

`JYU1`/`JYS1` magic, 64-bit big-endian milliseconds, 32-bit random nonce, then a Yjs v1 update.
Linked Web Storage servers choose resource names, so the ordering key and the update/snapshot
distinction must live in the body. The magic carries the version. **Rejected:** names as the
only ordering key (not portable to LWS); Yjs v2 encoding (y-websocket and most stores use v1);
a length field (the resource body already has one).

## Y3 — Loaders apply everything; vanished resources trigger a re-list

Yjs updates are idempotent and commutative, so a reader applies every record in the room
whatever its time. A time filter or "newest snapshot wins" loses updates written offline or held
only by an older concurrent snapshot (suite ADR-006 amendment, tracker sst-br1.7). A listed
resource that is gone when read was folded into a new snapshot, so the reader lists again before
it reports the room loaded; a bounded loader reports failure rather than a partial load
(ADR-006 review, 2026-10-26). A room counts as loaded only against a *complete listing*, one
that reflects a single state of the container: a paginated listing is checked with the
container's strong ETag (or membership version) before and after, because a compaction between
pages shifts members and can hide a record without any read returning 404 (spec review round 1).
Page ETags do not cover the whole membership, so the check uses the container's own strong ETag
from HEAD (the *membership tag*), which a paginating storage must change on every membership
change; records read before the final listing are revalidated by ETag, because a deleted IRI can
be reused (review round 2).
A payload is valid only if it decodes with no trailing bytes and applies to an empty document,
and readers apply it to a copy first: Yjs can decode an update that then throws mid-apply.

## Y4 — Compaction: create first, delete only what you read, conditionally

A compactor writes a snapshot holding everything it read, waits for a `2xx`, then deletes only
those resources, with `If-Match` and a strong ETag; with no strong ETag it does not delete
(random names alone do not stop a deleted IRI being reused, spec review round 1). Unique names and conditional creation keep an IRI from ever
naming two records, so a delayed compactor cannot delete a newer record that reused a URL
(ADR-006 review). This needs no lock and stays safe with any number of concurrent or offline
compactors. **Rejected:** serialized compaction through a lock resource (needs leases and
liveness in a storage that has neither); merging snapshots in place (read-modify-write race).

## Y5 — Tickets over HTTP, then a WebSocket authenticated by ticket only

Browsers cannot attach DPoP or bearer credentials to a WebSocket handshake, so the client trades
its storage credentials for a single-use ticket of at most 300 seconds bound to room and agent.
The relay never accepts cookies, which removes cross-site WebSocket hijacking. The ticket URL
must be `wss` on the ticket endpoint's host and port, so a ticket never leaves that origin.

## Y6 — Explicit refusals: 400, 401, 404, 403, in that order

`404` covers both a missing room and an unreadable one for an authenticated agent, and `401`
both for an unauthenticated one, so the ticket endpoint is not an existence oracle; the order is
fixed so the two cannot both apply. `403` is reserved for an agent who may read the container but not every record
in it: the relay merges the whole log into one state and cannot serve part of it.
**Rejected:** a per-agent filtered relay state (Yjs cannot remove content from a merged state).

## Y7 — Authorization on every message, no grace window

Before each delivery the relay checks the agent may read the room, and before accepting each
update that it may write, against every access change committed before that moment. Loss of
read closes the connection (4403); loss of write leaves it open read-only with a
permission-denied auth message. A relay that learns of access changes through after-the-fact
notifications does not conform. **Rejected:** checking at connect time only, or a short cache
(both keep sending to a revoked agent).

## Y8 — Durability without a new message type

y-websocket has no acknowledgement. The relay persists accepted content before forwarding it,
and answers a sync step 1 only after persisting everything accepted from that connection before
it. A client therefore knows its changes are stored when a sync step 2 answers a sync step 1 it
sent after them, and otherwise writes them to the log itself. The relay answers a sync step 1
only once everything in its room state is held by a confirmed log resource, whichever connection
it came from, so a duplicate submission cannot get an early confirmation (review round 2). This keeps unmodified y-protocols
clients working. **Rejected:** a custom acknowledgement message type (breaks stock clients).

## Y10 — Access control is room-wide

Compaction moves content between resources and the relay merges the whole log, so per-resource
access control inside a room cannot hold. Clients never set it, compactors leave alone resources
they can see carry it, and the relay serves only agents who can read every record. Content meant
for fewer readers goes in another room. A compactor must positively confirm a record inherits the room's access control before
compacting it (in WAC: no ACL resource of its own, which needs Control), and the relay rebuilds
its state when a record leaves the room other than by its own compaction (review round 2).
**Rejected:** carrying the intersection of source ACLs
onto snapshots (not expressible across WAC and ACP, and the relay state still merges everything).

## Y11 — Tickets carry the authorization context, and the handshake Origin must match

WAC decides on agent and Origin, and Solid-OIDC on client identifier too. A ticket bound only to
the agent would let one application's ticket act with another's permissions, so the ticket binds
the whole authorization context and the handshake's Origin must equal the ticket request's.

## Y9 — Legacy y-solid 0.1 rooms stay readable

Headerless updates named `<15-digit ms>-<uuid>` are applied when readers support them (SHOULD)
and never written. The name pattern plus failed magic plus a successful decode identify them.

## Open

- Awareness payload conventions (user name, colour, cursor shape) are left to applications.
- Room-level quotas and relay back-pressure are left to implementations.
- The `ssd:YjsDocument` type for room containers (suite ADR-006 D2) is not defined here yet.
