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
const statements = readTurtle(join(SPEC, "spec.statements.ttl"), "https://jeswr.github.io/solid-specs/specs/service-description/spec.statements.ttl");

const definedTerms = new Set(
  vocab
    .filter((q) => q.predicate.value === "http://www.w3.org/2000/01/rdf-schema#isDefinedBy")
    .map((q) => q.subject.value),
);

function describeFailures(report) {
  return report.results.map((r) => `${r.severity?.split("#")[1]} ${r.focus}: ${r.message}`).join("\n");
}

describe("valid examples conform to the shapes", () => {
  for (const file of listFiles(join(SPEC, "examples"), ".ttl")) {
    it(basename(file), async () => {
      const report = await validate(shapes, readTurtle(file));
      assert.ok(report.conforms, describeFailures(report));
    });
  }
  for (const file of listFiles(join(SPEC, "examples"), ".jsonld")) {
    it(basename(file), async () => {
      const quads = await jsonldToQuads(JSON.parse(readFileSync(file, "utf8")));
      const report = await validate(shapes, quads);
      assert.ok(report.conforms, describeFailures(report));
    });
  }
});

describe("invalid examples are rejected for the expected reason", () => {
  for (const file of listFiles(join(SPEC, "examples/invalid"), ".ttl")) {
    it(basename(file), async () => {
      const text = readFileSync(file, "utf8");
      const expect = text.match(/^# EXPECT: (\S+)/m)?.[1];
      assert.ok(expect, "invalid vector names its expected statement with '# EXPECT:'");
      const report = await validate(shapes, parseTurtle(text, `file://${file}`));
      assert.equal(report.conforms, false, "vector unexpectedly conforms");
      assert.ok(
        report.results.some((r) => r.message.includes(expect)),
        `no result cites ${expect}:\n${describeFailures(report)}`,
      );
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
      const report = await validate(shapes, quads);
      assert.ok(report.conforms, describeFailures(report));
    });
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

  it("identifiers are unique", () => {
    const idents = byPredicate("http://purl.org/dc/terms/identifier").map((q) => q.object.value);
    assert.equal(new Set(idents).size, idents.length);
  });

  it("every statement is a verbatim quote of the spec text", () => {
    const missing = requirements.filter((r) => !text.includes(value(r, `${SPEC_NS}statement`)));
    assert.deepEqual(missing, []);
  });

  it("every normative paragraph of the spec is in the companion", () => {
    const quoted = new Set(requirements.map((r) => value(r, `${SPEC_NS}statement`)));
    const paragraphs = [...html.matchAll(/<p id="([^"]+)">([\s\S]*?)<\/p>/g)]
      .map((m) => [m[1], normalizeHtml(m[2])])
      .filter(([, t]) => /\b(MUST|SHOULD|MAY)\b/.test(t));
    const unquoted = paragraphs.filter(([, t]) => !quoted.has(t)).map(([id]) => id);
    assert.deepEqual(unquoted, []);
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
      const expect = readFileSync(file, "utf8").match(/^# EXPECT: (\S+)/m)[1];
      assert.ok(idents.has(expect) || ids.has(expect.replace(/^#/, "")), `${basename(file)}: ${expect}`);
    }
  });
});
