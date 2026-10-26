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
(ADR-006 review, 2026-10-26).

## Y4 — Compaction: create first, delete only what you read, conditionally

A compactor writes a snapshot holding everything it read, waits for a `2xx`, then deletes only
those resources, with `If-Match`. Unique names and conditional creation keep an IRI from ever
naming two records, so a delayed compactor cannot delete a newer record that reused a URL
(ADR-006 review). This needs no lock and stays safe with any number of concurrent or offline
compactors. **Rejected:** serialized compaction through a lock resource (needs leases and
liveness in a storage that has neither); merging snapshots in place (read-modify-write race).

## Y5 — Tickets over HTTP, then a WebSocket authenticated by ticket only

Browsers cannot attach DPoP or bearer credentials to a WebSocket handshake, so the client trades
its storage credentials for a single-use ticket of at most 300 seconds bound to room and agent.
The relay never accepts cookies, which removes cross-site WebSocket hijacking. The ticket URL
must be `wss` on the ticket endpoint's host and port, so a ticket never leaves that origin.

## Y6 — Explicit refusals: 400, 401, 404, 403

`404` covers both a missing room and an unreadable one, so the ticket endpoint is not an
existence oracle. `403` is reserved for an agent who may read the container but not every record
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
sent after them, and otherwise writes them to the log itself. This keeps unmodified y-protocols
clients working. **Rejected:** a custom acknowledgement message type (breaks stock clients).

## Y9 — Legacy y-solid 0.1 rooms stay readable

Headerless updates named `<15-digit ms>-<uuid>` are applied when readers support them (SHOULD)
and never written. The name pattern plus failed magic plus a successful decode identify them.

## Open

- Awareness payload conventions (user name, colour, cursor shape) are left to applications.
- Room-level quotas and relay back-pressure are left to implementations.
- The `ssd:YjsDocument` type for room containers (suite ADR-006 D2) is not defined here yet.
