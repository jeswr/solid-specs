// AUTHORED-BY Claude Fable 5
// Regression tests for the two guard-bypass classes roborev flagged in the ported
// check-packages.mjs: optionalDependencies were not scanned, and npm: aliases were
// checked under the manifest key instead of the target package name.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const guard = join(repoRoot, "guardrails", "scripts", "check-packages.mjs");

function scan(manifest) {
  const dir = mkdtempSync(join(tmpdir(), "guard-test-"));
  try {
    const fixture = join(dir, "package.json");
    writeFileSync(fixture, JSON.stringify(manifest));
    // --mode policy is offline (deny/allow lists only) — deterministic in tests.
    return spawnSync(process.execPath, [guard, "--mode", "policy", "--scan", fixture], {
      encoding: "utf8",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("clean manifest passes (registry + workspace + github deps)", () => {
  const res = scan({
    dependencies: { vitest: "^4.0.0", "@jeswr/solid-dpop": "workspace:*" },
    devDependencies: { "@jeswr/fetch-rdf": "github:jeswr/fetch-rdf#abc1234" },
  });
  assert.equal(res.status, 0);
});

test("denylisted package in optionalDependencies is caught", () => {
  const res = scan({ optionalDependencies: { request: "^2.88.0" } });
  assert.equal(res.status, 1);
  assert.match(res.stdout + res.stderr, /request/);
});

test("denylisted package behind an npm: alias is caught", () => {
  const res = scan({ dependencies: { "totally-safe-alias": "npm:request@^2.88.0" } });
  assert.equal(res.status, 1);
  assert.match(res.stdout + res.stderr, /request/);
});

test("scoped npm: aliases resolve to the scoped target name", () => {
  const bad = scan({ dependencies: { m: "npm:moment@^2.29.0" } });
  assert.equal(bad.status, 1);
  const ok = scan({ dependencies: { b: "npm:@biomejs/biome@^2.0.0" } });
  assert.equal(ok.status, 0);
});
