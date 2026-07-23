declare const _exports: {
    parseFeature: typeof parseFeature;
    lintFeature: typeof lintFeature;
    StepRegistry: typeof StepRegistry;
    executeSteps: typeof executeSteps;
    runFeature: typeof runFeature;
    runFeatureFile: typeof runFeatureFile;
    runFeatures: typeof runFeatures;
    bindRunner: typeof bindRunner;
    DataTable: typeof DataTable;
    buildSnippet: typeof buildSnippet;
    GherkinSyntaxError: typeof GherkinSyntaxError;
};
export = _exports;
/**
 * Register one test on the active runner. node:test takes skip/todo as
 * options; bun:test takes them as methods. At most one of the two is ever
 * set (the parser rejects combined semantic tags), so the method chain cannot
 * silently invent a precedence the other runner disagrees with. The runners'
 * focus mechanisms (only: / test.only) are never used — @only is rejected
 * instead (see runFeature), because focus behaves three different ways on the
 * three runtimes.
 * @param {string} title
 * @param {{ skip?: boolean, todo?: boolean | string }} opts
 * @param {() => (void | Promise<void>)} fn
 */
declare function registerTest(title: string, opts: {
    skip?: boolean;
    todo?: boolean | string;
}, fn: () => (void | Promise<void>)): void;
/**
 * Bind the runner entry points to a host test function instead of the
 * runtime's built-in runner. This is the supported way to run features under
 * vitest — the `gherkin-node-test/vitest` entry is exactly
 * `bindRunner(vitest.test)` — or under any runner exposing the method-form
 * shape `test(name, fn)` with `.skip(name, fn)` and `.todo(name, fn)`.
 *
 * Everything else is unchanged: scoped registries, the unbound-step ratchet,
 * the @only and duplicate-title rejections all register through the bound
 * test function. Only the one-runFeatures-call-per-file guard is bypassed —
 * see runFeatures for why it is native-runner-only.
 * @param {any} testFn a `test` function with `.skip` and `.todo` methods
 * @returns {{ runFeature: (parsed: ParsedFeature, registry: StepRegistry) => void,
 *             runFeatureFile: (file: string, registry: StepRegistry) => void,
 *             runFeatures: (dir: string, definers: Record<string, (reg: StepRegistry) => any>, opts?: { wip?: Iterable<string> }) => void }}
 */
declare function bindRunner(testFn: any): {
    runFeature: (parsed: ParsedFeature, registry: StepRegistry) => void;
    runFeatureFile: (file: string, registry: StepRegistry) => void;
    runFeatures: (dir: string, definers: Record<string, (reg: StepRegistry) => any>, opts?: {
        wip?: Iterable<string>;
    }) => void;
};
export type Step = {
    keyword: string;
    text: string;
    line: number;
    table?: string[][];
};
export type Scenario = {
    name: string;
    steps: Step[];
    line: number;
    tags: string[];
};
export type OutlineMeta = {
    name: string;
    line: number;
    rows: number;
    header: string[];
    headerLine: number;
    placeholders: string[];
};
export type NarrativeLine = {
    line: number;
    text: string;
    inBody: boolean;
};
export type ParsedFeature = {
    feature: string;
    background: Step[];
    scenarios: Scenario[];
    outlines: OutlineMeta[];
    narrative: NarrativeLine[];
    file: string;
};
export type StepFn = (world: Record<string, any>, ...args: any[]) => (void | Promise<void>);
/** @typedef {{ keyword: string, text: string, line: number, table?: string[][] }} Step */
/** @typedef {{ name: string, steps: Step[], line: number, tags: string[] }} Scenario */
/** @typedef {{ name: string, line: number, rows: number, header: string[], headerLine: number, placeholders: string[] }} OutlineMeta */
/** @typedef {{ line: number, text: string, inBody: boolean }} NarrativeLine */
/** @typedef {{ feature: string, background: Step[], scenarios: Scenario[], outlines: OutlineMeta[], narrative: NarrativeLine[], file: string }} ParsedFeature */
/** @typedef {(world: Record<string, any>, ...args: any[]) => (void | Promise<void>)} StepFn */
/**
 * Thrown when a feature file uses syntax this parser does not support, or a
 * malformed construct it would otherwise mis-read. The message is prefixed with
 * `file:line:` and `.line` carries the 1-based line number.
 */
declare class GherkinSyntaxError extends Error {
    line: number;
    /** @param {string} message @param {number} line */
    constructor(message: string, line: number);
}
/**
 * A step's data table, API-compatible with cucumber-js's DataTable so step code
 * (and muscle memory) ports both ways.
 */
declare class DataTable {
    /** @type {string[][]} */
    rawTable: string[][];
    /** @param {string[][]} raw */
    constructor(raw: string[][]);
    /** @returns {string[][]} a defensive copy of every row */
    raw(): string[][];
    /** @returns {string[][]} all rows except the first (header) row */
    rows(): string[][];
    /** @returns {Record<string, string>[]} one object per non-header row, keyed by the header row */
    hashes(): Record<string, string>[];
    /** @returns {Record<string, string>} a two-column table as a key → value map */
    rowsHash(): Record<string, string>;
    /** @returns {DataTable} columns become rows */
    transpose(): DataTable;
}
/**
 * @param {string} text     raw .feature file contents
 * @param {string} [filename] used only to prefix error messages
 * @returns {ParsedFeature}
 */
declare function parseFeature(text: string, filename?: string): ParsedFeature;
export type LintSeverity = 'error' | 'warn';
export type LintFinding = {
    rule: 'dialect' | 'no-then' | 'vague-then' | 'single-row-outline' | 'near-miss-keyword' | 'duplicate-title' | 'unused-column';
    severity: LintSeverity;
    line: number;
    message: string;
};
/**
 * Lint one feature file's text: the dialect gate plus deterministic spec
 * lints. Pure text-in/findings-out — no filesystem, no environment, no test
 * registration — so it behaves identically on Node, Bun, and Deno, and
 * directory walking stays in the consumer. This is the supported way to use
 * gherkin-node-test as a LINTER inside a repo whose runner is something else
 * (vitest-cucumber, cucumber-js): the linter gates dialect membership and
 * spec quality; the executor's interpretation of the file stays authoritative.
 *
 * Rules:
 *  - `dialect` (error): the text is outside the supported subset — the exact
 *    GherkinSyntaxError the runner would throw, as a finding. The parser stops
 *    at the first violation, so a dialect finding is always alone.
 *  - `no-then` (warn): a scenario whose own steps never resolve to Then — it
 *    runs code but asserts nothing. And/But/* inherit the preceding primary
 *    keyword (a Background is walked first, so a scenario continuing the
 *    Background's context is resolved correctly).
 *  - `vague-then` (warn): a Then-resolved step containing a word from the
 *    banned-vagueness list above.
 *  - `single-row-outline` (warn): a Scenario Outline with one Examples row —
 *    a scenario with extra ceremony, and usually a missing case.
 *  - `duplicate-title` (error): a Scenario or Scenario Outline title already
 *    used earlier in the file. Titles are the runner's only handle on a
 *    scenario — the library rejects @only precisely so that one scenario is
 *    focused via `--test-name-pattern` / `-t` / `--filter`, and a duplicated
 *    title breaks that prescription silently: the pattern matches both copies,
 *    failure reports cannot tell them apart, and two outlines sharing a title
 *    expand to byte-identical test names (the [n] suffix indexes rows within
 *    one outline, not across outlines). Compared pre-expansion, per file.
 *  - `unused-column` (warn): an Examples column no `<placeholder>` in the
 *    outline's title, steps, or step tables ever references — a case someone
 *    wrote down that no assertion consumes. The inverse direction (a
 *    placeholder with no matching column) is already a dialect error. Reported
 *    at the header row's line. Deliberately a warn: a leading label column
 *    (`| case | … |`) that exists for the human reader is a legitimate style,
 *    and repos that ban it can escalate the finding themselves.
 *  - `near-miss-keyword` (warn): a silently dropped line that was almost
 *    certainly meant as syntax, read off the parser's own record of the lines
 *    it ignored as narrative. Two shapes:
 *      - inside a scenario or Background body, a line whose first word matches
 *        a step keyword case-insensitively but not exactly (`when I add 5`,
 *        `GIVEN a counter`) — the requirement it stated is gone;
 *      - anywhere, a line shaped like a construct header but not in the one
 *        exact form the parser recognizes (`scenario: b`, `Scenario : b`,
 *        `SCENARIO OUTLINE: b`) — the construct never starts, and what follows
 *        it silently belongs to whatever came before (a lowercase `scenario:`
 *        merges its steps into the PREVIOUS scenario, unseeable by the
 *        no-steps guard and `no-then` because the scenario never exists).
 *    This is the same hazard as a near-miss semantic tag (`@Skip`), which the
 *    parser rejects outright; a near-miss step or construct keyword still
 *    parses, so it surfaces here instead. The step check is scoped to bodies
 *    because the Feature narrative is prose by design and may open a sentence
 *    with "when" or "and"; the construct check is not scoped, because the
 *    trailing colon makes the line syntax-shaped wherever it appears. `Rule:`
 *    is exempt from the construct check — see CONSTRUCT_BY_KEY. The no-steps
 *    guard and `no-then` between them catch a dropped step only at the
 *    extremes (a scenario's only step, or its only Then); a near miss in a
 *    scenario that keeps a Given and a Then is otherwise invisible.
 *
 * Findings from a Scenario Outline are reported once per source construct,
 * not once per expanded row — except a vague-then introduced BY a placeholder
 * substitution, which is reported for exactly the rows that produce it.
 *
 * Severity is descriptive, not policy: `dialect` is an error because the
 * runner would refuse the file, and `duplicate-title` is an error because the
 * runner refuses it too (a registered failing test, same mechanism as @only);
 * the remaining lints warn because adopting them on an existing suite needs a
 * debt register, and that register (a wip-style allowlist, filtering by rule)
 * belongs to the consumer.
 *
 * @param {string} text     raw .feature file contents
 * @param {string} [filename] used only to prefix the dialect finding's message
 * @returns {LintFinding[]} sorted by line, then declaration order
 */
declare function lintFeature(text: string, filename?: string): LintFinding[];
declare class StepRegistry {
    /** @type {{ re: RegExp, fn: StepFn }[]} */
    steps: {
        re: RegExp;
        fn: StepFn;
    }[];
    constructor();
    /**
     * @param {RegExp | string} pattern RegExp (capture groups become step args) or exact string
     * @param {StepFn} fn
     * @returns {this}
     */
    define(pattern: RegExp | string, fn: StepFn): this;
    /**
     * @param {string} text
     * @returns {{ fn: StepFn, args: string[] } | null}
     */
    find(text: string): {
        fn: StepFn;
        args: string[];
    } | null;
}
/**
 * Build a paste-ready step definition for an unbound step: numbers become
 * (\d+) / ([\d.]+) captures, "quoted strings" become "([^"]*)", everything
 * else is regex-escaped. The generated body THROWS — an empty body would turn
 * the pasted definition into an instant vacuous pass, the exact failure mode
 * this harness exists to prevent.
 * @param {string} text step text as written in the feature file
 * @returns {string}
 */
declare function buildSnippet(text: string): string;
/**
 * Run a flat list of steps against a shared world. Throws on an undefined step
 * or a failing assertion. Exposed so the harness self-test can drive it without
 * going through node:test.
 *
 * `world.defer(fn)` registers scenario-scoped cleanup: deferred functions run
 * in reverse (LIFO) order after the steps, INCLUDING when a step failed — so a
 * failing assertion can't leak temp dirs/processes. The step failure, if any,
 * outranks cleanup errors; with no step failure the first cleanup error throws.
 * (`defer` is a reserved key on the world.)
 * @param {Step[]} steps
 * @param {StepRegistry} registry
 * @param {Record<string, any>} [world]
 * @returns {Promise<Record<string, any>>}
 */
declare function executeSteps(steps: Step[], registry: StepRegistry, world?: Record<string, any>): Promise<Record<string, any>>;
/**
 * Register one runner test per scenario. Scenarios whose steps aren't all
 * defined register as TODO (see runFeatures for the guard that keeps TODO from
 * silently swallowing a bound feature). Tag mapping: @skip → skipped, @todo →
 * doesn't gate the suite. @only maps to NOTHING — it registers a failing test
 * instead, because the runners' focus semantics are irreconcilable: Node keeps
 * only: inert without --test-only; Bun and Deno focus the file on every run
 * with no flag, and Deno exits 0 doing it, so a committed @only would silently
 * narrow a CI run there. Rejection is uniform, additive (every scenario still
 * registers and runs — nothing narrows), and REGISTERED rather than thrown, so
 * Deno's load-throw swallow can't eat it. Focus one scenario with the runner's
 * own per-run flag instead: `node --test --test-name-pattern <re>`,
 * `bun test -t <re>`, or `deno test --filter <text>` — a CLI argument can't be
 * committed into the suite, which is the point.
 * @param {ParsedFeature} parsed
 * @param {StepRegistry} registry
 * @param {typeof registerTest} [register] test-registration hook; supplied by
 *   bindRunner, defaults to the runtime's native runner
 */
declare function runFeature(parsed: ParsedFeature, registry: StepRegistry, register?: typeof registerTest): void;
/**
 * @param {string} file
 * @param {StepRegistry} registry
 * @param {typeof registerTest} [register] test-registration hook; supplied by
 *   bindRunner, defaults to the runtime's native runner
 */
declare function runFeatureFile(file: string, registry: StepRegistry, register?: typeof registerTest): void;
/**
 * Discover and run every *.feature in `dir`, each against its OWN scoped
 * registry — one feature's step patterns can never match another feature's
 * steps, so there is no global step namespace to collide in.
 *
 * Guards registered alongside the scenarios:
 *  - every key in `definers` must name an existing feature file (a renamed
 *    feature can't silently strand its steps);
 *  - within each feature, every step must match exactly one definition — no
 *    ambiguity, and (unless the feature is listed in `wip`) no unbound steps,
 *    because unbound scenarios register as TODO, which node:test reports as
 *    PASSING. The failure message includes a paste-ready snippet per missing
 *    step. @skip'd scenarios are ratcheted too: skip means "don't run",
 *    never "don't bind".
 *
 * One runFeatures call per test file, enforced: a second call in the same
 * test file registers a single failing test naming the fix and does nothing
 * else. See filesWithRunFeatures above for why (Deno silently swallows a
 * load-time throw once an earlier call has registered a test — a second call
 * is exactly where a bad definer or an unparseable feature would vanish).
 * Give each feature directory its own test file.
 *
 * @param {string} dir directory containing .feature files
 * @param {Record<string, (reg: StepRegistry) => any>} definers feature basename → step definer
 * @param {{ wip?: Iterable<string> }} [opts] feature basenames still bootstrapping (TODO allowed)
 * @param {typeof registerTest} [register] test-registration hook; supplied by
 *   bindRunner, defaults to the runtime's native runner
 */
declare function runFeatures(dir: string, definers: Record<string, (reg: StepRegistry) => any>, opts?: {
    wip?: Iterable<string>;
}, register?: typeof registerTest): void;
