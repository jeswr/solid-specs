// AUTHORED-BY Claude Opus 5.5
// Gate checks for specs/service-description: shapes against the example vectors, JSON-LD
// examples against their Turtle twins, vocabulary coverage, and statement-companion fidelity.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, it } from "node:test";
import {
  REPO,
  canonical,
  htmlExamples,
  htmlIds,
  jsonldToNQuads,
  jsonldToQuads,
  listFiles,
  normalizeHtml,
  parseTurtle,
  readTurtle,
  toNQuads,
  validate,
} from "../lib.mjs";

const SPEC = join(REPO, "specs/service-description");
const SSD = "https://jeswr.org/ns/solid-sd#";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const html = readFileSync(join(SPEC, "index.html"), "utf8");
const shapes = readTurtle(join(SPEC, "shapes/solid-sd.ttl"));
const vocab = readTurtle(join(SPEC, "vocab/solid-sd.ttl"));
const companionShape = readTurtle(join(REPO, "tools/spec-check/shapes/spec-companion.shape.ttl"));
const statements = readTurtle(join(SPEC, "spec.statements.ttl"), "https://jeswr.github.io/solid-specs/specs/service-description/spec.statements.ttl");

const definedTerms = new Set(
  vocab
    .filter((q) => q.predicate.value === "http://www.w3.org/2000/01/rdf-schema#isDefinedBy")
    .map((q) => q.subject.value),
);

const DID = "https://www.w3.org/ns/did#";
const PIM_STORAGE = "http://www.w3.org/ns/pim/space#Storage";
const LWS_STORAGE_ROOT = "https://www.w3.org/ns/lws#StorageRoot";

/**
 * SSD-DM-3 for Solid descriptions, which SHACL core cannot express: a pim:Storage subject that
 * lists services has a StorageRoot service whose endpoint is the subject itself.
 */
function solidRootCheck(quads) {
  const has = (s, p, o) => quads.some((q) => q.subject.value === s && q.predicate.value === p && q.object.value === o);
  const objects = (s, p) => quads.filter((q) => q.subject.value === s && q.predicate.value === p).map((q) => q.object.value);
  const storages = new Set(quads.filter((q) => q.predicate.value === `${DID}service`).map((q) => q.subject.value));
  const results = [];
  for (const storage of storages) {
    if (!has(storage, RDF_TYPE, PIM_STORAGE)) continue;
    const ok = objects(storage, `${DID}service`).some(
      (svc) => has(svc, RDF_TYPE, LWS_STORAGE_ROOT) && has(svc, `${DID}serviceEndpoint`, storage),
    );
    if (!ok) results.push({ severity: "http://www.w3.org/ns/shacl#Violation", focus: storage, message: "The lws:StorageRoot service of a Solid storage MUST have the storage root as its endpoint (SSD-DM-3)." });
  }
  return results;
}

async function check(quads) {
  const report = await validate(shapes, quads);
  const extra = solidRootCheck(quads);
  return { conforms: report.conforms && extra.length === 0, results: [...report.results, ...extra] };
}

function describeFailures(report) {
  return report.results.map((r) => `${r.severity?.split("#")[1]} ${r.focus}: ${r.message}`).join("\n");
}

describe("valid examples conform to the shapes", () => {
  for (const file of listFiles(join(SPEC, "examples"), ".ttl")) {
    it(basename(file), async () => {
      const report = await check(readTurtle(file));
      assert.ok(report.conforms, describeFailures(report));
    });
  }
  for (const file of listFiles(join(SPEC, "examples"), ".jsonld")) {
    it(basename(file), async () => {
      const quads = await jsonldToQuads(JSON.parse(readFileSync(file, "utf8")));
      const report = await check(quads);
      assert.ok(report.conforms, describeFailures(report));
    });
  }
});

describe("invalid examples are rejected for the expected reason", () => {
  for (const file of listFiles(join(SPEC, "examples/invalid"), ".ttl")) {
    it(basename(file), async () => {
      const text = readFileSync(file, "utf8");
      const expect = text.match(/^# EXPECT: (.+)$/m)?.[1].trim();
      assert.ok(expect, "invalid vector names its expected statement with '# EXPECT:'");
      const report = await check(parseTurtle(text, `file://${file}`));
      assert.equal(report.conforms, false, "vector unexpectedly conforms");
      assert.ok(
        report.results.some((r) => r.message.includes(expect)),
        `no result cites ${expect}:\n${describeFailures(report)}`,
      );
    });
  }
});

describe("media type length boundary (RFC 6838 caps names at 127 characters)", () => {
  it("a 127-character subtype conforms", async () => {
    const turtle = `@prefix pim: <http://www.w3.org/ns/pim/space#> . @prefix lws: <https://www.w3.org/ns/lws#> . @prefix did: <https://www.w3.org/ns/did#> . @prefix ssd: <${SSD}> .
<https://pod.example/> a pim:Storage ; did:service [ a lws:StorageRoot ; did:serviceEndpoint <https://pod.example/> ] ; lws:capability [ a ssd:PatchSupport ; ssd:source "text/turtle" ; ssd:patchType "text/${"a".repeat(127)}" ] .`;
    const report = await check(parseTurtle(turtle, "https://pod.example/"));
    assert.ok(report.conforms, describeFailures(report));
  });
});

describe("JSON-LD context order (SSD-REP-3)", () => {
  const CID = "https://www.w3.org/ns/cid/v1";
  const LWS = "https://www.w3.org/ns/lws/v1";
  const SSD_CONTEXT = "https://jeswr.org/ns/solid-sd/context/v1";
  const ssdContext = JSON.parse(readFileSync(join(SPEC, "context/v1.jsonld"), "utf8"))["@context"];
  const docs = [
    ...listFiles(join(SPEC, "examples"), ".jsonld").map((f) => [basename(f), readFileSync(f, "utf8")]),
    ...htmlExamples(html)
      .map((b, i) => [`spec example ${i + 1}`, b.trim()])
      .filter(([, t]) => t.startsWith("{")),
  ];
  it("there are JSON-LD documents to check", () => assert.ok(docs.length >= 2));
  for (const [name, text] of docs) {
    it(name, () => {
      const ctx = JSON.parse(text)["@context"];
      assert.ok(Array.isArray(ctx), "@context is an array");
      assert.deepEqual(ctx.slice(0, 2), [CID, LWS], "the CID context comes first, then the LWS context");
      const third = ctx[2];
      const inline = typeof third === "object" && third !== null;
      assert.ok(third === SSD_CONTEXT || inline, "the solid-sd context, by IRI or inline, comes third");
      if (inline) assert.deepEqual(third, ssdContext, "an inline third context is exactly the solid-sd context");
    });
  }
});

describe("JSON-LD examples mean the same graph as their Turtle twins", () => {
  for (const file of listFiles(join(SPEC, "examples"), ".jsonld")) {
    it(basename(file), async () => {
      const twin = file.replace(/\.jsonld$/, ".ttl");
      const fromJson = await canonical(await jsonldToNQuads(JSON.parse(readFileSync(file, "utf8"))));
      const fromTurtle = await canonical(toNQuads(readTurtle(twin)));
      assert.equal(fromJson, fromTurtle);
    });
  }
});

describe("examples in the spec text", () => {
  const blocks = htmlExamples(html);
  it("there are examples to check", () => assert.ok(blocks.length >= 2));
  blocks.forEach((block, i) => {
    it(`example ${i + 1} parses and conforms`, async () => {
      const text = block.trim();
      const quads = text.startsWith("{") ? await jsonldToQuads(JSON.parse(text)) : parseTurtle(text, "https://pod.example/");
      const report = await check(quads);
      assert.ok(report.conforms, describeFailures(report));
    });
  });
});

describe("the spec's Turtle and JSON-LD examples describe the same storage", () => {
  it("they canonicalize to the same graph", async () => {
    const blocks = htmlExamples(html).map((b) => b.trim());
    const turtle = blocks.find((b) => !b.startsWith("{"));
    const json = blocks.find((b) => b.startsWith("{"));
    const fromTurtle = await canonical(toNQuads(parseTurtle(turtle, "https://pod.example/")));
    const fromJson = await canonical(await jsonldToNQuads(JSON.parse(json)));
    assert.equal(fromJson, fromTurtle);
  });
});

describe("vocabulary coverage", () => {
  const used = new Set();
  const collect = (iri) => iri.startsWith(SSD) && used.add(iri);
  for (const file of [
    ...listFiles(join(SPEC, "examples"), ".ttl"),
    ...listFiles(join(SPEC, "examples/invalid"), ".ttl"),
    join(SPEC, "shapes/solid-sd.ttl"),
  ]) {
    for (const q of readTurtle(file)) for (const t of [q.subject, q.predicate, q.object]) collect(t.value);
  }
  const context = JSON.parse(readFileSync(join(SPEC, "context/v1.jsonld"), "utf8"));
  JSON.stringify(context).replace(/https:\/\/jeswr\.org\/ns\/solid-sd#[\w-]+/g, (iri) => collect(iri));
  // Scan the text with tags turned into spaces; the implementation-status appendix names
  // deployed terms this draft deliberately does not define, so it is left out.
  const prose = html.replace(/<section[^>]*id="implementation-status"[\s\S]*?<\/section>/, "").replace(/<[^>]+>/g, " ");
  for (const m of prose.matchAll(/\bssd:([\w-]*\w)/g)) used.add(SSD + m[1]);

  it("every ssd: term used is defined in the vocabulary", () => {
    const undefinedTerms = [...used].filter((iri) => !definedTerms.has(iri)).sort();
    assert.deepEqual(undefinedTerms, []);
  });
  it("every vocabulary term is named in the spec text", () => {
    const text = html.replace(/<[^>]+>/g, " ");
    const unnamed = [...definedTerms]
      .filter((iri) => iri !== SSD && !new RegExp(`\\bssd:${iri.slice(SSD.length)}\\b`).test(text))
      .sort();
    assert.deepEqual(unnamed, []);
  });
  it("every context term maps into a known namespace", () => {
    for (const [term, def] of Object.entries(context["@context"])) {
      if (term.startsWith("@")) continue;
      const iri = typeof def === "string" ? def : def["@id"];
      if (iri.startsWith(SSD)) assert.ok(definedTerms.has(iri), `${term} → ${iri} is not in the vocabulary`);
    }
  });
});

describe("statement companion", () => {
  const SPEC_NS = "http://www.w3.org/ns/spec#";
  const text = normalizeHtml(html);
  const ids = htmlIds(html);
  const byPredicate = (p) => statements.filter((q) => q.predicate.value === p);
  const requirements = statements
    .filter((q) => q.predicate.value === RDF_TYPE && q.object.value === `${SPEC_NS}Requirement`)
    .map((q) => q.subject.value);
  const value = (s, p) => statements.find((q) => q.subject.value === s && q.predicate.value === p)?.object.value;

  it("lists requirements", () => assert.ok(requirements.length > 50));

  it("has exactly one companion document, typed so the shape targets it", () => {
    const docs = statements.filter(
      (q) => q.predicate.value === RDF_TYPE && q.object.value === "https://w3id.org/jeswr/spec-companion#CompanionDocument",
    );
    assert.equal(docs.length, 1);
    assert.equal(docs[0].subject.value, "https://jeswr.github.io/solid-specs/specs/service-description/spec.statements.ttl");
  });

  it("conforms to the spec-companion shape (provenance, pinned version, actors, testability, coverage)", async () => {
    const report = await validate(companionShape, statements);
    assert.ok(report.conforms, describeFailures(report));
  });

  it("describes this spec, and the spec lists every requirement", () => {
    const specIri = "https://jeswr.github.io/solid-specs/specs/service-description/";
    assert.equal(byPredicate("https://w3id.org/jeswr/spec-companion#companionOf")[0]?.object.value, specIri);
    const linked = new Set(
      statements.filter((q) => q.subject.value === specIri && q.predicate.value === `${SPEC_NS}requirement`).map((q) => q.object.value),
    );
    assert.deepEqual(requirements.filter((r) => !linked.has(r)), []);
  });

  it("identifiers are unique", () => {
    const idents = byPredicate("http://purl.org/dc/terms/identifier").map((q) => q.object.value);
    assert.equal(new Set(idents).size, idents.length);
  });

  it("every statement is a verbatim quote of the spec text", () => {
    const missing = requirements.filter((r) => !text.includes(value(r, `${SPEC_NS}statement`)));
    assert.deepEqual(missing, []);
  });

  it("every normative paragraph of the spec is anchored and in the companion", () => {
    const quoted = new Set(requirements.map((r) => value(r, `${SPEC_NS}statement`)));
    const paragraphs = [...html.matchAll(/<(p|li)\b([^>]*)>([\s\S]*?)<\/\1>/g)]
      .map((m) => ({ id: m[2].match(/\bid="([^"]+)"/)?.[1], text: normalizeHtml(m[3]) }))
      .filter(({ text }) => /\b(MUST|SHOULD|MAY)\b/.test(text));
    assert.ok(paragraphs.length > 50);
    const unanchored = paragraphs.filter((p) => !p.id).map((p) => p.text.slice(0, 80));
    assert.deepEqual(unanchored, [], "normative paragraphs without an id");
    const unquoted = paragraphs.filter((p) => !quoted.has(p.text)).map((p) => p.id);
    assert.deepEqual(unquoted, []);
  });

  it("every anchor points into this spec at the element that holds the statement", () => {
    const base = "https://jeswr.github.io/solid-specs/specs/service-description/#";
    const elements = new Map(
      [...html.matchAll(/<(p|li)\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => [m[2], normalizeHtml(m[3])]),
    );
    for (const r of requirements) {
      const anchor = value(r, "https://w3id.org/jeswr/spec-companion#anchor");
      assert.ok(anchor.startsWith(base), `${r}: ${anchor}`);
      assert.equal(elements.get(anchor.slice(base.length)), value(r, `${SPEC_NS}statement`), `${r}: ${anchor}`);
    }
  });

  it("every anchor exists in the spec", () => {
    const anchors = byPredicate("https://w3id.org/jeswr/spec-companion#anchor").map((q) => q.object.value.split("#")[1]);
    assert.deepEqual(anchors.filter((a) => !ids.has(a)), []);
  });

  it("the level matches the keyword in the statement", () => {
    for (const r of requirements) {
      const statement = value(r, `${SPEC_NS}statement`);
      const level = value(r, `${SPEC_NS}requirementLevel`).slice(SPEC_NS.length);
      const keyword = statement.match(/\b(MUST NOT|SHOULD NOT|MUST|SHOULD|MAY)\b/)?.[1].replace(" ", "");
      assert.equal(level, keyword, `${r}: ${statement}`);
    }
  });

  it("every invalid vector cites a statement or section that exists", () => {
    const idents = new Set(byPredicate("http://purl.org/dc/terms/identifier").map((q) => q.object.value));
    for (const file of listFiles(join(SPEC, "examples/invalid"), ".ttl")) {
      const expect = readFileSync(file, "utf8").match(/^# EXPECT: (.+)$/m)[1].trim();
      assert.ok(idents.has(expect) || ids.has(expect.replace(/^#/, "")), `${basename(file)}: ${expect}`);
    }
  });
});
