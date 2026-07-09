// @ts-check
'use strict';
// Fixture: the SAME unbound feature, but explicitly listed as wip — the
// scenario must register as TODO and the run must pass (bootstrap mode).
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, 'features-unbound'), { 'gap': () => {} }, { wip: ['gap'] });
