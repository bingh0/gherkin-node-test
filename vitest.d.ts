// Hand-written declarations for the vitest adapter entry point
// (`gherkin-node-test/vitest`). index.d.ts is generated from index.js by
// `npm run types`; this file is not — keep it in step with vitest.mjs by hand,
// and keep it compiling under `skipLibCheck: false` (test/typecheck pins that).
//
// index.d.ts is an `export =` module, so its classes arrive as VALUES; the
// usable instance type is spelled InstanceType<typeof StepRegistry>.
import { ParsedFeature, StepRegistry } from './index.js';

type Registry = InstanceType<typeof StepRegistry>;

export declare function runFeature(parsed: ParsedFeature, registry: Registry): void;
export declare function runFeatureFile(file: string, registry: Registry): void;
export declare function runFeatures(
  dir: string,
  definers: Record<string, (reg: Registry) => any>,
  opts?: { wip?: Iterable<string> },
): void;

export {
  parseFeature, lintFeature, StepRegistry, executeSteps,
  DataTable, buildSnippet, GherkinSyntaxError,
} from './index.js';
