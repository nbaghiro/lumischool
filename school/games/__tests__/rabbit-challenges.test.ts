import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyPad, spent } from "../../../engine/motion/pad";
import { rabbitConfigurations, openRabbitConfiguration } from "../rabbit-challenges";
import { HOP_LEVELS, HOP, hopsTo, keyStepOf, step } from "../rabbit";

test("every generated rabbit target has recoverable stones and wins through keyboard and pointer input", () => {
    for (let phase = 0; phase < HOP_LEVELS.length; phase++) {
        const pool = rabbitConfigurations(phase);
        assert.ok(pool.length >= 2, `phase ${phase}: ${pool.length}`);
        for (const L of pool)
            for (const input of ["keyboard", "pointer"]) {
                const s = openRabbitConfiguration(L, phase);
                const pad = emptyPad();
                for (let hop = 0; hop < 20 && !s.won; hop++) {
                    const distances = hopsTo(L, (i) => !s.sunk[i]);
                    const from = L.stones[s.stone] ?? 0;
                    const next = L.stones.find(
                        (n, j) =>
                            !s.sunk[j] &&
                            Math.abs(n - from) <= L.most &&
                            distances[j] === (distances[s.stone] ?? 0) - 1,
                    );
                    assert.notEqual(next, undefined);
                    const delta = (next ?? from) - from;
                    if (input === "keyboard") {
                        const presses = Math.round(Math.abs(delta) / keyStepOf(L));
                        for (let p = 0; p < presses; p++) {
                            pad.pressed = [delta < 0 ? "left" : "right"];
                            step(s, pad);
                            spent(pad);
                        }
                        pad.tapped = true;
                        step(s, pad);
                        spent(pad);
                    } else {
                        const grab = { x: s.at.x, y: s.at.y - 1.2 };
                        pad.touch = grab;
                        step(s, pad);
                        spent(pad);
                        pad.touch = { x: grab.x - (delta / L.most) * HOP.pull.value, y: grab.y };
                        step(s, pad);
                        spent(pad);
                        pad.lifted = pad.touch;
                        pad.touch = null;
                        step(s, pad);
                        spent(pad);
                    }
                    for (let tick = 0; tick < 1800 && s.phase !== "sit" && !s.won; tick++) {
                        step(s, pad);
                        spent(pad);
                    }
                }
                assert.ok(s.won, `phase ${phase}, target ${L.target}, input ${input}`);
                assert.equal(s.dips, 0);
            }
    }
});
