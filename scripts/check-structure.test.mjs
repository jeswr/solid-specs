// AUTHORED-BY Claude Fable 5
import assert from "node:assert/strict";
import { test } from "node:test";
import { validateTree } from "./check-structure.mjs";

test("empty tree passes trivially (Phase 0)", () => {
  assert.deepEqual(validateTree({}), []);
  assert.deepEqual(validateTree({ specs: {}, notes: {} }), []);
});

test("a complete spec dir passes", () => {
  assert.deepEqual(
    validateTree({ specs: { "dpop-sk": ["index.html", "STATUS.md", "examples.ttl"] } }),
    [],
  );
});

test("a spec dir missing index.html or STATUS.md fails with named problems", () => {
  assert.deepEqual(validateTree({ specs: { lws: ["STATUS.md"] } }), [
    "specs/lws: missing index.html",
  ]);
  assert.deepEqual(validateTree({ specs: { lws: ["index.html"] } }), [
    "specs/lws: missing STATUS.md (venue state)",
  ]);
});

test("notes need index.html only", () => {
  assert.deepEqual(validateTree({ notes: { "agentic-solid": ["index.html"] } }), []);
  assert.deepEqual(validateTree({ notes: { "agentic-solid": ["draft.md"] } }), [
    "notes/agentic-solid: missing index.html",
  ]);
});
