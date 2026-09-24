import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyReplay, type ReplayAction } from "../../../engine/motion/verify";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import {
    startWorkshop,
    stepWorkshop,
    workshopCommand,
    MARBLE_LEVELS,
    CARGO_LEVELS,
    cargoGame,
} from "../workshops";

type Input = string | Partial<Pad>;
function replay(
    kind: "cargo" | "marble",
    level: number,
    inputs: ReplayAction<Input>[],
    limit = 2400,
) {
    const pad = emptyPad();
    return verifyReplay(
        {
            start: () => startWorkshop(kind, level),
            input: (s, input: Input) => {
                if (typeof input === "string") workshopCommand(s, input);
                else Object.assign(pad, input);
            },
            step: (s) => {
                stepWorkshop(s, pad);
                spent(pad);
            },
            won: (s) => s.phase === "won",
        },
        inputs,
        limit,
    );
}

// Positions on the half-square controls; rotations counted from each authored starting angle.
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

test("every marble challenge has a winning replay using only the player's commands", () => {
    assert.equal(MARBLE_ROUTES.length, MARBLE_LEVELS.length);
    for (const [level, routes] of MARBLE_ROUTES.entries()) {
        const inputs: ReplayAction<Input>[] = [];
        const add = (input: Input) => inputs.push({ tick: inputs.length, input });
        for (const [i, route] of routes.entries()) {
            const p = MARBLE_LEVELS[level]?.pieces[i];
            assert.ok(p);
            for (let n = 0; n < Math.abs(route.x - p.x) * 2; n++)
                add({ pressed: [route.x < p.x ? "left" : "right"] });
            for (let n = 0; n < Math.abs(route.y - p.y) * 2; n++)
                add({ pressed: [route.y < p.y ? "up" : "down"] });
            for (let n = 0; n < Math.abs(route.turns); n++) add(route.turns < 0 ? "left" : "right");
            add("next");
        }
        add("test");
        const result = replay("marble", level, inputs);
        assert.ok(result.won, MARBLE_LEVELS[level]?.title);
        assert.ok(result.state.goals.done.includes("caught"));
        if (result.state.definition.gate) assert.ok(result.state.goals.done.includes("gate"));
    }
});

const CARGO_ROUTES = [
    [28, 32],
    [26, 29, 32],
    [24, 27, 30, 33],
    [22.5, 24.5, 26.5, 29.5, 34.5],
];
test("every cargo challenge can be loaded, balanced and delivered through the player's hook", () => {
    assert.equal(CARGO_ROUTES.length, CARGO_LEVELS.length);
    for (const [level, xs] of CARGO_ROUTES.entries()) {
        const inputs: ReplayAction<Input>[] = [];
        let tick = 120;
        for (const [i, x] of xs.entries()) {
            const p = CARGO_LEVELS[level]?.pieces[i];
            assert.ok(p);
            inputs.push({ tick: tick++, input: { touch: { x: p.x, y: 19.4 }, tapped: true } });
            inputs.push({ tick: tick++, input: { touch: { x: p.x, y: 8 } } });
            inputs.push({ tick: tick++, input: { touch: { x, y: 8 } } });
            inputs.push({ tick: tick++, input: { touch: { x, y: 18 } } });
            tick += 60;
            inputs.push({ tick: tick++, input: { touch: { x, y: 18 }, tapped: true } });
            inputs.push({ tick: tick++, input: { touch: null } });
            tick += 150;
        }
        inputs.push({ tick: tick + 180, input: "test" });
        assert.ok(replay("cargo", level, inputs).won, CARGO_LEVELS[level]?.title);
    }
});

test("an unedited failed marble run is not certified as solvable", () => {
    assert.equal(replay("marble", 1, [{ tick: 0, input: "test" }], 1200).won, false);
});

test("cargo can be dragged aboard and delivered with the shared primary action", () => {
    const s = startWorkshop("cargo", 0),
        pad = emptyPad();
    const tick = () => {
        stepWorkshop(s, pad);
        spent(pad);
    };
    for (let n = 0; n < 120; n++) tick();
    for (const [i, x] of [28, 32].entries()) {
        const p = s.definition.pieces[i];
        assert.ok(p);
        const body = s.objects.get(p.id);
        assert.ok(body);
        const at = s.world.where(body);
        pad.touch = { x: at.x, y: at.y };
        tick();
        assert.equal(s.held, p.id);
        pad.touch = { x, y: 20 };
        for (let n = 0; n < 60; n++) tick();
        pad.touch = null;
        pad.lifted = { x, y: 20 };
        tick();
        assert.equal(s.held, null);
        assert.equal(s.dragging, null);
        for (let n = 0; n < 180; n++) tick();
    }
    assert.match(s.text, /Ready to sail/);
    pad.tapped = true;
    tick();
    assert.equal(s.phase, "won");
});

test("cancelling a cargo drag keeps the crate held and available to keyboard controls", () => {
    const s = startWorkshop("cargo", 0),
        pad = emptyPad();
    const p = s.definition.pieces[0];
    assert.ok(p);
    pad.touch = { x: p.x, y: p.y };
    stepWorkshop(s, pad);
    assert.equal(s.held, p.id);
    cargoGame.cancelInput?.(s);
    assert.equal(s.dragging, null);
    assert.equal(s.touching, false);
    assert.equal(s.held, p.id);
    spent(pad);
    pad.touch = null;
    pad.tapped = true;
    stepWorkshop(s, pad);
    assert.equal(s.held, null);
});
