// @ts-check
'use strict';
// Fixture: a feature file that is a Feature: header plus narrative — zero
// scenarios. runFeatures parses every file BEFORE registering any test, so
// this throws at load on all three runtimes (loud even under Deno, whose
// swallow only eats throws that come after a registration).
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'noscenarios'), {});
