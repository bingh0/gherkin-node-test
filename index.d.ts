declare const _exports: {
    parseFeature: typeof parseFeature;
    lintFeature: typeof lintFeature;
    StepRegistry: typeof StepRegistry;
    executeSteps: typeof executeSteps;
    runFeature: typeof runFeature;
    runFeatureFile: typeof runFeatureFile;
    runFeatures: typeof runFeatures;
    DataTable: typeof DataTable;
    buildSnippet: typeof buildSnippet;
    GherkinSyntaxError: typeof GherkinSyntaxError;
};
export = _exports;
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
/** @typedef {{ name: string, line: number, rows: number }} OutlineMeta */
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
    rule: 'dialect' | 'no-then' | 'vague-then' | 'single-row-outline' | 'near-miss-keyword';
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
 * runner would refuse the file; the lints warn because adopting them on an
 * existing suite needs a debt register, and that register (a wip-style
 * allowlist, filtering by rule) belongs to the consumer.
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
 */
declare function runFeature(parsed: ParsedFeature, registry: StepRegistry): void;
/**
 * @param {string} file
 * @param {StepRegistry} registry
 */
declare function runFeatureFile(file: string, registry: StepRegistry): void;
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
 */
declare function runFeatures(dir: string, definers: Record<string, (reg: StepRegistry) => any>, opts?: {
    wip?: Iterable<string>;
}): void;
