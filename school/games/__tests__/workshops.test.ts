// Harbour cargo: every level is won by dragging crates and letting go, and by driving the crane; the
// recorded pads replay to the same delivery; a crate let go of is set down straight below; the barge
// lists and a crate in the harbour comes back; the boat sails by itself once balanced; random play
// rarely wins; and the frame shows only shelf drawings, with its previews fading by level.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, type Pad } from "../../../engine/motion/pad";
import { SHELF_IDS } from "./shelf";
import {
    startWorkshop,
    stepWorkshop,
    workshopFrame,
    CARGO_LEVELS,
    cargoGame,
    type WorkshopState,
} from "../workshops";
import { cargoPlan } from "../workshop-challenges";

/** Steps the harbour with a pad, keeping the pad it was given so a run can be played back. */
function driver(s: WorkshopState) {
    const tape: Pad[] = [];
    const go = (more: Partial<Pad> = {}) => {
        const pad = { ...emptyPad(), ...more };
        tape.push(pad);
        stepWorkshop(s, pad);
    };
    const settle = () => {
        for (let k = 0; k < 900 && (s.held || s.placing); k++) go();
        for (let k = 0; k < 30; k++) go();
    };
    return { tape, go, settle };
}

/** Drags every crate to its planned place on the barge and lets go, then waits for the boat to sail. */
function dragAll(s: WorkshopState): Pad[] {
    const { tape, go, settle } = driver(s),
        plan = cargoPlan(s.definition);
    for (let k = 0; k < 60; k++) go();
    for (const [i, p] of s.definition.pieces.entries()) {
        const body = s.objects.get(p.id);
        assert.ok(body);
        const at = s.world.where(body),
            x = plan[i] ?? 30;
        go({ touch: { x: at.x, y: at.y } });
        assert.equal(s.held, p.id);
        for (let k = 0; k < 90; k++) go({ touch: { x, y: 10 } });
        go({ lifted: { x, y: 10 } });
        settle();
    }
    for (let k = 0; k < 600 && s.phase !== "won"; k++) go();
    return tape;
}

/**
 * The same by driving the crane from the keys: run the trolley over a crate, lower the hook and take it,
 * carry it over its place, lower it close to the deck, wait for its swing to settle and let it go.
 */
function driveAll(s: WorkshopState): void {
    const { go } = driver(s),
        plan = cargoPlan(s.definition);
    const hold = (d: "left" | "right" | "up" | "down", until: () => boolean) => {
        for (let k = 0; k < 900 && !until(); k++) go({ holding: [d], held: d });
        // the hook moves a little each step an arrow is held, and the trolley and rope follow it
    };
    const run = (x: number) => {
        if (s.hook.x < x) hold("right", () => s.hook.x >= x - 0.07);
        else hold("left", () => s.hook.x <= x + 0.07);
    };
    for (let k = 0; k < 60; k++) go();
    for (const [i, p] of s.definition.pieces.entries()) {
        const body = s.objects.get(p.id);
        assert.ok(body);
        const from = s.world.where(body);
        hold("up", () => s.hook.y <= 10);
        run(from.x);
        hold("down", () => s.hook.y >= from.y - 1.7);
        for (let k = 0; k < 120; k++) go();
        go({ tapped: true });
        assert.equal(s.held, p.id);
        hold("up", () => s.hook.y <= 10);
        const x = plan[i] ?? 30;
        run(x);
        // lowered until its bottom is just above the deck, then left to stop swinging
        hold("down", () => s.hook.y >= 20.4 - 2.1 - 0.3);
        for (let k = 0; k < 600; k++) {
            go();
            const v = s.world.velocity(body);
            if (Math.hypot(v.x, v.y) < 0.15 && Math.abs(s.world.where(body).x - x) < 0.2) break;
        }
        go({ tapped: true });
        assert.equal(s.held, null);
        for (let k = 0; k < 90; k++) go();
    }
    for (let k = 0; k < 600 && s.phase !== "won"; k++) go();
}

test("every level is won by dragging each crate and letting go, and the recorded pads replay to the same delivery", () => {
    for (let level = 0; level < CARGO_LEVELS.length; level++) {
        const s = startWorkshop(level),
            tape = dragAll(s);
        assert.equal(s.phase, "won", CARGO_LEVELS[level]?.title);
        assert.ok(s.goals.done.includes("delivered"));
        const again = startWorkshop(level);
        for (const pad of tape) stepWorkshop(again, pad);
        assert.equal(again.phase, "won");
        for (const [id, body] of s.objects) {
            const a = s.world.where(body),
                b = again.objects.get(id);
            assert.ok(b);
            const w = again.world.where(b);
            assert.ok(Math.hypot(a.x - w.x, a.y - w.y) < 1e-6, `${id} lands in the same place`);
        }
    }
});

test("every level is won by driving the crane from the keys alone", () => {
    for (let level = 0; level < CARGO_LEVELS.length; level++) {
        const s = startWorkshop(level);
        driveAll(s);
        assert.equal(s.phase, "won", CARGO_LEVELS[level]?.title);
    }
});

test("a crate let go of is set down straight below where it was let go, and the boat sails without a press", () => {
    const s = startWorkshop(0),
        { go, settle } = driver(s);
    for (let k = 0; k < 60; k++) go();
    const body = s.objects.get("a");
    assert.ok(body);
    const at = s.world.where(body);
    go({ touch: { x: at.x, y: at.y } });
    for (let k = 0; k < 30; k++) go({ touch: { x: 27, y: 10 } });
    // let go while it is still travelling: the crane carries it on and sets it down at 27
    go({ lifted: { x: 27, y: 10 } });
    assert.ok(s.placing);
    settle();
    assert.equal(s.held, null);
    assert.ok(Math.abs(s.world.where(body).x - 27) < 0.4, `set down at ${s.world.where(body).x}`);
    assert.ok(!cargoGame.commands?.some((c) => /bell/i.test(c.label)));
});

test("a keyboard or switch drag that is cancelled keeps the crate held, and the big button lets it go", () => {
    const s = startWorkshop(0);
    const p = s.definition.pieces[0];
    assert.ok(p);
    stepWorkshop(s, { ...emptyPad(), touch: { x: p.x, y: p.y } });
    assert.equal(s.held, p.id);
    cargoGame.cancelInput?.(s);
    assert.equal(s.dragging, null);
    assert.equal(s.touching, false);
    assert.equal(s.held, p.id);
    stepWorkshop(s, { ...emptyPad(), tapped: true });
    assert.equal(s.held, null, "Space lets the held crate go where it hangs");
});

test("the barge lists towards a heavy crate at one end, and a crate dropped in the harbour splashes and comes back", () => {
    const s = startWorkshop(3),
        { go, settle } = driver(s);
    for (let k = 0; k < 60; k++) go();
    const heavy = s.objects.get("e");
    assert.ok(heavy);
    const at = s.world.where(heavy);
    go({ touch: { x: at.x, y: at.y } });
    for (let k = 0; k < 90; k++) go({ touch: { x: 37, y: 10 } });
    go({ lifted: { x: 37, y: 10 } });
    settle();
    for (let k = 0; k < 120; k++) go();
    assert.ok(s.world.where(s.barge).angle > 0.02, `lists by ${s.world.where(s.barge).angle}`);
    assert.match(frameWords(s), /More weight on the right/);

    const light = s.objects.get("a");
    assert.ok(light);
    const from = s.world.where(light);
    go({ touch: { x: from.x, y: from.y } });
    for (let k = 0; k < 90; k++) go({ touch: { x: 19.5, y: 10 } });
    go({ lifted: { x: 19.5, y: 10 } });
    let splashed = false;
    for (let k = 0; k < 900 && !/brought that crate back/.test(s.text); k++) {
        go();
        splashed ||= s.ripples.length > 0;
    }
    assert.ok(splashed, "it broke the surface");
    assert.match(s.text, /brought that crate back/);
    assert.ok(Math.abs(s.world.where(light).x - (s.definition.pieces[0]?.x ?? 0)) < 0.5);
});

test("dragging crates to random places and letting go rarely delivers", () => {
    let seed = 7;
    const random = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    };
    for (let level = 0; level < CARGO_LEVELS.length; level++) {
        let wins = 0;
        for (let run = 0; run < 10; run++) {
            const s = startWorkshop(level),
                { go, settle } = driver(s);
            for (let k = 0; k < 60; k++) go();
            for (const p of s.definition.pieces) {
                const body = s.objects.get(p.id);
                if (!body) continue;
                const at = s.world.where(body),
                    x = 2 + random() * 36;
                go({ touch: { x: at.x, y: at.y } });
                for (let k = 0; k < 90; k++) go({ touch: { x, y: 10 } });
                go({ lifted: { x, y: 10 } });
                settle();
            }
            for (let k = 0; k < 300 && s.phase !== "won"; k++) go();
            if (s.phase === "won") wins++;
        }
        assert.ok(wins <= 2, `level ${level} is won by ${wins} of 10 random loads`);
    }
});

test("the frame draws only shelf drawings, and the landing preview fades as the levels go on", () => {
    const shown = (level: number) => {
        const s = startWorkshop(level);
        for (let k = 0; k < 60; k++) stepWorkshop(s, emptyPad());
        const p = s.definition.pieces[0];
        assert.ok(p);
        stepWorkshop(s, { ...emptyPad(), touch: { x: p.x, y: p.y } });
        for (let k = 0; k < 60; k++) stepWorkshop(s, { ...emptyPad(), touch: { x: 28, y: 10 } });
        const f = workshopFrame(s);
        for (const sp of f.sprites)
            assert.ok(SHELF_IDS.has(sp.art), `${sp.art} is not on the shelf`);
        return {
            drop: f.marks.some((m) => m.kind === "box" && m.w === 1.8),
            list: f.marks.some((m) => m.kind === "dots"),
        };
    };
    assert.deepEqual(shown(0), { drop: true, list: true });
    assert.deepEqual(shown(2), { drop: true, list: false });
    assert.deepEqual(shown(3), { drop: false, list: false });
    assert.equal(cargoGame.cover.art, "barge");
});

const frameWords = (s: WorkshopState): string =>
    workshopFrame(s)
        .marks.flatMap((m) => (m.kind === "word" ? [m.text] : []))
        .join(" ");
