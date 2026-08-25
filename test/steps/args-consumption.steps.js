// @ts-check
'use strict';
// Steps for features/args-consumption.feature — the guard's own contract.
// Every scenario is an inline sub-run whose step bindings drift from their
// sentences (or escape through the two sanctioned forms), asserted through
// the same stub registration the other intent-tier features use.
const assert = require('node:assert');
const { SubRun } = require('./world');

/** @param {import('../../index.js').StepRegistry} reg */
module.exports = (reg) => {
  // --- Givens ---------------------------------------------------------------

  reg.define(/^a definition consuming none of its pattern's captures$/, (w) => {
    w.text = 'Feature: Dials\n  Scenario: drifted\n    Given a knob at 5\n';
    w.define = (/** @type {any} */ r) => r.define(/^a knob at (\d+)$/, () => {});
    w.pattern = '/^a knob at (\\d+)$/';
    w.produced = 1;
    w.declared = 0;
  });

  reg.define(/^a scenario whose step that pattern matches$/, () => {});

  reg.define(/^a step that carries a data table$/, (w) => {
    w.text = 'Feature: Accounts\n  Scenario: tabled\n    Given a ledger of entries\n'
      + '      | item | price |\n      | tea  | 3     |\n';
  });

  reg.define(/^a definition consuming only the captures before it$/, (w) => {
    // Zero captures before the table, and a signature consuming exactly
    // those — the table itself, appended last, is what gets dropped.
    w.define = (/** @type {any} */ r) => r.define(/^a ledger of entries$/, (/** @type {any} */ sw) => { sw.saw = true; });
    w.produced = 1;
    w.declared = 0;
  });

  reg.define(/^a definition with one more parameter than its pattern captures$/, (w) => {
    w.text = 'Feature: Dials\n  Scenario: over\n    Given a bare knob\n';
    w.define = (/** @type {any} */ r) => r.define(/^a bare knob$/, (/** @type {any} */ sw, /** @type {any} */ extra) => { sw.extra = extra; });
    w.produced = 0;
    w.declared = 1;
  });

  reg.define(/^a definition taking the world and a rest parameter$/, (w) => {
    w.define = (/** @type {any} */ r) => r.define(/^cargo$/, (/** @type {any} */ sw, /** @type {any[]} */ ...args) => { sw.count = args.length; });
  });

  reg.define(/^scenarios that produce different argument counts for it$/, (w) => {
    // The same sentence bare and with a table — the dual only rest-form
    // makes legal.
    w.text = 'Feature: Freight\n  Scenario: bare\n    Given cargo\n'
      + '  Scenario: manifested\n    Given cargo\n      | qty |\n      | 40  |\n';
  });

  reg.define(/^a definition whose pattern varies only through a non-capturing group$/, (w) => {
    w.text = 'Feature: Doors\n  Scenario: red\n    Given a red door\n'
      + '  Scenario: blue\n    Given a blue door\n';
  });

  reg.define(/^a signature consuming the world alone$/, (w) => {
    w.define = (/** @type {any} */ r) => r.define(/^a (?:red|blue) door$/, (/** @type {any} */ sw) => { sw.opened = true; });
  });

  reg.define(/^a definition whose signature defaults its last parameter$/, (w) => {
    // eslint-disable-next-line no-unused-vars
    w.define = (/** @type {any} */ r) => r.define(/^a plain latch$/, (/** @type {any} */ sw, depth = 1) => { sw.depth = depth; });
    w.defaulted = 'depth';
  });

  reg.define(/^a pattern producing nothing for it$/, (w) => {
    // Zero captures: a count-based check would read (w, depth = 1) as an
    // exact match, because Function.length stops at the default — the
    // refusal must come from sighting the signature, not counting it.
    w.text = 'Feature: Latches\n  Scenario: hidden\n    Given a plain latch\n';
  });

  reg.define(/^one definition that ignores a capture$/, (w) => {
    w.text = 'Feature: Locality\n  Scenario: drifted\n    Given a dial at 7\n'
      + '  Scenario: honest\n    Given a working dial\n';
    w.define = (/** @type {any} */ r) => r.define(/^a dial at (\d+)$/, () => {});
    w.badTitle = 'Locality :: drifted';
  });

  reg.define(/^a sibling scenario with honest bindings$/, (w) => {
    w.enforced = 0;
    w.sibTitle = 'Locality :: honest';
    const drifted = w.define;
    w.define = (/** @type {any} */ r) => {
      drifted(r);
      r.define(/^a working dial$/, () => { w.enforced += 1; });
    };
  });

  reg.define(/^a scenario carrying the tag "@skip"$/, (w) => {
    w.text = 'Feature: Held\n  @skip\n  Scenario: parked\n    Given a gauge at 9\n';
  });

  reg.define(/^its definition ignores a capture$/, (w) => {
    w.define = (/** @type {any} */ r) => r.define(/^a gauge at (\d+)$/, () => {});
  });

  // --- Whens ----------------------------------------------------------------

  reg.define(/^the suite runs$/, async (w) => {
    w.res = await new SubRun().registerInline(w.text, w.define).run();
  });

  // --- Thens ----------------------------------------------------------------

  reg.define(/^the run is red$/, (w) => {
    assert.ok(w.res.failures.length > 0, 'expected at least one failure');
  });

  reg.define(/^the run is green$/, (w) => {
    assert.deepStrictEqual(w.res.failures, [], w.res.failureText());
  });

  reg.define(/^the failure names the definition's pattern$/, (w) => {
    const text = w.res.failureText();
    assert.ok(w.pattern, 'the Given recorded which pattern must be named');
    assert.ok(text.includes(w.pattern), `the definition's pattern is named:\n${text}`);
  });

  reg.define(/^the failure counts produced against declared$/, (w) => {
    const text = w.res.failureText();
    assert.ok(text.includes(`produced ${w.produced} argument(s)`), `produced count named:\n${text}`);
    assert.ok(text.includes(`declares ${w.declared} parameter(s)`), `declared count named:\n${text}`);
  });

  reg.define(/^the failure names the dropped table$/, (w) => {
    const text = w.res.failureText();
    assert.ok(/data table.*dropped|dropped.*data table/.test(text), `the dropped table is named:\n${text}`);
  });

  reg.define(/^the failure names the defaulted parameter$/, (w) => {
    const text = w.res.failureText();
    assert.ok(text.includes(`"${w.defaulted}"`) && text.includes('default'),
      `the defaulted parameter is named:\n${text}`);
  });

  reg.define(/^the failure lands on the consuming scenario$/, (w) => {
    assert.deepStrictEqual(
      (w.res.failures || []).map((/** @type {any} */ f) => f.title),
      [w.badTitle], w.res.failureText());
  });

  reg.define(/^the sibling scenario still passes$/, (w) => {
    assert.strictEqual(w.enforced, 1, 'the honest sibling executed its binding');
  });
};
