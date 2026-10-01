import { test } from "node:test";
import assert from "node:assert/strict";
import {
    actionChallenge,
    isActionConfiguration,
    openActionConfiguration,
    type ActionKind,
} from "../action-challenges";
import { emptyPad, spent } from "../../../engine/motion/pad";
import { driveRound } from "./road-driver";
import * as road from "../road";
import * as row from "../row";
import * as plane from "../plane";

const families: [ActionKind, number][] = [
    ["road", road.ROAD_LEVELS.length],
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

test("every road round can be delivered by driving, braking, reversing and changing lane", () => {
    for (let phase = 0; phase < road.ROAD_LEVELS.length; phase++)
        for (let seed = 0; seed < 3; seed++) {
            const config = actionChallenge(seed, "road", phase);
            if (config.kind !== "road") throw new Error("Not a road round");
            const s = road.startRoadLevel(config.level, phase);
            driveRound(s);
            assert.ok(s.won, `${phase}/${seed}: ${s.said}`);
        }
});

test("every river layout opens as another stretch of its level, with the same count and the same number to stop beside", () => {
    for (let phase = 0; phase < row.RIVER_LEVELS.length; phase++) {
        const base = row.RIVER_LEVELS[phase];
        const seen = new Set<string>();
        for (let seed = 0; seed < 3; seed++) {
            const config = actionChallenge(seed, "row", phase);
            assert.ok(isActionConfiguration(config));
            if (config.kind !== "row" || !base) continue;
            assert.deepEqual(config.level.count, base.count);
            assert.equal(config.level.dock, base.dock);
            seen.add(JSON.stringify([config.level.sides, config.level.bends]));
            const s = openActionConfiguration(config);
            assert.ok("boat" in s && s.next === 0);
        }
        assert.equal(seen.size, 3, `phase ${phase} has three different stretches`);
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
