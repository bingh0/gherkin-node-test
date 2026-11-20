// @ts-check
'use strict';
// test/sharding.test.js — the shard option's edges that the scenarios in
// features/vitest/sharding.feature do not read as behaviour. A malformed `only`
// throws at load, before any reporter question, so a stub runner shows it on
// every runtime. The edges that need a real vitest run live in
// features/vitest/edges.lane.js.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { bindRunner } = require('../index');

const dir = path.join(__dirname, '..', 'features', 'sharded');
const stub = /** @type {any} */ (Object.assign(() => {}, { skip() {}, todo() {} }));

for (const bad of [[], 'alpha', [''], [1], ['alpha', 'alpha']]) {
  test(`only ${JSON.stringify(bad)} throws at load`, () => {
    assert.throws(() => bindRunner(stub).runFeatures(dir, {}, /** @type {any} */ ({ only: bad })),
      /only must be a non-empty array of distinct feature basenames/);
  });
}

// The reporter matches a vitest test module's id against the path a worker
// reported. On Windows the two need not be spelled alike; both go through
// testFileKey. Windows-shaped inputs, run on every platform.
const { shardProtocol } = require('../index');

test('testFileKey: one comparable spelling for Windows-shaped test file paths', () => {
  const key = shardProtocol.testFileKey;
  const want = 'c:/work/repo/tests/a.test.ts';
  assert.strictEqual(key('C:\\work\\repo\\tests\\a.test.ts'), want, 'backslashes');
  assert.strictEqual(key('C:/work/repo/tests/a.test.ts'), want, 'forward slashes, upper-case drive');
  assert.strictEqual(key('c:/work/repo/tests/a.test.ts'), want, 'lower-case drive');
  assert.strictEqual(key('/C:/work/repo/tests/a.test.ts'), want, 'a leading slash before the drive');
  assert.strictEqual(key('c:\\work/repo\\tests/a.test.ts'), want, 'mixed separators');
  assert.notStrictEqual(key('C:/work/repo/tests/A.test.ts'), want, 'the rest of the path stays case-sensitive');
  assert.strictEqual(key('/home/u/repo/a.test.ts'), '/home/u/repo/a.test.ts', 'a POSIX path is untouched');
  assert.strictEqual(key('/c/not/a/drive'), '/c/not/a/drive', 'a leading /c/ is not a drive letter');
});
