import { test } from "node:test";
import assert from "node:assert/strict";
import {
    actionChallenge,
    isActionConfiguration,
    openActionConfiguration,
    type ActionKind,
} from "../action-challenges";
import { emptyPad, spent } from "../../../engine/motion/pad";
import * as road from "../road";
import * as row from "../row";
import * as plane from "../plane";
import { glide, drive } from "../../../engine/motion/stroke";

const families: [ActionKind, number][] = [
    ["road", 2],
    ["row", 6],
    ["plane", 4],
];
test("every action phase has three exact serializable, allowlisted configurations", () => {
    for (const [kind, phases] of families)
        for (let phase = 0; phase < phases; phase++) {
            const variants = new Set<string>();
            for (let seed = 0; seed < 3; seed++) {
                const config = actionChallenge(seed, kind, phase),
                    encoded = JSON.stringify(config);
                variants.add(encoded);
                const restored: unknown = JSON.parse(encoded);
                assert.ok(isActionConfiguration(restored));
                assert.deepEqual(
                    openActionConfiguration(restored),
                    openActionConfiguration(config),
                );
                assert.equal(
                    isActionConfiguration({
                        ...config,
                        level: { ...config.level, title: "Changed" },
                    }),
                    false,
                );
            }
            assert.equal(variants.size, 3);
        }
});

test("all six road targets can be reached by acceleration, braking and lane controls", () => {
    for (let phase = 0; phase < 2; phase++)
        for (let seed = 0; seed < 3; seed++) {
            const config = actionChallenge(seed, "road", phase);
            assert.equal(config.kind, "road");
            if (config.kind !== "road") continue;
            const s = road.startRoadLevel(config.level, phase),
                pad = emptyPad();
            const goal = road.placeOf(s.L, s.L.target);
            for (let n = 0; n < 60 * 60 && !s.won; n++) {
                pad.go = s.x + 0.85 + (s.v * s.v) / 32 < goal - 0.1;
                pad.brake = !pad.go;
                const ahead = s.boxes.find(
                    (b) => !b.hit && b.x > s.x && b.x - s.x < 7 && Math.abs(b.y - s.y) < 1,
                );
                if (ahead) pad.pressed.push(s.lane === 2 ? "up" : "down");
                road.step(s, pad);
                spent(pad);
            }
            assert.ok(s.won, `${phase}/${seed}: ${s.x}`);
        }
});

function arrival(s: row.RowState, speed: number): number {
    let x = s.x,
        v = speed;
    for (let t = 0; t < 60; t += 0.05) {
        const g = glide(v, 0.05, row.ROW.water.value, s.L.current);
        if (x < s.L.target && x + g.moved >= s.L.target) return g.v - s.L.current;
        if (g.v - s.L.current < 0.02) return 0;
        x += g.moved;
        v = g.v;
    }
    return 0;
}
function stroke(s: row.RowState, length: number, gap: number) {
    const pad = emptyPad();
    if (length > 0) {
        pad.go = true;
        pad.tapped = true;
    } else if (length < 0) pad.holding.push("left");
    for (let i = 0; i < Math.round(Math.abs(length) * row.ROW.hold.value * 60) && !s.won; i++) {
        row.step(s, pad);
        spent(pad);
    }
    for (let i = 0; i < Math.max(1, Math.round(gap * 60)) && !s.won; i++) row.step(s, emptyPad());
}
test("all eighteen rowing distances have full normal-input stroke witnesses", () => {
    for (let phase = 0; phase < 6; phase++)
        for (let seed = 0; seed < 3; seed++) {
            const config = actionChallenge(seed, "row", phase);
            if (config.kind !== "row") continue;
            const s = row.startRowLevel(config.level, phase),
                gentle = row.ROW.gentle.value,
                r = row.rhythmOf();
            for (let n = 0; n < 100 && !s.won; n++) {
                const now = arrival(s, s.v);
                if (now > 0 && now <= gentle) {
                    stroke(s, 0, 1);
                    continue;
                }
                const soft = Array.from({ length: 20 }, (_, i) => (i + 1) / 20).find((l) => {
                    const a = arrival(s, drive(s.v, l, "in time", r));
                    return a > 0.15 && a <= gentle * 0.8;
                });
                stroke(s, soft ?? (now > gentle ? -0.5 : 1), 0.8);
            }
            for (let n = 0; n < 60 * 30 && !s.won; n++) row.step(s, emptyPad());
            assert.ok(s.won, `${phase}/${seed}: ${s.x} towards ${s.L.target}`);
        }
});

test("all twelve plane courses win using only climb and dive controls, without teleporting", () => {
    for (let phase = 0; phase < 4; phase++)
        for (let seed = 0; seed < 3; seed++) {
            const config = actionChallenge(seed, "plane", phase);
            if (config.kind !== "plane") continue;
            const s = plane.startPlaneLevel(
                    {
                        ...config.level,
                        words: (plane.PLANE_LEVELS[phase] ?? plane.PLANE_LEVELS[0]).words,
                    },
                    phase,
                ),
                pad = emptyPad();
            for (let n = 0; n < 60 * 60 && !s.won; n++) {
                const k = s.L.gates.findIndex(
                    (_, i) =>
                        plane.COURSE.pad +
                            plane.COURSE.first +
                            i * plane.COURSE.every +
                            plane.COURSE.hoop >
                        s.plane.x,
                );
                const gate = s.L.gates[k < 0 ? 0 : k];
                assert.ok(gate);
                const target = plane.heightOf(s.L, gate.target);
                pad.go = s.plane.y + s.plane.vy * 0.25 > target;
                pad.brake = !pad.go && s.plane.y < target - 1;
                plane.step(s, pad);
                spent(pad);
            }
            assert.ok(s.won, `${phase}/${seed}: ${s.done.join(",")}`);
            assert.ok(s.done.every(Boolean));
        }
});
