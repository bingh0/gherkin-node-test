// Config for the vitest-adapter smoke suite ONLY. The library's own tests run
// on node:test/bun:test/Deno (`node --test` etc.); this config exists so CI's
// vitest lane can prove the `gherkin-node-test/vitest` entry registers real
// scenarios on a real vitest. The spec filename deliberately matches none of
// the native runners' discovery globs (not *.test.*, not *.spec.*, not
// *_test.*), so only an explicit `vitest run` ever collects it.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['fixtures/vitest/*.vitest-spec.mjs'],
  },
});
