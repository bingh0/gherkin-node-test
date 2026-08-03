# Out of scope — the fence

Produced by the /scope interview of 2026-08-02 (visionary: the owner). Scope
declined is as load-bearing as scope accepted: each entry is a decision, in
the visionary's terms, with the one-line why. The reviewed contract is
`features/*.feature`; everything below is deliberately not in it.

1. **Cross-repo treaty divergence detection** — below the abstraction lane;
   agents sort it out through the lint gate, a human adjudicates the rare
   true discrepancy. One repo owns any treaty's contract file.
2. **Reader workflows** (joins, attention ranking, rename resolution,
   failure history, cross-manifest aggregation) — gherkin-trace-and-friends'
   competence, never gnt's. The contract covers the artifact, never its uses.
3. **Reading manifests back** — gnt never reads an account, its own or
   anyone's: no back-compat reading, no migration tooling, no version
   negotiation. The version marker is written *for* readers, full stop.
4. **Reader-side version discipline** ("refuse unknown schema versions
   loudly") — belongs in the readers' own specs, not here.
5. **Per-consumer manifest accommodation** — a field added because a
   specific tool wanted it is the defined scope-creep event. F7 was fixed
   because the format violated its own doctrine, not because a tool asked.
6. **The lint-only foreign-runner user** — acknowledged, not seated as an
   actor; if gnt-as-linter is ever lost, that is a market outcome no
   scenario can prevent.
7. **Dialect widening** — declined. The bar for any future grammar
   addition: unambiguous AND drastically capability-expanding. Doc strings,
   `Rule:`, and description prose fail it today (field evidence: agents
   handle the restrictive grammar fine; reading wild Gherkin is gt's lane).
8. **A relaxed lint mode** — declined; `--strict` promotes, nothing
   demotes, and there is no per-rule severity configuration, ever.
9. **wip aging or expiry** — a stateless tool never judges how long debt
   has sat; watching debt wander is a reader's job (the manifest records
   `unbound`; attention lives downstream).
10. **Statefulness of any kind** — standing doctrine: nothing is read back,
    nothing gates on history, registration is never influenced by a prior
    run.
11. **Enforcing "commit the manifest"** — intended practice, deliberately
    unenforced; gnt does not know git exists.
12. **The hosting toolkit as contract** (`StepRegistry`, `executeSteps`,
    `runFeature`, `bindRunner`) — design tier: how adapters are built, not
    what the tool promises.
13. **The specific rejection matrix** (ragged tables, misplaced tags,
    step-after-Examples, …) — design tier, already pinned by the parity
    corpus; the reviewed tier pins only "outside the subset → refusal with
    line and reason."
14. **"Did you mean" nearest-binding suggestions** — deferred, opportunistic
    ergonomics; the paste-ready snippet is contract, similarity ranking is
    not.
15. **Identical-binding detection** — declined as a lint (cargo parity
    fails); lives on as an /audit checklist line.
16. **The abdd philosophy** — named, and deliberately absent: gnt enables
    the practice and is not its arbiter; this contract never mentions it.
17. **Tag-conflict rejection mechanics** (@skip with @todo on one scenario,
    a feature tag conflicting with a scenario tag) — design tier: the
    reviewed tier pins each tag's verdict semantics; the parse-time
    rejection shape joins the rejection matrix (see 13). *(Added at the
    2026-08-03 file-by-file review, visionary sanction.)*

Implementation decisions deferred throughout: languages, frameworks,
runtimes' internals, storage, and everything else stack-shaped raised in
passing was steered back to behavior; none of it constrains the builder.
