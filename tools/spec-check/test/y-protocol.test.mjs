// AUTHORED-BY Codex GPT-6.1-Sol
// Offline checks of the Yjs profile's companion, byte layout and loading vectors.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import * as Y from "yjs";
import { generate } from "../../../specs/y-protocol/vectors/generate.mjs";
import { REPO, htmlIds, normalizeHtml, readTurtle, validate } from "../lib.mjs";

const SPEC = join(REPO, "specs/y-protocol");
const SPEC_IRI = "https://jeswr.github.io/solid-specs/specs/y-protocol/";
const COMPANION_IRI = `${SPEC_IRI}spec.statements.ttl`;
const MANIFEST_IRI = `${SPEC_IRI}vectors/manifest.json`;
const ROOM_IRI = "https://pod.example/room/";
const SC = "https://w3id.org/jeswr/spec-companion#";
const SPEC_NS = "http://www.w3.org/ns/spec#";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const IDENTIFIER = "http://purl.org/dc/terms/identifier";
// Use Yjs's existing lib0 dependency without adding a workspace dependency.
const require = createRequire(import.meta.url);
const { hasContent } = createRequire(require.resolve("yjs/package.json"))("lib0/decoding");
const html = readFileSync(join(SPEC, "index.html"), "utf8");
const manifestBytes = readFileSync(join(SPEC, "vectors/manifest.json"));
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const statements = readTurtle(join(SPEC, "spec.statements.ttl"), COMPANION_IRI);
const companionShape = readTurtle(join(REPO, "tools/spec-check/shapes/spec-companion.shape.ttl"));
const paragraphs = [...html.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)].map((m) => ({
  id: m[1].match(/\bid="([^"]+)"/)?.[1],
  text: normalizeHtml(m[2]),
}));
const normative = paragraphs.filter((p) => /\b(MUST|SHOULD|MAY)\b/.test(p.text));
const paragraphById = new Map(paragraphs.filter((p) => p.id).map((p) => [p.id, p.text]));
const objects = (s, p) => statements
  .filter((q) => q.subject.value === s && q.predicate.value === p)
  .map((q) => q.object.value);
const value = (s, p) => {
  const values = objects(s, p);
  assert.equal(values.length, 1, `${s}: exactly one ${p}`);
  return values[0];
};
const subjectsOfType = (type) => statements
  .filter((q) => q.predicate.value === RDF_TYPE && q.object.value === type)
  .map((q) => q.subject.value);
const requirements = subjectsOfType(`${SPEC_NS}Requirement`);

function decodePayload(payload) {
  let decoder;
  // The exported decoder hook exposes the cursor after structs AND the delete set.
  Y.decodeUpdateV2(payload, class extends Y.UpdateDecoderV1 {
    constructor(restDecoder) {
      super(restDecoder);
      decoder = restDecoder;
    }
  });
  if (hasContent(decoder)) throw new Error("Trailing bytes in Yjs v1 payload");
}

/** Independent reader of the draft's table and legacy definition; no generator imports. */
function decodeResource(resource) {
  const body = Buffer.from(resource.hex, "hex");
  const iri = ROOM_IRI + resource.name;
  const magic = body.subarray(0, 4).toString("hex");
  let kind, time, nonce, payload;
  if (magic === "4a595531" || magic === "4a595331") {
    if (body.length < 16) return { kind: "invalid" };
    const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
    const rawTime = view.getBigUint64(4, false);
    if (rawTime > 9007199254740991n) return { kind: "invalid" };
    kind = magic === "4a595531" ? "update" : "snapshot";
    time = Number(rawTime);
    nonce = view.getUint32(12, false);
    payload = body.subarray(16);
  } else {
    const name = iri.slice(iri.lastIndexOf("/") + 1);
    if (!/^[0-9]{15}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(name)) {
      return { kind: "invalid" };
    }
    kind = "legacy";
    time = Number(name.slice(0, 15));
    nonce = 0;
    payload = body;
  }
  // Decoding alone can ignore trailing bytes or accept structs that fail to
  // integrate. A valid payload must also apply to a fresh, empty document.
  const probe = room();
  try {
    decodePayload(payload);
    Y.applyUpdate(probe, payload);
  } catch {
    return { kind: "invalid" };
  } finally {
    probe.destroy();
  }
  return { kind, time, nonce, payload, iri, name: resource.name };
}

function compareCodePoints(a, b) {
  const left = Array.from(a, (c) => c.codePointAt(0));
  const right = Array.from(b, (c) => c.codePointAt(0));
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return left.length - right.length;
}

const orderingKey = (a, b) => a.time - b.time || a.nonce - b.nonce || compareCodePoints(a.iri, b.iri);

function room(clientID = 0x7fffffff) {
  const doc = new Y.Doc({ guid: "vector-test-room" });
  doc.clientID = clientID;
  return doc;
}

function applyPayloadAtomically(doc, payload) {
  const copy = room(0x7ffffffe);
  try {
    // Include pending structs and delete sets, not just integrated state.
    Y.applyUpdate(copy, Y.encodeStateAsUpdate(doc));
    Y.applyUpdate(copy, payload);
  } catch {
    return false;
  } finally {
    copy.destroy();
  }
  Y.applyUpdate(doc, payload);
  return true;
}

function acceptResource(doc, resource) {
  const decoded = decodeResource(resource);
  return decoded.kind !== "invalid" && applyPayloadAtomically(doc, decoded.payload);
}

function assertUnchangedAfterRejection(doc, attempt, name) {
  // Full update bytes include pending content as well as integrated state, unlike
  // a text-only or state-vector check. No update event may escape either.
  const before = Y.encodeStateAsUpdate(doc);
  const beforeVector = Y.encodeStateVector(doc);
  const beforeContent = doc.toJSON();
  let events = 0;
  const onUpdate = () => { events++; };
  doc.on("update", onUpdate);
  try {
    assert.equal(attempt(), false, name);
    assert.deepEqual(Y.encodeStateAsUpdate(doc), before, `${name}: mutated room state`);
    assert.deepEqual(Y.encodeStateVector(doc), beforeVector, `${name}: mutated state vector`);
    assert.deepEqual(doc.toJSON(), beforeContent, `${name}: mutated content`);
    assert.equal(events, 0, `${name}: emitted a partial update`);
  } finally {
    doc.off("update", onUpdate);
  }
}

function assertRejectedWithoutMutation(doc, resource) {
  assertUnchangedAfterRejection(doc, () => acceptResource(doc, resource), resource.name);
}

function documentText(doc, expected) {
  // Resolve the named shared types as Y.Text before inspecting all root types.
  for (const name of Object.keys(expected)) doc.getText(name);
  return Object.fromEntries([...doc.share].map(([name, type]) => {
    assert.ok(type instanceof Y.Text, `${name}: expected Y.Text`);
    return [name, type.toString()];
  }));
}

describe("y-protocol statement companion", () => {
  it("has one companion for this spec and pins the exact draft bytes", () => {
    assert.deepEqual(subjectsOfType(`${SC}CompanionDocument`), [COMPANION_IRI]);
    assert.equal(value(COMPANION_IRI, `${SC}companionOf`), SPEC_IRI);
    assert.equal(value(COMPANION_IRI, `${SC}specVersion`), `sha256:${createHash("sha256").update(html).digest("hex")}`);
    assert.deepEqual(subjectsOfType(`${SPEC_NS}Specification`), [SPEC_IRI]);
    assert.ok(requirements.length > 70);
    assert.deepEqual(objects(SPEC_IRI, `${SPEC_NS}requirement`).sort(), [...requirements].sort());
  });

  it("conforms to the companion shapes", async () => {
    const report = await validate(companionShape, statements);
    assert.ok(report.conforms, JSON.stringify(report.results, null, 2));
  });

  it("defines all four conformance classes, including the storage server", () => {
    assert.deepEqual(subjectsOfType(`${SC}ConformanceClass`).sort(),
      ["Client", "Relay", "Compactor", "StorageServer"].map((id) => `${COMPANION_IRI}#${id}`).sort());
    assert.equal(value(`${COMPANION_IRI}#StorageServer`, `${SC}definedBy`), `${SPEC_IRI}#conformance`);
    const etagRequirement = requirements.find((r) => value(r, `${SC}anchor`) === `${SPEC_IRI}#srv-etag`);
    assert.deepEqual(objects(etagRequirement, `${SPEC_NS}requirementSubject`), [`${COMPANION_IRI}#StorageServer`]);
  });

  it("has exactly one verbatim statement per normative paragraph, at its actual anchor", () => {
    assert.deepEqual(normative.filter((p) => !p.id), [], "unanchored normative paragraphs");
    const anchors = [];
    const identifiers = [];
    for (const requirement of requirements) {
      const identifier = value(requirement, IDENTIFIER);
      assert.match(identifier, /^YP-(ENC|LEGACY|WRITE|LOAD|WATCH|CMP|SRV|ACL|TKT|CONN|MSG|AUTH|PERSIST|INGEST|AW|DUR|DISC|SEC)-[1-9][0-9]*$/);
      assert.equal(requirement, `${COMPANION_IRI}#${identifier}`);
      identifiers.push(identifier);
      const anchor = value(requirement, `${SC}anchor`);
      assert.ok(anchor.startsWith(`${SPEC_IRI}#`), anchor);
      const id = anchor.slice(SPEC_IRI.length + 1);
      anchors.push(id);
      assert.ok(htmlIds(html).has(id), anchor);
      assert.equal(value(requirement, `${SPEC_NS}statement`), paragraphById.get(id), anchor);
      const keyword = paragraphById.get(id).match(/\b(MUST NOT|SHOULD NOT|MUST|SHOULD|MAY)\b/)?.[1];
      assert.ok(keyword, `${id}: not a normative paragraph`);
      assert.equal(value(requirement, `${SPEC_NS}requirementLevel`), SPEC_NS + keyword.replaceAll(" ", ""));
    }
    assert.equal(new Set(identifiers).size, identifiers.length, "duplicate identifiers");
    assert.equal(new Set(anchors).size, anchors.length, "duplicate paragraphs");
    assert.deepEqual(anchors.sort(), normative.map((p) => p.id).sort());
  });

  it("links the cases that exercise each statement and records remaining gaps", () => {
    for (const requirement of requirements) {
      const id = value(requirement, `${SC}anchor`).slice(SPEC_IRI.length + 1);
      const expected = manifest.cases.filter((c) => c.statements.includes(id)).map((c) => `${MANIFEST_IRI}#${c.id}`);
      const linked = objects(requirement, `${SPEC_NS}testCase`);
      assert.deepEqual(linked.sort(), expected.sort(), requirement);
      if (!linked.length) assert.ok(objects(requirement, `${SC}testGap`).length, `${id}: unexplained test gap`);
    }
  });
});

describe("y-protocol vectors", () => {
  it("pins the profile and installed Yjs version and has well-formed, traceable cases", () => {
    assert.equal(manifest.profile, "https://jeswr.org/ns/solid-sd#y-protocol-v1");
    assert.equal(manifest.yjs, "13.6.31");
    assert.equal(createRequire(import.meta.url)("yjs/package.json").version, manifest.yjs);
    assert.ok(manifest.cases.length >= 15);
    assert.equal(new Set(manifest.cases.map((c) => c.id)).size, manifest.cases.length);
    for (const c of manifest.cases) {
      assert.ok(c.id && c.description && c.statements.length && c.resources.length, c.id);
      assert.equal(new Set(c.resources.map((r) => r.name)).size, c.resources.length, `${c.id}: duplicate names`);
      for (const r of c.resources) {
        assert.ok(r.name && !/[\/#?]/.test(r.name), `${c.id}: name must be a final path segment`);
        assert.match(r.hex, /^(?:[0-9a-f]{2})*$/, `${c.id}/${r.name}: canonical hexadecimal bytes`);
      }
      for (const id of c.statements) {
        assert.ok(paragraphById.has(id), `${c.id}: no paragraph ${id}`);
        assert.ok(normative.some((p) => p.id === id), `${c.id}: paragraph ${id} is not normative`);
      }
    }
  });

  for (const c of manifest.cases) {
    it(c.id, () => {
      if (Object.hasOwn(c.expect, "kind")) {
        assert.equal(c.resources.length, 1, "a decode case holds one resource");
        const decoded = decodeResource(c.resources[0]);
        const actual = decoded.kind === "invalid" ? { kind: "invalid" }
          : { kind: decoded.kind, time: decoded.time, nonce: decoded.nonce };
        assert.deepEqual(actual, c.expect, c.description);
        if (decoded.kind === "invalid") {
          const doc = room();
          try {
            doc.getText("text").insert(0, "untouched");
            assertRejectedWithoutMutation(doc, c.resources[0]);
            assert.equal(doc.getText("text").toString(), "untouched");
          } finally {
            doc.destroy();
          }
        }
        return;
      }

      const records = c.resources.map(decodeResource);
      const valid = records.filter((r) => r.kind !== "invalid").sort(orderingKey);
      const invalid = c.resources.filter((_, i) => records[i].kind === "invalid");
      assert.deepEqual(valid.map((r) => r.name).sort(), [...c.expect.valid].sort(), "valid classification");
      assert.deepEqual(invalid.map((r) => r.name).sort(), [...c.expect.invalid].sort(), "invalid classification");
      assert.equal(c.expect.valid.length + c.expect.invalid.length, c.resources.length, "every resource classified");
      const resourcesByName = new Map(c.resources.map((r) => [r.name, r]));
      let ascendingState;
      for (const order of [valid, [...valid].reverse()]) {
        const doc = room();
        try {
          for (const r of invalid) assertRejectedWithoutMutation(doc, r);
          for (const r of order) assert.equal(acceptResource(doc, resourcesByName.get(r.name)), true);
          for (const r of invalid) assertRejectedWithoutMutation(doc, r);
          assert.deepEqual(documentText(doc, c.expect.text), c.expect.text, c.description);
          const state = Y.encodeStateAsUpdate(doc);
          if (ascendingState) assert.deepEqual(state, ascendingState, "reverse loading must converge to identical state");
          else ascendingState = state;
        } finally {
          doc.destroy();
        }
      }
    });
  }

  it("uses unsigned nonce, then resource IRI code points to break equal-time ties", () => {
    const c = manifest.cases.find((c) => c.id === "ordering-key-tie-break");
    const ordered = c.resources.map(decodeResource).sort(orderingKey);
    assert.deepEqual(ordered.map((r) => r.time), [1000, 1000, 1000]);
    assert.deepEqual(ordered.map((r) => r.nonce), [1, 1, 4294967295]);
    assert.deepEqual(ordered.map((r) => r.name), ["m-low-nonce", "z-low-nonce", "a-high-nonce"]);
    // UTF-16 string order and locale collation are not Unicode code-point order.
    const iri = (name) => ({ time: 0, nonce: 0, iri: ROOM_IRI + name });
    assert.ok(orderingKey(iri("\ue000"), iri("\u{10000}")) < 0);
  });

  it("includes a malformed payload that would mutate a room if applied before validation", () => {
    const c = manifest.cases.find((c) => c.id === "invalid-undecodable-payload");
    const payload = Buffer.from(c.resources[0].hex, "hex").subarray(16);
    assert.throws(() => Y.decodeUpdate(payload));
    const doc = room();
    try {
      assert.throws(() => Y.applyUpdate(doc, payload));
      assert.equal(doc.getText("text").toString(), "poison", "fixture must expose partial application");
    } finally {
      doc.destroy();
    }
  });

  it("rejects trailing bytes even when Y.decodeUpdate accepts the update", () => {
    const c = manifest.cases.find((c) => c.id === "invalid-trailing-payload-bytes");
    const payload = Buffer.from(c.resources[0].hex, "hex").subarray(16);
    assert.doesNotThrow(() => Y.decodeUpdate(payload));
    assert.throws(() => decodePayload(payload), /Trailing bytes/);
    const doc = room();
    try {
      Y.applyUpdate(doc, payload);
      assert.equal(doc.getText("text").toString(), "hi");
      assert.equal(decodeResource(c.resources[0]).kind, "invalid");
    } finally {
      doc.destroy();
    }
  });

  it("rejects a fully decoded payload that throws after partially applying to an empty document", () => {
    const c = manifest.cases.find((c) => c.id === "invalid-unapplicable-payload");
    const payload = Buffer.from(c.resources[0].hex, "hex").subarray(16);
    assert.equal(payload.toString("hex"), "01020100040101740141840164014200");
    assert.doesNotThrow(() => Y.decodeUpdate(payload));
    assert.doesNotThrow(() => decodePayload(payload));
    const doc = room();
    try {
      assert.throws(() => Y.applyUpdate(doc, payload));
      assert.equal(doc.getText("t").toString(), "A", "fixture must expose partial application");
      assert.equal(decodeResource(c.resources[0]).kind, "invalid");
    } finally {
      doc.destroy();
    }
  });

  it("keeps live state, content and pending updates intact when application to a copy fails", () => {
    const pending = manifest.cases.find((c) => c.id === "snapshot-with-pending-update").resources[0];
    for (const id of ["invalid-undecodable-payload", "invalid-unapplicable-payload"]) {
      const resource = manifest.cases.find((c) => c.id === id).resources[0];
      const payload = Buffer.from(resource.hex, "hex").subarray(16);
      const doc = room();
      try {
        doc.getText("text").insert(0, "untouched");
        assert.equal(acceptResource(doc, pending), true);
        assert.ok(doc.store.pendingStructs, "live room must hold pending content");
        // Exercise the copy's failure path directly; resource validation already
        // rejects these payloads before normal loading reaches this step.
        assertUnchangedAfterRejection(doc, () => applyPayloadAtomically(doc, payload), id);
        assert.equal(doc.getText("text").toString(), "untouched");
      } finally {
        doc.destroy();
      }
    }
  });

  it("regenerates the manifest byte-for-byte", () => {
    const temporary = mkdtempSync(join(tmpdir(), "y-protocol-vectors-"));
    try {
      const output = join(temporary, "manifest.json");
      generate(output);
      assert.deepEqual(readFileSync(output), manifestBytes);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });
});
