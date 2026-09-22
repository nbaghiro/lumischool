// Every version of every activity through the prover, which is the build gate .docs/activities.md
// asks for, and the contract each mechanic hands an author or a generator.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIVITIES, MECHANICS, RULE_VERSIONS, ruleRound } from "../activities";
import type { Round } from "../games";
import { prove } from "../prove";

const report = (r: Round, p: ReturnType<typeof prove>) =>
    `${r.id} v${r.version} (${r.values}): ${p.problems.join("; ")}`;

test("every version of every activity keeps the promise", () => {
    for (const a of ACTIVITIES) {
        for (let v = 0; v < a.versions.length; v++) {
            const r = a.round(v);
            const p = prove(r);
            assert.ok(p.ok, report(r, p));
            assert.ok(!p.capped, `${a.id} v${v} was not searched to the end`);
            assert.ok(p.shortest >= r.bounds.solution[0] && p.shortest <= r.bounds.solution[1]);
            // Whichever of the two the mechanic's family declares, and never neither.
            if (r.reversible)
                assert.ok(p.patience >= (r.bounds.patience ?? Infinity), `${a.id} v${v}`);
            else assert.ok(p.luck <= (r.bounds.luck ?? 0), `${a.id} v${v} luck ${p.luck}`);
        }
    }
});

test("every version the rule activity's parameters allow keeps it too, not only the three listed", () => {
    for (let v = 0; v < RULE_VERSIONS; v++) {
        const r = ruleRound(v);
        const p = prove(r);
        assert.ok(p.ok, report(r, p));
        assert.equal(
            p.deadEnds,
            0,
            "a fed number cannot be taken back, so there may be no dead ends",
        );
    }
});

test("each activity declares a paper companion, because activities do not print", () => {
    for (const a of ACTIVITIES) {
        assert.match(a.paper, /^[a-z][a-z0-9.-]*$/, `${a.id} paper "${a.paper}"`);
        assert.notEqual(a.paper, "none", `${a.id} may not opt out of paper`);
    }
});

test("the ten activities are nine kinds of play, and every mechanic is in the list the gate walks", () => {
    const kinds = [...new Set(ACTIVITIES.map((a) => a.kind))];
    assert.equal(ACTIVITIES.length, 10, "the games page lists ten");
    // One mechanic carries two activities, because a track one lane deep and a circuit are the same
    // rules and two different things to have learned. The rest carry one each.
    assert.equal(kinds.length, 9);
    assert.deepEqual(
        kinds.sort(),
        MECHANICS.map((m) => m.id).sort(),
        "a mechanic the gate never sees",
    );
    // Both families of the promise are exercised, and only one activity is in the spent one, which
    // is a result worth failing on if it changes: the luck clause rests on that activity alone.
    const spent = ACTIVITIES.filter((a) => !a.round(0).reversible).map((a) => a.id);
    assert.deepEqual(spent, ["rule.which-machine"]);
});

test("a mechanic's contract names its pieces, its settings and the drawings it puts on the board", () => {
    for (const m of MECHANICS) {
        const c = m.contract;
        assert.ok(c.draws.length, `${m.id} draws nothing`);
        for (const id of c.draws) assert.match(id, /^[a-z][a-z0-9.]*$/);
        for (const [name, slot] of Object.entries(c.slots)) {
            assert.ok(slot.doc.length > 15, `${m.id} slot ${name} has no description`);
            assert.ok(
                slot.from.length,
                `${m.id} slot ${name} accepts nothing, so nothing could fill it`,
            );
            assert.ok(
                slot.count[0] >= 1 && slot.count[1] >= slot.count[0],
                `${m.id} slot ${name} count`,
            );
        }
        for (const [name, set] of Object.entries(c.settings)) {
            assert.ok(set.doc.length > 15, `${m.id} setting ${name} has no description`);
            if (set.kind === "pick")
                assert.ok(set.values?.length, `${m.id} setting ${name} lists no values`);
            if (set.kind === "number" || set.kind === "numbers") {
                assert.ok(set.range, `${m.id} setting ${name} has no range`);
            }
        }
    }
});
