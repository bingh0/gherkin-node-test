// Hand-written declarations for the vitest adapter entry point
// (`gherkin-node-test/vitest`). index.d.ts is generated from index.js by
// `npm run types`; this file is not — keep it in step with vitest.mjs by hand,
// and keep it compiling under `skipLibCheck: false` (test/typecheck pins that).
//
// index.d.ts is an `export =` module, so its classes arrive as VALUES; the
// usable instance type is spelled InstanceType<typeof StepRegistry>. Registry
// and Definer spare consumers that dance — and since the typed-world release
// both are re-exported straight from the main entry, where the `W` generics
// live: one source, so the two entry points cannot drift.
import { Definer, ParsedFeature, Registry, WipEntry } from './index.js';

export type { Definer, Registry, WipEntry };

export declare function runFeature(parsed: ParsedFeature, registry: Registry<any>): void;
export declare function runFeatureFile(file: string, registry: Registry<any>): void;
export declare function runFeatures(
  dir: string,
  definers: Record<string, Definer<any>>,
  opts?: { wip?: Iterable<WipEntry>; manifest?: string },
): void;

export {
  parseFeature, lintFeature, StepRegistry, executeSteps,
  DataTable, buildSnippet, GherkinSyntaxError,
} from './index.js';
