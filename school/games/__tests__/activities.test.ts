// Every version of every activity through the prover, which is the build gate .docs/activities.md
// asks for, and the contract each mechanic hands an author or a generator.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIVITIES, MECHANICS } from "../activities";
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

test("each activity declares a paper companion, because activities do not print", () => {
    for (const a of ACTIVITIES) {
        assert.match(a.paper, /^[a-z][a-z0-9.-]*$/, `${a.id} paper "${a.paper}"`);
        assert.notEqual(a.paper, "none", `${a.id} may not opt out of paper`);
    }
});

test("the eight activities are eight kinds of play, and every mechanic is in the list the gate walks", () => {
    const kinds = [...new Set(ACTIVITIES.map((a) => a.kind))];
    assert.equal(ACTIVITIES.length, 8);
    assert.equal(kinds.length, 8);
    assert.deepEqual(
        kinds.sort(),
        MECHANICS.map((m) => m.id).sort(),
        "a mechanic the gate never sees",
    );
    // every activity left can be taken back a move at a time, so the promise rests on patience
    assert.deepEqual(
        ACTIVITIES.filter((a) => !a.round(0).reversible).map((a) => a.id),
        [],
    );
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
