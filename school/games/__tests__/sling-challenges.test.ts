import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad } from "../../../engine/motion/pad";
import { step, type SlingState } from "../sling";
import {
    isSlingConfiguration,
    openSlingConfiguration,
    slingChallenge,
    SLING_CHALLENGE_COUNT,
} from "../sling-challenges";

function fire(s: SlingState, degrees: number, pull: number): void {
    const angle = (degrees * Math.PI) / 180;
    step(s, { ...emptyPad(), released: { x: -Math.cos(angle) * pull, y: Math.sin(angle) * pull } });
    let steps = 0;
    while (!s.won && s.phase !== "aim" && steps++ < 600) step(s, emptyPad());
    assert.ok(s.won || s.phase === "aim", "shots must finish and reload within the bound");
}

test("slingshot generation is reproducible, distinct within a phase, and stores exact geometry", () => {
    for (const phase of [0, 1]) {
        const seen = new Set<string>();
        for (let seed = 0; seed < SLING_CHALLENGE_COUNT; seed++) {
            const challenge = slingChallenge(seed, phase);
            assert.deepEqual(challenge, slingChallenge(seed, phase));
            const stored: unknown = JSON.parse(JSON.stringify(challenge));
            assert.ok(isSlingConfiguration(stored));
            assert.deepEqual(openSlingConfiguration(stored).L, challenge.level);
            seen.add(JSON.stringify(challenge.level.pieces));
        }
        assert.equal(seen.size, SLING_CHALLENGE_COUNT);
    }
});

test("slingshot validation rejects unchecked geometry and survives database JSON key reordering", () => {
    const valid = slingChallenge(0, 1);
    const reordered: unknown = JSON.parse(JSON.stringify(valid), (_key, value: unknown) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return value;
        return Object.fromEntries(Object.entries(value).reverse());
    });
    assert.ok(isSlingConfiguration(reordered));
    for (const invalid of [
        null,
        {},
        { ...valid, phase: 99 },
        { ...valid, level: { ...valid.level, ground: -1 } },
    ]) {
        assert.equal(isSlingConfiguration(invalid), false);
    }
    const changed = slingChallenge(0, 1);
    changed.level.pouch.x = 1;
    assert.equal(isSlingConfiguration(changed), false);
    assert.equal(
        slingChallenge(0, 1).level.pouch.x,
        valid.level.pouch.x,
        "generation has no shared mutable geometry",
    );
});

test("all certified slingshot arrangements stay standing before the first throw", () => {
    for (const phase of [0, 1])
        for (let seed = 0; seed < SLING_CHALLENGE_COUNT; seed++) {
            const s = openSlingConfiguration(slingChallenge(seed, phase));
            for (let tick = 0; tick < 600; tick++) step(s, emptyPad());
            assert.equal(s.starsDown, 0, `phase ${phase}, seed ${seed}`);
        }
});

// Offline search results, on the exact keyboard angle/power lattice. Each sequence wins the
// complete objective after automatic reloads. These are not just isolated star-hit checks.
const WITNESSES = [
    [
        [
            [25, 3.5],
            [45, 2.5],
        ],
        [
            [30, 3.5],
            [25, 3],
            [15, 2.5],
        ],
        [
            [55, 3.5],
            [25, 3],
            [20, 4],
        ],
    ],
    [
        [
            [55, 4.5],
            [65, 4],
        ],
        [
            [50, 4.5],
            [60, 4],
            [50, 4.5],
        ],
        [
            [50, 4.5],
            [65, 4.5],
            [55, 4.5],
            [55, 4],
        ],
    ],
];

test("every slingshot arrangement has complete winning replays with sampled aiming tolerance and natural waits", () => {
    for (const [phase, arrangements] of WITNESSES.entries()) {
        for (const [seed, shots] of arrangements.entries()) {
            for (const wait of [0, 60, 180])
                for (const angleOffset of [-1, 0, 1])
                    for (const pullOffset of [-0.05, 0, 0.05]) {
                        const s = openSlingConfiguration(slingChallenge(seed, phase));
                        for (const [degrees, pull] of shots) {
                            assert.notEqual(degrees, undefined);
                            assert.notEqual(pull, undefined);
                            if (degrees === undefined || pull === undefined)
                                throw new Error("Missing witness");
                            if (s.won) break;
                            for (let tick = 0; tick < wait; tick++) step(s, emptyPad());
                            fire(s, degrees + angleOffset, Math.min(4.5, pull + pullOffset));
                        }
                        assert.ok(
                            s.won,
                            `phase ${phase}, seed ${seed}, wait ${wait}, angle ${angleOffset}, pull ${pullOffset}`,
                        );
                        assert.equal(s.starsDown, 3);
                        assert.ok(s.shots <= shots.length);
                    }
        }
    }
});

test("all slingshot witnesses can also be entered through the shared keyboard controls", () => {
    for (const [phase, arrangements] of WITNESSES.entries())
        for (const [seed, shots] of arrangements.entries()) {
            const s = openSlingConfiguration(slingChallenge(seed, phase));
            for (const [degrees, pull] of shots) {
                if (degrees === undefined || pull === undefined) throw new Error("Missing witness");
                if (s.won) break;
                while (s.keyAim.deg !== degrees)
                    step(s, { ...emptyPad(), pressed: [s.keyAim.deg < degrees ? "up" : "down"] });
                while (s.keyAim.pull !== pull)
                    step(s, { ...emptyPad(), pressed: [s.keyAim.pull < pull ? "right" : "left"] });
                step(s, { ...emptyPad(), tapped: true });
                let ticks = 0;
                while (!s.won && s.phase !== "aim" && ticks++ < 600) step(s, emptyPad());
            }
            assert.ok(s.won, `keyboard phase ${phase}, seed ${seed}`);
        }
});
