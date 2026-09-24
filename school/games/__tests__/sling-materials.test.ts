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
