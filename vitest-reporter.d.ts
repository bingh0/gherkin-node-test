// Hand-written declarations for `gherkin-node-test/vitest/reporter`. The class
// is a plain object with vitest's reporter hooks and no vitest import; the
// parameters are `unknown`-shaped on purpose so this file needs no vitest
// types (vitest passes its own objects in).

/** The sharding reporter: add it to `reporters` in the vitest config. */
export default class GherkinNodeTestReporter {
  onInit(vitest: unknown): void;
  onTestRunStart(specifications: readonly unknown[]): void;
  onTestRunEnd(
    testModules: readonly unknown[],
    unhandledErrors: readonly unknown[],
    reason: string,
  ): Promise<void>;
}
