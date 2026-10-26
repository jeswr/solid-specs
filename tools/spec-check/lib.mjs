// AUTHORED-BY Claude Opus 5.5
/**
 * Helpers for the spec gate checks. Everything is offline: JSON-LD contexts resolve only from
 * the vendored files in ./contexts and the spec directories, so a check never fetches.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import jsonld from "jsonld";
import { Parser, Store, Writer } from "n3";
import SHACLValidator from "rdf-validate-shacl";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, "../..");

/** Context IRI → local file. The LWS context is a stand-in until the W3C publishes it. */
export const CONTEXTS = {
  "https://www.w3.org/ns/cid/v1": join(HERE, "contexts/cid-v1.jsonld"),
  "https://www.w3.org/ns/lws/v1": join(HERE, "contexts/lws-v1.stand-in.jsonld"),
  "https://jeswr.org/ns/solid-sd/context/v1": join(REPO, "specs/service-description/context/v1.jsonld"),
};

export async function documentLoader(url) {
  const file = CONTEXTS[url];
  if (!file) throw new Error(`unvendored JSON-LD context: ${url}`);
  return { contextUrl: null, documentUrl: url, document: JSON.parse(readFileSync(file, "utf8")) };
}

export function parseTurtle(text, baseIRI) {
  return new Parser({ baseIRI }).parse(text);
}

export function readTurtle(file, baseIRI = `file://${file}`) {
  return parseTurtle(readFileSync(file, "utf8"), baseIRI);
}

export function toNQuads(quads) {
  return new Writer({ format: "N-Quads" }).quadsToString(quads);
}

/** JSON-LD → N-Quads in safe mode: any member the contexts drop is an error, not silence. */
export async function jsonldToNQuads(doc) {
  return jsonld.toRDF(doc, { format: "application/n-quads", documentLoader, safe: true });
}

export async function canonical(nquads) {
  return jsonld.canonize(nquads, {
    algorithm: "RDFC-1.0",
    inputFormat: "application/n-quads",
    format: "application/n-quads",
    safe: true,
  });
}

export async function jsonldToQuads(doc) {
  return new Parser({ format: "N-Quads" }).parse(await jsonldToNQuads(doc));
}

/** Validate quads against a shapes graph; returns { conforms, results: [{ message, severity, focus }] }. */
export async function validate(shapeQuads, dataQuads) {
  const validator = new SHACLValidator(new Store(shapeQuads));
  const report = await validator.validate(new Store(dataQuads));
  const results = report.results.map((r) => ({
      message: (r.message ?? []).map((m) => m.value).join(" "),
      severity: r.severity?.value,
      focus: r.focusNode?.value,
  }));
  // Warnings (SHOULD-level constraints) are reported but do not fail conformance.
  return { conforms: !results.some((r) => r.severity === SH_VIOLATION), results };
}

const SH_VIOLATION = "http://www.w3.org/ns/shacl#Violation";

const ENTITIES = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–" };

/**
 * The text of an HTML document the way the spec-companion validator reads it: tags stripped,
 * entities decoded, ReSpec [[refs]] unbracketed, whitespace collapsed.
 */
export function normalizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
      if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENTITIES[e] ?? m;
    })
    .replace(/\[\[!?([^\]]+)\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every id attribute value in an HTML document. */
export function htmlIds(html) {
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
}

/** The text content of every <pre class="example"> block, entities decoded. */
export function htmlExamples(html) {
  return [...html.matchAll(/<pre class="example"[^>]*>([\s\S]*?)<\/pre>/g)].map((m) =>
    m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"),
  );
}

export function listFiles(dir, ext) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .sort()
    .map((f) => join(dir, f));
}
