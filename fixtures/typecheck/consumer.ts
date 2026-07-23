// Compile-time consumer: pins that BOTH entry points type-check as a strict
// TypeScript consumer sees them — `skipLibCheck: false`, so errors inside the
// shipped .d.ts files fail here instead of in a user's build. (The regression
// class this exists for: vitest.d.ts once annotated with `StepRegistry` as a
// type, which an `export =` module only exports as a value.) Run via
// `npm run typecheck`; the CI vitest lane runs it too. Never executed.
import { bindRunner, lintFeature, parseFeature, StepRegistry } from 'gherkin-node-test';
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
}

export function typecheckVitestEntry(): void {
  const reg = new vitestEntry.StepRegistry();
  // 0.7.0 exported types: Registry/Definer spare consumers the
  // InstanceType<typeof StepRegistry> dance the export = shape forces.
  const definer: vitestEntry.Definer = (r: vitestEntry.Registry) => r.define(/^a$/, () => {});
  // 0.7.0 WipEntry union: basenames and scenario-scoped entries mix freely.
  const wip: vitestEntry.WipEntry[] = ['backlog', { feature: 'partial', scenarios: ['pending thing'] }];
  vitestEntry.runFeatures('features', { counter: definer }, { wip });
  vitestEntry.runFeature(vitestEntry.parseFeature('Feature: F\nScenario: s\n  Given a\n  Then b\n'), reg);
  void vitestEntry.lintFeature('Feature: F\n');
}
