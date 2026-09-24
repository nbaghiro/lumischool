import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad } from "../../../engine/motion/pad";
import { stepWorkshop, workshopCommand, type WorkshopState } from "../workshops";
import {
    workshopChallenge,
    workshopChallengeCount,
    openWorkshopConfiguration,
    isWorkshopConfiguration,
} from "../workshop-challenges";

const MARBLE_ROUTES = [
    [{ x: 3.5, y: 6.5, turns: 3 }],
    [
        { x: 6.5, y: 5.5, turns: 1 },
        { x: 15, y: 12, turns: 4 },
    ],
    [
        { x: 6.5, y: 6.5, turns: 1 },
        { x: 13.5, y: 10, turns: 5 },
        { x: 22, y: 17, turns: 3 },
    ],
    [
        { x: 4, y: 5, turns: 0 },
        { x: 13, y: 11.5, turns: 5 },
        { x: 22, y: 13, turns: -1 },
    ],
];
const CARGO_ROUTES = [
    [28, 32],
    [26, 29, 32],
    [24, 27, 30, 33],
    [22.5, 24.5, 26.5, 29.5, 34.5],
];
const wait = (s: WorkshopState, ticks: number) => {
    for (let tick = 0; tick < ticks; tick++) stepWorkshop(s, emptyPad());
};

test("workshop catalogue is deterministic, distinct within a phase and rejects unverified geometry", () => {
    for (const kind of ["cargo", "marble"] as const)
        for (let phase = 0; phase < 4; phase++) {
            const seen = new Set<string>();
            for (let seed = 0; seed < workshopChallengeCount(kind, phase); seed++) {
                const configuration = workshopChallenge(seed, kind, phase);
                assert.deepEqual(configuration, workshopChallenge(seed, kind, phase));
                seen.add(JSON.stringify(configuration));
                const stored: unknown = JSON.parse(JSON.stringify(configuration));
                assert.ok(isWorkshopConfiguration(stored));
                assert.deepEqual(openWorkshopConfiguration(stored).definition, configuration.level);
                configuration.level.target = 999;
                assert.equal(isWorkshopConfiguration(configuration), false);
            }
            assert.equal(seen.size, workshopChallengeCount(kind, phase));
        }
    assert.equal(isWorkshopConfiguration(null), false);
    assert.equal(isWorkshopConfiguration({ kind: "marble", phase: 88 }), false);
});

test("every generated marble arrangement has a complete win using only the visible construction commands", () => {
    for (const [phase, routes] of MARBLE_ROUTES.entries())
        for (let seed = 0; seed < workshopChallengeCount("marble", phase); seed++) {
            const s = openWorkshopConfiguration(workshopChallenge(seed, "marble", phase));
            for (const [index, route] of routes.entries()) {
                const p = s.construction.design.pieces[index];
                assert.ok(p);
                for (let n = 0; n < Math.abs(route.x - p.x) * 2; n++)
                    stepWorkshop(s, { ...emptyPad(), pressed: [route.x < p.x ? "left" : "right"] });
                for (let n = 0; n < Math.abs(route.y - p.y) * 2; n++)
                    stepWorkshop(s, { ...emptyPad(), pressed: [route.y < p.y ? "up" : "down"] });
                for (let n = 0; n < Math.abs(route.turns); n++)
                    workshopCommand(s, route.turns < 0 ? "left" : "right");
                workshopCommand(s, "next");
            }
            stepWorkshop(s, { ...emptyPad(), tapped: true });
            wait(s, 2400);
            assert.equal(s.phase, "won", `marble phase ${phase}, seed ${seed}`);
            assert.ok(s.goals.done.includes("caught"));
            if (s.definition.gate) assert.ok(s.goals.done.includes("gate"));
        }
});

test("every generated cargo arrangement can be dragged, balanced and delivered with the common primary action", () => {
    for (const [phase, targets] of CARGO_ROUTES.entries())
        for (let seed = 0; seed < workshopChallengeCount("cargo", phase); seed++) {
            const s = openWorkshopConfiguration(workshopChallenge(seed, "cargo", phase));
            wait(s, 120);
            for (const [i, p] of s.definition.pieces.entries()) {
                const body = s.objects.get(p.id);
                assert.ok(body);
                const x = targets[(i + (phase === 0 ? 0 : seed)) % targets.length];
                assert.notEqual(x, undefined);
                if (x === undefined) throw new Error("Missing cargo witness");
                const at = s.world.where(body);
                stepWorkshop(s, { ...emptyPad(), touch: { x: at.x, y: at.y } });
                assert.equal(s.held, p.id);
                stepWorkshop(s, { ...emptyPad(), touch: { x: at.x, y: 8 } });
                stepWorkshop(s, { ...emptyPad(), touch: { x, y: 8 } });
                for (let n = 0; n < 60; n++)
                    stepWorkshop(s, { ...emptyPad(), touch: { x, y: 20 } });
                stepWorkshop(s, { ...emptyPad(), lifted: { x, y: 20 } });
                wait(s, 180);
            }
            wait(s, 180);
            stepWorkshop(s, { ...emptyPad(), tapped: true });
            assert.equal(s.phase, "won", `cargo phase ${phase}, seed ${seed}`);
            assert.ok(s.goals.done.includes("balanced"));
            assert.ok(s.goals.done.includes("delivered"));
        }
});
