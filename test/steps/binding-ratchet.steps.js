// @ts-check
'use strict';
// Steps for features/binding-ratchet.feature — the register's own contract.
// Every scenario here is a sub-run whose wip register is the subject: debt
// declared, stale, orphaned, ambiguous, or cleared.
const assert = require('node:assert');
const { SubRun } = require('./world');

const counterDefs = (/** @type {import('../../index.js').StepRegistry} */ reg) => {
  reg.define(/^a counter at (\d+)$/, (/** @type {any} */ w, /** @type {string} */ n) => { w.count = Number(n); });
  reg.define(/^I add (\d+)$/, (/** @type {any} */ w, /** @type {string} */ n) => { w.count += Number(n); });
  reg.define(/^the counter is (\d+)$/, (/** @type {any} */ w, /** @type {string} */ n) => {
    assert.strictEqual(w.count, Number(n));
  });
};

/** @param {import('../../index.js').StepRegistry} reg */
module.exports = (reg) => {
  // --- Givens ---------------------------------------------------------------

  reg.define(/^a feature file with 5 scenarios$/, (w) => {
    w.enforced = 0;
    w.job = { dir: 'ledger', definers: {}, opts: {} };
  });

  reg.define(/^bindings that make 3 of them pass$/, (w) => {
    w.job.definers = {
      ledger: (/** @type {any} */ r) => {
        r.define(/^a bound step$/, () => { w.enforced += 1; });
        r.define(/^the ledger balances$/, () => {});
      },
    };
  });

  reg.define(/^the other 2 declared as work in progress by name$/, (w) => {
    w.job.opts = { wip: [{ feature: 'ledger', scenarios: ['four pending', 'five pending'] }] };
  });

  reg.define(/^a feature file with a scenario whose step has no binding$/, (w) => {
    w.job = { dir: 'unbound', definers: {}, opts: {} };
    w.expectedUnbound = 'an unbound step with 42 and "text"';
  });

  reg.define(/^no work-in-progress declaration naming that scenario$/, () => {});

  reg.define(/^a scenario declared as work in progress$/, (w) => {
    w.job = {
      dir: 'good',
      definers: {},
      opts: { wip: [{ feature: 'counter', scenarios: ['increment once'] }] },
    };
  });

  reg.define(/^bindings that make that scenario pass$/, (w) => {
    w.job.definers = { counter: counterDefs };
  });

  reg.define(/^a work-in-progress declaration naming a scenario titled "does not exist"$/, (w) => {
    w.job = {
      dir: 'good',
      definers: { counter: counterDefs },
      opts: { wip: [{ feature: 'counter', scenarios: ['does not exist'] }] },
    };
  });

  reg.define(/^no scenario with that title anywhere in the feature directory$/, () => {});

  reg.define(/^two bindings that each match one of its steps$/, (w) => {
    w.job.definers = {
      counter: (/** @type {any} */ r) => {
        r.define(/^a counter at (\d+)$/, () => {});
        r.define(/^a counter at 0$/, () => {});
      },
    };
  });

  reg.define(/^a feature file whose scenario carries the tag "@skip"$/, (w) => {
    w.job = { dir: 'skipgap', definers: { held: () => {} }, opts: {} };
    w.expectedUnbound = 'a step nobody bound';
  });

  reg.define(/^one of its steps has no binding$/, () => {});

  reg.define(/^a scenario that was declared as work in progress$/, (w) => {
    w.enforced = 0;
    w.job = { dir: 'good', definers: {}, opts: {} };
  });

  reg.define(/^a new binding that makes it pass$/, (w) => {
    w.job.definers = {
      counter: (/** @type {any} */ r) => {
        r.define(/^a counter at (\d+)$/, (/** @type {any} */ sw, /** @type {string} */ n) => {
          w.enforced += 1;
          sw.count = Number(n);
        });
        r.define(/^I add (\d+)$/, (/** @type {any} */ sw, /** @type {string} */ n) => { sw.count += Number(n); });
        r.define(/^the counter is (\d+)$/, (/** @type {any} */ sw, /** @type {string} */ n) => {
          assert.strictEqual(sw.count, Number(n));
        });
      },
    };
  });

  // --- Whens ------------------------------------------------------------------

  reg.define(/^the suite runs$/, async (w) => {
    w.res = await new SubRun().registerDir(w.job.dir, w.job.definers, w.job.opts).run();
  });

  reg.define(/^the declaration is removed and the suite runs$/, async (w) => {
    // The register stays empty — removal is the Given's whole point.
    w.res = await new SubRun().registerDir(w.job.dir, w.job.definers, w.job.opts).run();
  });

  // --- Thens --------------------------------------------------------------------

  reg.define(/^the 3 bound scenarios are enforced and pass$/, (w) => {
    assert.strictEqual(w.enforced, 3, 'each bound scenario executed its binding');
    assert.deepStrictEqual(
      w.res.titles().filter((/** @type {string} */ t) => t.startsWith('Ledger ::')).sort(),
      ['Ledger :: one balances', 'Ledger :: three balances', 'Ledger :: two balances'],
      'three DISTINCT scenarios registered — not one scenario run three times');
    assert.ok(!w.res.shelved.some((/** @type {any} */ s) => s.kind === 'skip'),
      'no bound scenario was quietly skipped');
    assert.deepStrictEqual(w.res.failures, [], w.res.failureText());
  });

  reg.define(/^the 2 declared scenarios are reported as unbound by name$/, (w) => {
    const todos = w.res.shelved.filter((/** @type {any} */ s) => s.kind === 'todo').map((/** @type {any} */ s) => s.title);
    assert.deepStrictEqual(todos.sort(), ['Ledger :: five pending', 'Ledger :: four pending']);
  });

  reg.define(/^the run is green$/, (w) => {
    assert.deepStrictEqual(w.res.failures, [], w.res.failureText());
  });

  reg.define(/^the run is red$/, (w) => {
    assert.ok(w.res.failures.length > 0, 'expected at least one failure');
  });

  reg.define(/^the failure names the unbound step$/, (w) => {
    const text = w.res.failureText();
    assert.ok(w.expectedUnbound, 'the Given recorded which step must be named');
    assert.ok(text.includes(w.expectedUnbound), `the unbound step is named:\n${text}`);
  });

  reg.define(/^the failure names the stale declaration$/, (w) => {
    const text = w.res.failureText();
    assert.ok(text.includes('increment once') && text.includes('remove'), text);
    assert.ok(text.includes('counter'), `the stale message names its feature:\n${text}`);
  });

  reg.define(/^the failure names the orphan declaration$/, async (w) => {
    const text = w.res.failureText();
    assert.ok(text.includes('does not exist') && text.includes('no matching Scenario'), text);
    assert.ok(text.includes('counter'), `the orphan message names its feature:\n${text}`);
    // Beyond-floor probe (2026-08-03 adversarial review): orphan resolution
    // must be EXACT title membership. 'increment' is a strict prefix of the
    // real title 'increment once' — a prefix-matching resolver would accept
    // it as addressing that scenario (whose steps are unbound here), turn
    // the entry into a valid-looking wip declaration, and run green: the
    // silent-allowlist-rot class the ratchet exists to forbid.
    const probe = await new SubRun().registerDir('good', {},
      { wip: [{ feature: 'counter', scenarios: ['increment'] }] }).run();
    assert.ok(probe.failures.length > 0, 'a prefix of a real title is still an orphan');
    assert.ok(probe.failureText().includes("'increment'"),
      `the prefix orphan is named:\n${probe.failureText()}`);
  });

  reg.define(/^the failure names the ambiguous step$/, (w) => {
    const text = w.res.failureText();
    assert.ok(text.includes('>1 definition') && text.includes('a counter at 0'), text);
  });

  reg.define(/^the scenario is enforced and passes$/, (w) => {
    assert.strictEqual(w.enforced, 1, 'the newly bound scenario executed');
    assert.deepStrictEqual(w.res.failures, [], w.res.failureText());
  });
};
