// @ts-check
'use strict';
// Fixture: a Then that fails assert.deepStrictEqual on two small differing
// objects — what the step threw must reach the runtime with its diff intact.
const path = require('node:path');
const assert = require('node:assert');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'faildiff'), {
  'diff': (reg) => {
    reg.define('a start', () => {});
    reg.define('the colours match', () => {
      assert.deepStrictEqual({ colour: 'teal' }, { colour: 'amber' });
    });
  },
});
