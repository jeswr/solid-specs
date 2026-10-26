// AUTHORED-BY Codex GPT-6.1-Sol
// Fixed client IDs, GUIDs, times and nonces make these fixtures byte-stable.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as Y from "../../../tools/spec-check/node_modules/yjs/dist/yjs.mjs";

// Resolve the already-installed spec-check dependency; the spec is not a package.
const require = createRequire(new URL("../../../tools/spec-check/package.json", import.meta.url));
const version = require("yjs/package.json").version;
if (version !== "13.6.31") throw new Error(`Expected yjs 13.6.31, got ${version}`);

function document(clientID) {
  const doc = new Y.Doc({ guid: `vector-${clientID}` });
  doc.clientID = clientID;
  return doc;
}

function textUpdate(clientID, text) {
  const doc = document(clientID);
  try {
    doc.getText("text").insert(0, text);
    return Y.encodeStateAsUpdate(doc);
  } finally {
    doc.destroy();
  }
}

function appendUpdate(clientID, base, text) {
  const doc = document(clientID);
  try {
    Y.applyUpdate(doc, base);
    const before = Y.encodeStateVector(doc);
    const shared = doc.getText("text");
    shared.insert(shared.length, text);
    return Y.encodeStateAsUpdate(doc, before);
  } finally {
    doc.destroy();
  }
}

function snapshot(clientID, updates) {
  const doc = document(clientID);
  try {
    for (const update of updates) Y.applyUpdate(doc, update);
    return Y.encodeStateAsUpdate(doc);
  } finally {
    doc.destroy();
  }
}

function record(kind, time, nonce, payload) {
  const header = Buffer.alloc(16);
  header.write(kind, 0, "ascii");
  header.writeBigUInt64BE(BigInt(time), 4);
  header.writeUInt32BE(nonce, 12);
  return Buffer.concat([header, payload]);
}

const resource = (name, body) => ({ name, hex: Buffer.from(body).toString("hex") });
const loaded = (text, valid, invalid = []) => ({ text: { text }, valid, invalid });
export function generateManifest() {
  const cases = [];
  const add = (id, description, statements, resources, expect) =>
    cases.push({ id, description, statements, resources, expect });

  const hi = textUpdate(10, "hi");
  const update = resource("server-chosen-name", record("JYU1", 1000, 0x01020304, hi));
  const snap = resource("snapshot", record("JYS1", 2000, 0x05060708, snapshot(100, [hi])));
  const legacyName = "001761480000000-0f8e2c6a-3b1d-4f5e-9a7c-2d4b6e8f0a1c";
  const legacy = resource(legacyName, hi);

  add("header-update-hi",
    "JYU1 inserting hi: header 4A 59 55 31 00 00 00 00 00 00 03 E8 01 02 03 04; time 1000 ms, nonce 0x01020304; v1 payload follows at byte 16.",
    ["enc-layout", "enc-time", "enc-valid"], [update],
    { kind: "update", time: 1000, nonce: 0x01020304 });
  add("single-update-hi", "One valid JYU1 resource with a server-chosen name inserts hi.",
    ["enc-layout", "enc-valid", "enc-media-type-ignore", "load-all"], [update],
    loaded("hi", [update.name]));
  add("header-snapshot", "JYS1: header 4A 59 53 31 00 00 00 00 00 00 07 D0 05 06 07 08; a full-state Yjs v1 update is the snapshot payload.",
    ["enc-layout", "enc-valid"], [snap],
    { kind: "snapshot", time: 2000, nonce: 0x05060708 });
  add("single-snapshot", "A JYS1 snapshot alone restores hi.",
    ["enc-valid", "load-all"], [snap], loaded("hi", [snap.name]));

  // B and C both depend on A, but neither contains the other concurrent insertion.
  const A = textUpdate(1, "A");
  const B = appendUpdate(2, A, "B");
  const C = appendUpdate(3, A, "C");
  const ab = resource("snapshot-ab", record("JYS1", 2000, 20, snapshot(101, [A, B])));
  const ac = resource("snapshot-ac", record("JYS1", 3000, 30, snapshot(102, [A, C])));
  const offline = resource("offline-c", record("JYU1", 1000, 10, C));
  add("offline-older-than-snapshot",
    "Snapshot S at time 2000 contains A and B; offline update C at time 1000 is absent from S. C depends on A and must survive even when read before S. Filtering by snapshot time loses C.",
    ["enc-valid", "load-all", "load-order"], [ab, offline],
    loaded("ABC", [ab.name, offline.name]));
  add("concurrent-snapshots",
    "Concurrent snapshots contain A+B and A+C respectively; each lacks the other's insertion. Loading both must retain A+B+C, including the older snapshot's B.",
    ["load-all", "load-order"], [ac, ab], loaded("ABC", [ac.name, ab.name]));
  add("overlapping-snapshots-and-updates",
    "The two snapshots overlap on A, and the original A and C are also present. Reapplying overlapping content is harmless.",
    ["load-all"], [ac, offline, resource("original-a", record("JYU1", 500, 5, A)), ab],
    loaded("ABC", [ac.name, offline.name, "original-a", ab.name]));
  const pending = resource("pending-snapshot", record("JYS1", 500, 40, snapshot(103, [C])));
  const dependency = resource("dependency-a", record("JYU1", 600, 50, A));
  add("snapshot-with-pending-update",
    "A snapshot made before its compactor sees A must retain C's unintegrated content. A later resource supplies A and makes C visible.",
    ["cmp-snapshot", "cmp-pending", "load-all"], [pending, dependency],
    loaded("AC", [pending.name, dependency.name]));

  add("header-legacy", "The exact legacy name supplies time 1761480000000 and nonce 0; the entire headerless body is the v1 update.",
    ["legacy-read"], [legacy], { kind: "legacy", time: 1761480000000, nonce: 0 });
  add("legacy-update", "A supported headerless legacy resource inserts hi.",
    ["legacy-read", "load-all"], [legacy], loaded("hi", [legacy.name]));
  const emptyLegacy = resource(legacyName, snapshot(104, []));
  add("short-valid-legacy", "A two-byte empty Yjs update is valid under the legacy rule despite being shorter than a record header.",
    ["legacy-read"], [emptyLegacy], { kind: "legacy", time: 1761480000000, nonce: 0 });
  add("headed-legacy-name", "A headed resource takes its kind, time and nonce from its header even when its name matches the legacy pattern.",
    ["enc-valid", "enc-media-type-ignore"], [resource(legacyName, record("JYS1", 42, 7, hi))],
    { kind: "snapshot", time: 42, nonce: 7 });
  add("header-zero-time-max-nonce", "Zero is a valid timestamp; FF FF FF FF is unsigned nonce 4294967295.",
    ["enc-time", "enc-valid"], [resource("zero-time", record("JYU1", 0, 0xffffffff, hi))],
    { kind: "update", time: 0, nonce: 4294967295 });
  add("header-max-safe-time", "00 1F FF FF FF FF FF FF is the largest permitted time (2^53 - 1); nonce zero is valid.",
    ["enc-time", "enc-valid"], [resource("max-time", record("JYU1", 9007199254740991n, 0, hi))],
    { kind: "update", time: 9007199254740991, nonce: 0 });

  const ties = [
    resource("a-high-nonce", record("JYU1", 1000, 0xffffffff, C)),
    resource("z-low-nonce", record("JYU1", 1000, 1, B)),
    resource("m-low-nonce", record("JYU1", 1000, 1, A)),
  ];
  add("ordering-key-tie-break",
    "All times are 1000. Unsigned nonce 1 precedes 4294967295 regardless of name; equal nonces then compare resource IRIs by code point. Ascending names: m-low-nonce, z-low-nonce, a-high-nonce.",
    ["load-order", "load-all"], ties, loaded("ABC", ties.map((r) => r.name)));

  // Removing the final delete-set byte leaves complete insert structs: applying this
  // payload directly can mutate a Y.Doc before it throws. Decode before applying it.
  const truncated = textUpdate(4, "poison").slice(0, -1);
  const wrongMagic = record("BAD1", 1000, 1, hi);
  const invalid = [
    resource("short-header", record("JYU1", 1000, 1, hi).subarray(0, 15)),
    resource("wrong-magic", wrongMagic),
    resource("unsafe-time", record("JYU1", 9007199254740992n, 1, hi)),
    resource("undecodable-payload", record("JYU1", 1000, 1, truncated)),
    resource(legacyName, truncated),
    resource("empty-payload", record("JYS1", 1000, 1, new Uint8Array())),
    resource("unrecognised-headerless-name", hi),
    resource(legacyName.replace("0f8e", "0F8E"), hi),
    resource("1761480000000-0f8e2c6a-3b1d-4f5e-9a7c-2d4b6e8f0a1c", hi),
  ];
  const invalidDescriptions = [
    "A body shorter than 16 bytes (15 bytes of an otherwise valid header).",
    "Wrong magic BAD1, with a non-legacy name, even though the header fields and payload are otherwise valid.",
    "A valid magic with time 2^53, one greater than the safe integer limit.",
    "Valid JYU1 header, but the payload has complete insert structs followed by a truncated delete set; unsafe application would partially insert poison.",
    "A legacy name cannot rescue a headerless body whose Yjs decode fails after complete insert structs.",
    "An exactly 16-byte JYS1 header without a Yjs payload cannot decode.",
    "A valid headerless Yjs update without the required legacy name is not a log resource.",
    "Uppercase hexadecimal in the UUID does not match the case-sensitive legacy name pattern.",
    "A 13-digit time does not match the 15-digit legacy name pattern.",
  ];
  const invalidIds = ["short-header", "wrong-magic", "unsafe-time", "undecodable-payload",
    "legacy-undecodable", "empty-payload", "headerless-name", "legacy-uppercase", "legacy-short-time"];
  invalid.forEach((r, i) => add(`invalid-${invalidIds[i]}`, invalidDescriptions[i],
    ["enc-valid", "load-invalid", "load-atomic", ...(i === 4 || i >= 6 ? ["legacy-read"] : [])],
    [r], loaded("", [], [r.name])));
  add("reject-invalid-without-partial-application",
    "Load hi alongside all malformed resources. Validate each whole payload before application: none may insert even part of poison, in either ordering direction.",
    ["enc-valid", "enc-time", "load-all", "load-invalid", "load-atomic", "legacy-read"],
    [invalid[3], update, ...invalid.filter((_, i) => i !== 3)],
    loaded("hi", [update.name], invalid.map((r) => r.name)));

  return { profile: "https://jeswr.org/ns/solid-sd#y-protocol-v1", yjs: version, cases };
}

export function generate(output = fileURLToPath(new URL("manifest.json", import.meta.url))) {
  writeFileSync(output, `${JSON.stringify(generateManifest(), null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generate(process.argv[2]);
}
