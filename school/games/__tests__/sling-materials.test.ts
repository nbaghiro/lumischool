import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad } from "../../../engine/motion/pad";
import { slingChallenge, openSlingConfiguration, isSlingConfiguration } from "../sling-challenges";
import { step, frame, type SlingState } from "../sling";
import { SHELF_IDS } from "./shelf";

function runShot(s: SlingState, angle: number, pull: number): boolean {
    const radians = (angle * Math.PI) / 180;
    step(s, {
        ...emptyPad(),
        released: { x: -Math.cos(radians) * pull, y: Math.sin(radians) * pull },
    });
    const weight = s.things.find((t) => t.piece.kind === "weight");
    assert.ok(weight);
    const timber = new Set(
        s.things
            .filter((t) => t.piece.kind === "rod" && t.piece.material === "timber")
            .map((t) => t.body),
    );
    let chain = false;
    for (let tick = 0; tick < 600 && !s.won && s.phase !== "aim"; tick++) {
        step(s, emptyPad());
        chain ||= s.world
            .hits()
            .some(
                (hit) =>
                    (hit.a === weight.body && timber.has(hit.b)) ||
                    (hit.b === weight.body && timber.has(hit.a)),
            );
    }
    assert.ok(s.won || s.phase === "aim", "every shot ends or reloads");
    return chain;
}

test("all three stone ledges serialize exactly and remain stable without input", () => {
    const lengths = new Set<number>();
    for (let seed = 0; seed < 3; seed++) {
        const c = slingChallenge(seed, 2),
            restored: unknown = JSON.parse(JSON.stringify(c));
        assert.ok(isSlingConfiguration(restored));
        const s = openSlingConfiguration(c);
        const support = c.level.pieces.find((p) => p.kind === "rod" && p.fixed);
        assert.ok(support && support.kind === "rod");
        lengths.add(support.n);
        for (let tick = 0; tick < 600; tick++) step(s, emptyPad());
        assert.equal(s.starsDown, 0);
        assert.equal(s.won, false);
        const weight = s.things.find((t) => t.piece.kind === "weight");
        assert.ok(weight);
        assert.ok(Math.abs(s.world.where(weight.body).x - weight.piece.x) < 0.01);
        for (const sprite of frame(s).sprites) assert.ok(SHELF_IDS.has(sprite.art), sprite.art);
        const rock = frame(s).sprites.find((sprite) => sprite.art === "slingweight");
        assert.ok(rock);
        assert.equal(rock.size, 2.4, "the round drawing uses the same diameter as its collider");
    }
    assert.equal(lengths.size, 3);
});
test("rolling stone strikes timber and complete objectives survive sampled aim errors and natural waits", () => {
    for (let seed = 0; seed < 3; seed++)
        for (const wait of [0, 60, 180])
            for (const angle of [9, 10, 11])
                for (const pull of [4.45, 4.5]) {
                    const s = openSlingConfiguration(slingChallenge(seed, 2));
                    for (let tick = 0; tick < wait; tick++) step(s, emptyPad());
                    assert.ok(
                        runShot(s, angle, pull),
                        `stone/timber contact ${seed}/${wait}/${angle}/${pull}`,
                    );
                    assert.ok(s.won, `complete win ${seed}/${wait}/${angle}/${pull}`);
                    assert.equal(s.starsDown, 1);
                    assert.equal(s.shots, 1);
                }
});
test("new material courses are keyboard reachable and a missed shot leaves the same world ready", () => {
    for (let seed = 0; seed < 3; seed++) {
        const s = openSlingConfiguration(slingChallenge(seed, 2));
        runShot(s, 80, 1);
        assert.ok(!s.won);
        assert.equal(s.phase, "aim");
        assert.equal(s.shots, 1);
        const count = s.things.length;
        while (s.keyAim.deg !== 10)
            step(s, { ...emptyPad(), pressed: [s.keyAim.deg < 10 ? "up" : "down"] });
        while (s.keyAim.pull !== 4.5) step(s, { ...emptyPad(), pressed: ["right"] });
        step(s, { ...emptyPad(), tapped: true });
        for (let tick = 0; tick < 600 && !s.won; tick++) step(s, emptyPad());
        assert.ok(s.won);
        assert.equal(s.shots, 2);
        assert.equal(s.things.length, count);
    }
});

/** Throws on the keyboard's lattice that break each certified stone wall and knock both stars down. */
const WALL_WITNESSES: [number, number][][] = [
    [
        [30, 3.5],
        [15, 4],
    ],
    [
        [15, 4.5],
        [5, 4.5],
    ],
    [
        [25, 4],
        [10, 4.5],
    ],
];

function throwAt(s: SlingState, angle: number, pull: number): number {
    const radians = (angle * Math.PI) / 180;
    step(s, {
        ...emptyPad(),
        released: { x: -Math.cos(radians) * pull, y: Math.sin(radians) * pull },
    });
    let broke = 0;
    for (let tick = 0; tick < 900 && !s.won && s.phase !== "aim"; tick++) {
        step(s, emptyPad());
        broke += s.world.broken().length;
    }
    return broke;
}

test("a stone wall stands on its own, a soft throw only knocks it, and a hard one breaks it apart", () => {
    for (let seed = 0; seed < 3; seed++) {
        const c = slingChallenge(seed, 3),
            restored: unknown = JSON.parse(JSON.stringify(c));
        assert.ok(isSlingConfiguration(restored));
        const still = openSlingConfiguration(c);
        let broke = 0;
        for (let tick = 0; tick < 600; tick++) {
            step(still, emptyPad());
            broke += still.world.broken().length;
        }
        assert.equal(broke, 0, `the wall holds itself up, ${seed}`);
        assert.equal(still.starsDown, 0);
        for (const sprite of frame(still).sprites) assert.ok(SHELF_IDS.has(sprite.art), sprite.art);
        const soft = openSlingConfiguration(c);
        assert.ok(
            throwAt(soft, 15, 2.5) <= 3,
            `a soft throw breaks a join or two at most, ${seed}`,
        );
        assert.equal(soft.starsDown, 0);
        const hard = openSlingConfiguration(c);
        assert.ok(throwAt(hard, 15, 4.5) >= 5, `a hard throw breaks the wall, ${seed}`);
    }
});

test("every stone wall is won by its throws, with sampled aiming slack and waits", () => {
    WALL_WITNESSES.forEach((shots, seed) => {
        for (const wait of [0, 60, 180])
            for (const da of [-1, 0, 1])
                for (const dp of [-0.05, 0, 0.05]) {
                    const s = openSlingConfiguration(slingChallenge(seed, 3));
                    for (const [angle, pull] of shots) {
                        if (s.won) break;
                        for (let tick = 0; tick < wait; tick++) step(s, emptyPad());
                        throwAt(s, angle + da, Math.min(4.5, pull + dp));
                    }
                    assert.ok(s.won, `wall ${seed}, wait ${wait}, angle ${da}, pull ${dp}`);
                    assert.equal(s.starsDown, 2);
                }
    });
});
