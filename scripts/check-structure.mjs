#!/usr/bin/env node
// AUTHORED-BY Claude Fable 5
/**
 * check-structure.mjs — the specs-repo structural gate (ADR decisions/0001 §7.2).
 *
 * Rules (empty trees pass trivially — Phase 0 ships no spec yet):
 *   - every directory under specs/  must contain index.html AND a STATUS.md
 *     (the STATUS block names the venue state: CG-draft / LF-submission-pending /
 *     experiment / …)
 *   - every directory under notes/  must contain index.html
 *   - conformance/ and tools/ have no structural rule yet (their own suites gate them)
 *
 * Pure validation is exported for tests; the CLI half only reads the filesystem.
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Validate a tree description. Pure.
 * @param {{specs?: Record<string,string[]>, notes?: Record<string,string[]>}} tree
 *   map of directory name → contained file names, per top-level area
 * @returns {string[]} problems (empty = valid)
 */
export function validateTree(tree) {
  const problems = [];
  for (const [name, files] of Object.entries(tree.specs ?? {})) {
    if (!files.includes("index.html")) problems.push(`specs/${name}: missing index.html`);
    if (!files.includes("STATUS.md")) problems.push(`specs/${name}: missing STATUS.md (venue state)`);
  }
  for (const [name, files] of Object.entries(tree.notes ?? {})) {
    if (!files.includes("index.html")) problems.push(`notes/${name}: missing index.html`);
  }
  return problems;
}

/** Read { dirName: [files] } for every subdirectory of base (missing base → {}). */
export function readArea(base) {
  if (!existsSync(base)) return {};
  const out = {};
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    out[entry.name] = readdirSync(join(base, entry.name));
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const problems = validateTree({
    specs: readArea(join(repoRoot, "specs")),
    notes: readArea(join(repoRoot, "notes")),
  });
  if (problems.length > 0) {
    for (const p of problems) console.error(`check:structure FAIL — ${p}`);
    process.exit(1);
  }
  console.log("check:structure OK");
}
