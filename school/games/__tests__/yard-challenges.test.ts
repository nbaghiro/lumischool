import { test } from "node:test";
import assert from "node:assert/strict";
import * as Y from "../yard";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";
import { explore, nudge, prove } from "../prove";
import { yardConfigurations, yardRound, openYardConfiguration } from "../yard-challenges";

function tick(s: Y.YardState, p: Pad) {
    Y.step(s, p);
    spent(p);
}
function settle(s: Y.YardState, p: Pad) {
    for (let i = 0; i < 600 && Y.moving(s); i++) tick(s, p);
    assert.equal(Y.moving(s), false);
}
function vehicle(s: Y.YardState, id: string) {
    const v = s.line.vehicles.find((v) => v.id === id);
    assert.ok(v);
    return v;
}
function drag(s: Y.YardState, p: Pad, to: number) {
    const sx = vehicle(s, "loco").x,
        sy = Y.RAIL_Y - 1.5,
        dx = to - sx,
        sign = Math.sign(dx);
    if (Math.abs(dx) < 0.02) return;
    p.touch = { x: sx, y: sy };
    tick(s, p);
    for (let moved = 0; Math.abs(moved) < Math.abs(dx) + 0.6;) {
        moved += sign * Math.min(Math.abs(dx) + 0.6 - Math.abs(moved), 2 / 60);
        p.touch = { x: sx + moved, y: sy };
        tick(s, p);
    }
    p.lifted = p.touch;
    p.touch = null;
    tick(s, p);
    settle(s, p);
}
function couple(s: Y.YardState, p: Pad) {
    const first = Y.carriages(s)[0];
    if (first) drag(s, p, first.x - Y.LEN + 1);
}
function align(s: Y.YardState, p: Pad, id: string, x: number) {
    couple(s, p);
    drag(s, p, vehicle(s, "loco").x + x - vehicle(s, id).x);
}
function press(s: Y.YardState, p: Pad) {
    p.tapped = true;
    tick(s, p);
    settle(s, p);
}

test("every generated train is proved and its solution is achievable through actual drag and lift input", () => {
    for (let phase = 0; phase < 6; phase++)
        for (const config of yardConfigurations(phase)) {
            const s = openYardConfiguration(config, phase),
                p = emptyPad(),
                round = yardRound(config),
                ex = explore(round),
                proof = prove(round, ex);
            assert.ok(proof.ok, JSON.stringify(proof.problems));
            assert.equal(ex.capped, false);
            let pos = round.start;
            for (let k = 0; k < 30 && !s.won; k++) {
                const index = nudge(ex, pos),
                    move = pos.moves[index ?? -1];
                assert.ok(move);
                const end = pos.key.split("|")[2],
                    cs = Y.carriages(s);
                if (move.chip.text === "round") {
                    const car = end === "right" ? cs[0] : cs.at(-1);
                    assert.ok(car);
                    align(s, p, car.id, end === "right" ? s.g.xJ + Y.LEN * 2 : s.g.xJ - Y.LEN * 2);
                }
                if (move.chip.text === "in") {
                    const car = end === "right" ? cs.at(-1) : cs[0];
                    assert.ok(car);
                    align(s, p, car.id, s.g.xJ);
                    press(s, p);
                }
                if (move.chip.text === "out") {
                    if (cs.length) {
                        const car = end === "right" ? cs.at(-1) : cs[0];
                        assert.ok(car);
                        align(
                            s,
                            p,
                            car.id,
                            s.g.xJ + (end === "right" ? -Y.LEN - 0.6 : Y.LEN + 0.6),
                        );
                    }
                    if (end === "left") {
                        p.pressed = ["up"];
                        tick(s, p);
                        drag(s, p, s.g.xJ - Y.LEN * 2);
                    }
                    press(s, p);
                    couple(s, p);
                }
                pos = move.next();
                const actual = Y.positionOf(s);
                assert.equal(
                    `${actual.line.join("-")}|${actual.spur.join("-")}|${actual.end}`,
                    pos.key,
                    `phase${phase}: ${s.said}`,
                );
            }
            assert.ok(s.won, `phase${phase},train${config.train.join()}`);
        }
});
