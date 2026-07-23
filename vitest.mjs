// gherkin-node-test/vitest — the vitest adapter.
//
// Exactly `bindRunner(vitest.test)`: scenarios, guard tests, and the @only /
// duplicate-title rejections all register on vitest's own test(), at collection
// time, from a plain spec file. No plugin, no codegen, no second parser — the
// same parse that lints the file is the parse that runs it.
//
//   // features.test.ts
//   import { runFeatures } from 'gherkin-node-test/vitest';
//   runFeatures('features', {
//     counter: (reg) => {
//       reg.define(/^a counter at (\d+)$/, (w, n) => { w.count = Number(n); });
//     },
//   });
//
// vitest is a peer dependency (optional): this entry point is the only one
// that imports it, so consumers on node:test/bun:test/Deno never need it.
import { test } from 'vitest';
import gnt from './index.js';

const bound = gnt.bindRunner(test);

export const runFeature = bound.runFeature;
export const runFeatureFile = bound.runFeatureFile;
export const runFeatures = bound.runFeatures;

// The runner-independent surface, re-exported so a vitest spec file needs
// exactly one import.
export const {
  parseFeature, lintFeature, StepRegistry, executeSteps,
  DataTable, buildSnippet, GherkinSyntaxError,
} = gnt;
