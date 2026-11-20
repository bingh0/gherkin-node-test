// @ts-check
'use strict';
// Steps for features/sharding.feature — each scenario generates a small vitest
// project (see shard-project.js) and runs the REAL vitest in it with the real
// reporter. Needs vitest installed (npm ci): a run without it is loud, not skipped.
const assert = require('node:assert');
const fs = require('node:fs');
const { runShardProject } = require('./shard-project');

/** @param {string[]} names @returns {Record<string, any>} one shard per feature file */
const oneEach = (names, dir = 'sharded') => Object.fromEntries(names.map((n) => [`${n}.vitest-spec.mjs`,
  { dir, only: [n], manifest: 'm.ndjson' }]));

/** @param {any} w @param {string} name @param {any} [opt] */
const runLayout = (w, name, opt) => runShardProject(name, w.layout, { seed: w.seed, ...opt });

/** @param {any} w every shard is given the same register */
const withWip = (w) => {
  for (const spec of Object.values(w.layout)) spec.wip = w.wip;
};

/** @param {import('../../index.js').StepRegistry} reg */
module.exports = (reg) => {
  // --- Givens -----------------------------------------------------------

  reg.define(/^a feature directory of 3 feature files holding every kind of row, and hostile titles$/, (w) => {
    // features/sharded-rich: passed, failed, skipped, todo and wip-held rows, an
    // outline, and titles with an astral character, a quote and a backslash.
    w.names = ['one', 'two', 'three'];
    w.wip = [{ feature: 'two', scenarios: ['pending thing'] }, { feature: 'one', scenarios: ['one pending'] }];
  });

  reg.define(/^one test file that runs it whole, and 3 test files that each run one feature file$/, (w) => {
    w.whole = { 'all.vitest-spec.mjs': { dir: 'richDefs', manifest: 'single.ndjson', wip: w.wip } };
    w.layout = oneEach(w.names, 'richDefs');
    withWip(w);
  });

  reg.define(/^a feature directory of 3 feature files, one shard per feature file$/, (w) => {
    w.names = ['alpha', 'beta', 'gamma'];
    w.layout = oneEach(w.names);
  });

  reg.define(/^every shard is given the same debt register, naming a fully bound feature$/, (w) => {
    w.wip = ['beta'];
    withWip(w);
  });

  reg.define(/^every shard is given the same debt register, naming a feature that has no file$/, (w) => {
    w.wip = ['ghost'];
    withWip(w);
  });

  reg.define(/^a feature directory of 3 feature files and shards that cover 2 of them$/, (w) => {
    w.layout = oneEach(['alpha', 'beta']);
  });

  reg.define(/^a feature directory of 3 feature files and two shards that both run one of them$/, (w) => {
    w.layout = {
      'first.vitest-spec.mjs': { dir: 'sharded', only: ['alpha', 'beta'], manifest: 'm.ndjson' },
      'second.vitest-spec.mjs': { dir: 'sharded', only: ['beta', 'gamma'], manifest: 'm.ndjson' },
    };
  });

  reg.define(/^a full run that has written the shards' manifest$/, (w) => {
    w.layout = oneEach(['alpha', 'beta', 'gamma']);
    w.project = runLayout(w, 'partial');
    assert.strictEqual(w.project.status, 0, w.project.output);
    w.before = w.project.manifestBytes('m.ndjson');
    assert.ok(w.before && w.before.split('\n').length > 3, 'the premise holds: a full account exists');
    w.beforeStat = fs.statSync(w.project.manifestPath('m.ndjson')).mtimeMs;
  });

  reg.define(/^a manifest is already on disk$/, (w) => {
    w.seed = ['m.ndjson'];
  });

  reg.define(/^one shard's test file turns a scenario into a skipped test and leaves the runner's own checks alone$/, (w) => {
    // The wrapper matches a scenario title only; no check test's title contains it.
    w.layout['beta.vitest-spec.mjs'].skipScenario = 'sweep 2';
    w.shardFile = 'beta.vitest-spec.mjs';
  });

  reg.define(/^one shard's test file skips the whole shard, the runner's own checks included$/, (w) => {
    w.layout['gamma.vitest-spec.mjs'].skipScenario = ''; // '' matches every title, the checks too
    w.shardFile = 'gamma.vitest-spec.mjs';
  });

  reg.define(/^that shard's feature has an unbound step outside the debt register$/, (w) => {
    w.layout['gamma.vitest-spec.mjs'].dir = 'gammaBare'; // its @todo scenario's step is not defined; no wip entry
    // The premise, proven by running that shard unskipped: its ratchet check fails.
    const { skipScenario, ...bare } = w.layout['gamma.vitest-spec.mjs'];
    void skipScenario;
    const proof = runShardProject('unbound-proof', { 'gamma.vitest-spec.mjs': bare });
    assert.deepStrictEqual(proof.failed, ['gamma.vitest-spec.mjs > gamma :: step definitions are complete and unambiguous'], proof.output);
  });

  reg.define(/^a test file of plain unit tests sits beside them$/, (w) => {
    w.layout['plain.vitest-spec.mjs'] = { kind: 'plain' };
  });

  reg.define(/^a test file that runs one feature file as a shard$/, (w) => {
    w.layout = { 'alpha.vitest-spec.mjs': { dir: 'sharded', only: ['alpha'] } };
  });

  reg.define(/^another test file that runs the same directory whole$/, (w) => {
    w.layout['whole.vitest-spec.mjs'] = { dir: 'sharded' };
  });

  reg.define(/^two feature directories, each sharded, each with its own manifest$/, (w) => {
    w.layout = {
      'alpha.vitest-spec.mjs': { dir: 'sharded', only: ['alpha'], manifest: 'sharded.ndjson' },
      'beta-gamma.vitest-spec.mjs': { dir: 'sharded', only: ['beta', 'gamma'], manifest: 'sharded.ndjson' },
      'aa.vitest-spec.mjs': { dir: 'twofiles', only: ['aa'], manifest: 'twofiles.ndjson' },
      'zz.vitest-spec.mjs': { dir: 'twofiles', only: ['zz'], manifest: 'twofiles.ndjson' },
    };
    w.whole = {
      'sharded.vitest-spec.mjs': { dir: 'sharded', manifest: 'sharded.ndjson' },
      'twofiles.vitest-spec.mjs': { dir: 'twofiles', manifest: 'twofiles.ndjson' },
    };
  });

  // --- Whens -------------------------------------------------------------

  reg.define(/^each way runs on vitest's forks pool and again on its threads pool$/, (w) => {
    w.pools = ['forks', 'threads'].map((pool) => {
      const whole = runShardProject(`whole-${pool}`, w.whole, { pool });
      const shards = runLayout(w, `shards-${pool}`, { pool });
      return { pool, whole, shards };
    });
  });

  reg.define(/^the full run completes$/, (w) => {
    w.run = runLayout(w, 'run');
    if (w.whole) w.wholeRun = runShardProject('whole', w.whole);
  });

  reg.define(/^the suite runs again with a name filter that matches every scenario$/, (w) => {
    // `.` matches every test name, so every shard runs every scenario and every
    // part completes: only the reporter's own name-filter gate keeps the manifest
    // from being rewritten.
    w.filtered = w.project.rerun(['-t', '.']);
  });

  reg.define(/^again with one test file named$/, (w) => {
    w.oneFile = w.project.rerun(['alpha.vitest-spec.mjs']);
  });

  reg.define(/^the suite runs with a name filter that matches no scenario title$/, (w) => {
    w.run = runLayout(w, 'filter-none', { args: ['-t', 'no such scenario title'] });
  });

  reg.define(/^the suite runs with a name filter that matches one scenario title$/, (w) => {
    w.run = runLayout(w, 'filter-one', { args: ['-t', 'alpha passes again'] });
  });

  reg.define(/^the suite runs with a name filter that matches only a plain unit test$/, (w) => {
    w.run = runLayout(w, 'filter-plain', { args: ['-t', 'a plain unit test'] });
  });

  reg.define(/^the suite runs with a name filter that matches only a wip-held scenario title$/, (w) => {
    w.run = runLayout(w, 'filter-held', { args: ['-t', 'pending thing'] });
  });

  reg.define(/^the suite runs on vitest with no reporter configured$/, (w) => {
    w.run = runLayout(w, 'no-reporter', { reporter: false });
  });

  // --- Thens ---------------------------------------------------------------

  reg.define(/^on each pool the shards wrote one manifest$/, (w) => {
    for (const { pool, shards } of w.pools) {
      assert.ok(shards.manifestBytes('m.ndjson'), `${pool}: the shards wrote a manifest\n${shards.output}`);
    }
  });

  reg.define(/^it is byte-for-byte the whole-directory call's manifest$/, (w) => {
    for (const { pool, whole, shards } of w.pools) {
      // The corpus has a failing scenario: both ways are red, the same red.
      assert.strictEqual(shards.status, whole.status, `${pool}: ${shards.output}`);
      const bytes = whole.manifestBytes('single.ndjson');
      for (const status of ['passed', 'failed', 'skipped', 'todo', 'unbound']) {
        assert.ok(bytes && bytes.includes(`"status":"${status}"`), `${pool}: the account has a ${status} row`);
      }
      assert.ok(bytes && bytes.includes('say \\"hi\\" and back\\\\slash'), `${pool}: hostile titles are escaped in the account`);
      assert.ok(bytes && bytes.includes('shelved ☃ 𝒳'), `${pool}: the astral title is in the account`);
      assert.strictEqual(shards.manifestBytes('m.ndjson'), bytes, pool);
    }
  });

  reg.define(/^the run is red$/, (w) => {
    assert.notStrictEqual(w.run.status, 0, w.run.output);
  });

  reg.define(/^exactly one test fails: the stale-entry check of the shard that runs that feature$/, (w) => {
    assert.deepStrictEqual(w.run.failed, ['beta.vitest-spec.mjs > beta :: step definitions are unambiguous'], w.run.output);
  });

  reg.define(/^exactly one test fails: the orphan check of the shard that runs the first feature file$/, (w) => {
    assert.deepStrictEqual(w.run.failed, ['alpha.vitest-spec.mjs > wip entries map only to existing feature files'], w.run.output);
  });

  reg.define(/^the run says the filter ran no scenario$/, (w) => {
    assert.match(w.run.output,
      /the name filter "no such scenario title" ran no scenario in this run: it is misspelled, or it names a scenario in a test file outside this run, or it matches only skipped scenarios, or only the runner's own checks/);
  });

  reg.define(/^the run says the filter matched only todo tests$/, (w) => {
    assert.match(w.run.output,
      /the name filter "pending thing" matched only todo tests \(wip-held scenarios register as todo\); no scenario ran/);
  });

  reg.define(/^the manifest on disk is untouched, bytes and timestamp$/, (w) => {
    assert.ok(w.run.untouched('m.ndjson'), 'the manifest on disk kept its bytes and its timestamp');
  });

  reg.define(/^that shard's own checks ran and passed$/, (w) => {
    // Read from vitest's own results, not from the reporter: every check test of
    // this shard's file (beta has no unused definition, and is not the first
    // feature file, so it registers exactly these two) is present and passed.
    const status = w.run.results(w.shardFile);
    for (const check of ['only names and step definers map to feature files this call runs',
      'beta :: step definitions are complete and unambiguous']) {
      assert.strictEqual(status.get(check), 'passed', `${check}: ${JSON.stringify([...status])}`);
    }
  });

  reg.define(/^the report names that shard as having recorded no outcome$/, (w) => {
    assert.match(w.run.output,
      /no manifest part for "gamma" on a full run — .*gamma\.vitest-spec\.mjs did not record every scenario's outcome/);
    // The red is the reporter's line, not a failing test: the skipped ratchet stayed skipped.
    assert.deepStrictEqual(w.run.failed, [], w.run.output);
  });

  reg.define(/^the run says the manifest was not written because the test file skipped a test$/, (w) => {
    assert.match(w.run.output,
      /gherkin-node-test: run manifest not written for .*sharded: 1 test was skipped by the test file itself \(first: "Beta :: sweep 2 \[2\] \[host skip: no such host\]"\); a manifest needs every scenario's outcome; it can only be refreshed by a full run on a host that runs every scenario/);
  });

  reg.define(/^the run is green$/, (w) => {
    assert.strictEqual(w.run.status, 0, w.run.output);
  });

  reg.define(/^no manifest is written$/, (w) => {
    assert.strictEqual(w.run.manifestBytes('m.ndjson'), null);
  });

  reg.define(/^the report names the third feature file as run by no test file$/, (w) => {
    assert.match(w.run.output, /gamma\.feature is run by no test file/);
  });

  reg.define(/^the report names that feature and both test files$/, (w) => {
    assert.match(w.run.output, /feature "beta" .* is run by two test files: .*first\.vitest-spec\.mjs and .*second\.vitest-spec\.mjs/);
  });

  reg.define(/^the manifest is untouched, bytes and timestamp$/, (w) => {
    const file = w.project.manifestPath('m.ndjson');
    assert.strictEqual(fs.readFileSync(file, 'utf8'), w.before, 'bytes unchanged');
    assert.strictEqual(fs.statSync(file).mtimeMs, w.beforeStat, 'not even rewritten in place');
  });

  reg.define(/^both of those runs are green$/, (w) => {
    assert.strictEqual(w.filtered.status, 0, w.filtered.output);
    assert.strictEqual(w.oneFile.status, 0, w.oneFile.output);
  });

  reg.define(/^the one test that ran fails, telling the author to add the reporter$/, (w) => {
    assert.deepStrictEqual(w.run.failed, ['alpha.vitest-spec.mjs > runFeatures: only needs the gherkin-node-test reporter'], w.run.output);
    assert.match(w.run.output, /Tests {2}1 failed \(1\)/);
    assert.match(w.run.output, /Add "gherkin-node-test\/vitest\/reporter" to `reporters`/);
  });

  reg.define(/^the report names the whole-directory test file and the shards$/, (w) => {
    assert.match(w.run.output, /is run whole by .*whole\.vitest-spec\.mjs and as shards by .*alpha\.vitest-spec\.mjs/);
  });

  reg.define(/^each manifest is byte-for-byte what that directory's whole-directory call writes$/, (w) => {
    assert.strictEqual(w.run.status, 0, w.run.output);
    assert.strictEqual(w.wholeRun.status, 0, w.wholeRun.output);
    for (const file of ['sharded.ndjson', 'twofiles.ndjson']) {
      const bytes = w.wholeRun.manifestBytes(file);
      assert.ok(bytes && bytes.split('\n').length > 2, `${file}: the whole call's account has its rows`);
      assert.strictEqual(w.run.manifestBytes(file), bytes, file);
    }
  });
};
