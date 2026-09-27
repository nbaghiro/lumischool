import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyReplay, type ReplayAction } from "../../../engine/motion/verify";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import {
    startWorkshop,
    stepWorkshop,
    workshopCommand,
    CARGO_LEVELS,
    cargoGame,
} from "../workshops";

type Input = string | Partial<Pad>;
function replay(level: number, inputs: ReplayAction<Input>[], limit = 7200) {
    const pad = emptyPad();
    return verifyReplay(
        {
            start: () => startWorkshop(level),
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

const CARGO_ROUTES = [
    [28, 32],
    [26, 29, 32],
    [24, 27, 30, 33],
    [22.5, 24.8, 27.3, 30.5, 33.2],
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
            // the trolley runs over, lowers the crate and lets it stop swinging
            tick += 360;
            inputs.push({ tick: tick++, input: { touch: { x, y: 18 }, tapped: true } });
            inputs.push({ tick: tick++, input: { touch: null } });
            tick += 150;
        }
        inputs.push({ tick: tick + 180, input: "test" });
        assert.ok(replay(level, inputs).won, CARGO_LEVELS[level]?.title);
    }
});

test("cargo can be dragged aboard and delivered with the shared primary action", () => {
    const s = startWorkshop(0),
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
        for (let n = 0; n < 360; n++) tick();
        pad.touch = null;
        pad.lifted = { x, y: 20 };
        tick();
        assert.equal(s.held, null);
        assert.equal(s.dragging, null);
        for (let n = 0; n < 240; n++) tick();
    }
    assert.match(s.text, /Ready to sail/);
    pad.tapped = true;
    tick();
    assert.equal(s.phase, "won");
});

test("cancelling a cargo drag keeps the crate held and available to keyboard controls", () => {
    const s = startWorkshop(0),
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

test("the barge lists towards a heavy crate at one end, and a crate dropped in the harbour splashes and comes back", () => {
    const s = startWorkshop(3),
        pad = emptyPad();
    const tick = (n = 1) => {
        for (let i = 0; i < n; i++) {
            stepWorkshop(s, pad);
            spent(pad);
        }
    };
    tick(120);
    const heavy = s.objects.get("e");
    assert.ok(heavy);
    const at = s.world.where(heavy);
    pad.touch = { x: at.x, y: at.y };
    tick();
    pad.touch = { x: 37, y: 20 };
    tick(360);
    pad.touch = null;
    pad.lifted = { x: 37, y: 20 };
    tick(240);
    assert.ok(s.world.where(s.barge).angle > 0.02, `lists by ${s.world.where(s.barge).angle}`);
    assert.match(workshopFrameText(s), /More weight on the right/);

    const light = s.objects.get("a");
    assert.ok(light);
    const from = s.world.where(light);
    pad.touch = { x: from.x, y: from.y };
    tick();
    pad.touch = { x: 19.5, y: 20 };
    tick(300);
    pad.touch = null;
    pad.lifted = { x: 19.5, y: 20 };
    let splashed = false;
    for (let i = 0; i < 180; i++) {
        tick();
        splashed ||= s.ripples.length > 0;
    }
    assert.ok(splashed, "it broke the surface");
    assert.match(s.text, /brought that crate back/);
    assert.ok(Math.abs(s.world.where(light).x - (s.definition.pieces[0]?.x ?? 0)) < 0.5);
});

const workshopFrameText = (s: ReturnType<typeof startWorkshop>): string =>
    cargoGame
        .frame(s)
        .marks.flatMap((m) => (m.kind === "word" ? [m.text] : []))
        .join(" ");
