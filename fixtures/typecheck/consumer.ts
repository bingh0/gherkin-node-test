// Compile-time consumer: pins that BOTH entry points type-check as a strict
// TypeScript consumer sees them — `skipLibCheck: false`, so errors inside the
// shipped .d.ts files fail here instead of in a user's build. (The regression
// class this exists for: vitest.d.ts once annotated with `StepRegistry` as a
// type, which an `export =` module only exports as a value.) Run via
// `npm run typecheck`; the CI vitest lane runs it too. Never executed.
import {
  bindRunner, lintFeature, parseFeature, StepRegistry,
  type Definer, type Registry,
} from 'gherkin-node-test';
import * as vitestEntry from 'gherkin-node-test/vitest';

export function typecheckMainEntry(): void {
  const parsed = parseFeature('Feature: F\nScenario: s\n  Given a\n  Then b\n', 'f.feature');
  const outline = parsed.outlines[0];
  // 0.6.0 OutlineMeta surface:
  const cols: string[] = outline ? outline.header : [];
  const refs: string[] = outline ? outline.placeholders : [];
  const headerLine: number = outline ? outline.headerLine : 0;
  void cols; void refs; void headerLine;

  for (const f of lintFeature('Feature: F\n', 'f.feature')) {
    // 0.6.0 rule names are part of the LintFinding union:
    if (f.rule === 'duplicate-title' || f.rule === 'unused-column') void f.severity;
  }

  const reg = new StepRegistry();
  reg.define(/^a$/, (w) => { void w; });
  const bound = bindRunner((() => {}) as any);
  bound.runFeature(parsed, reg);
  // 0.8.0 run manifest through the bound surface (never executed — types only).
  bound.runFeatures('features', {}, { manifest: 'features/run-manifest.ndjson' });
}

// Typed worlds. W describes the world's ACCRETED shape (it is born {}), so
// fields stay optional — the generic proves keys are spelled consistently,
// never that a step has assigned them. All compile-time, consumer-side; the
// runtime guards owe nothing to any of this.
type CounterWorld = { count?: number; errors?: string[] };
export function typecheckTypedWorld(): void {
  const reg = new StepRegistry<CounterWorld>();
  reg.define(/^a counter at (\d+)$/, (w, n) => {
    if (typeof n === 'string') w.count = Number(n); // args are string | DataTable: coercion in view
    w.defer(() => { w.count = 0; });                // defer arrives typed, no cast
  });
  // @ts-expect-error — a misspelled world key is a compile error under a typed W
  reg.define(/^x$/, (w) => { w.cuont = 1; });
  // @ts-expect-error — step args arrive as string | DataTable, never pre-coerced number
  reg.define(/^y (\d+)$/, (w, n: number) => { void w; void n; });

  // Definer<W> is the annotation seam: it types a step module handed to
  // runFeatures, whose definers record stays Definer<any> (one world PER
  // FEATURE — a type param on runFeatures itself would collapse them).
  const definer: Definer<CounterWorld> = (r) => r.define(/^a$/, (w) => { void w.count; });
  const bound = bindRunner((() => {}) as any);
  bound.runFeatures('features', { counter: definer });
  // Registry<W> now comes from the main entry too, not just the vitest one.
  const alias: Registry<CounterWorld> = reg;
  void alias;
}

export function typecheckVitestEntry(): void {
  const reg = new vitestEntry.StepRegistry();
  // 0.7.0 exported types: Registry/Definer spare consumers the
  // InstanceType<typeof StepRegistry> dance the export = shape forces.
  const definer: vitestEntry.Definer = (r: vitestEntry.Registry) => r.define(/^a$/, () => {});
  // 0.7.0 WipEntry union: basenames and scenario-scoped entries mix freely.
  const wip: vitestEntry.WipEntry[] = ['backlog', { feature: 'partial', scenarios: ['pending thing'] }];
  // 0.8.0 run manifest: the opt-in path types on both entry points.
  vitestEntry.runFeatures('features', { counter: definer }, { wip, manifest: 'features/run-manifest.ndjson' });
  vitestEntry.runFeature(vitestEntry.parseFeature('Feature: F\nScenario: s\n  Given a\n  Then b\n'), reg);
  void vitestEntry.lintFeature('Feature: F\n');
}
