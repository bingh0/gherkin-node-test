// Hand-written declarations for the vitest adapter entry point
// (`gherkin-node-test/vitest`). index.d.ts is generated from index.js by
// `npm run types`; this file is not — keep it in step with vitest.mjs by hand,
// and keep it compiling under `skipLibCheck: false` (test/typecheck pins that).
//
// index.d.ts is an `export =` module, so its classes arrive as VALUES; the
// usable instance type is spelled InstanceType<typeof StepRegistry>. Registry
// and Definer are exported so consumers never have to spell that dance:
// `import { type Definer } from 'gherkin-node-test/vitest'` types a definer
// extracted to a named function.
import { ParsedFeature, StepRegistry, WipEntry } from './index.js';

export type Registry = InstanceType<typeof StepRegistry>;
export type Definer = (reg: Registry) => any;
export type { WipEntry };

export declare function runFeature(parsed: ParsedFeature, registry: Registry): void;
export declare function runFeatureFile(file: string, registry: Registry): void;
export declare function runFeatures(
  dir: string,
  definers: Record<string, Definer>,
  opts?: { wip?: Iterable<WipEntry> },
): void;

export {
  parseFeature, lintFeature, StepRegistry, executeSteps,
  DataTable, buildSnippet, GherkinSyntaxError,
} from './index.js';
