// A brick breaker's physics: a ball at the top speed never passes through a block, whatever its way in;
// where the ball meets the tray sets how far it leans, the tray's speed turns it a little, and its
// speed is kept; no bounce leaves a ball running flat; a block stands while a chain of touching blocks
// reaches a fixed one, and a piece cut off falls; and the same start gives the same play.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    DT,
    LEAST,
    TILT,
    TOP,
    fallOf,
    keepSteep,
    offTray,
    stepBall,
    stepFall,
    unheld,
    type Ball,
    type Box,
    type Field,
} from "../breakout";

const FIELD: Field = { w: 22, h: 33, r: 0.45 };

test("a ball at the top speed never passes through a block one square thick, from any way in", () => {
    const block: Box = { id: "b", x: 6, y: 10, w: 10, h: 1 };
    for (let a = -1; a <= 1.001; a += 0.1) {
        const ball: Ball = {
            x: 11 - Math.tan(a) * 6.5,
            y: 17,
            vx: Math.sin(a) * TOP * 1.5,
            vy: -Math.cos(a) * TOP * 1.5,
            a: 0,
        };
        let hit = false;
        for (let i = 0; i < 240 && !hit; i++) {
            hit = stepBall(ball, FIELD, [block], null, DT).some((h) => h.kind === "block");
            // how far the ball's edge is inside the block: never more than a sliver of one sub-step
            const qx = Math.max(block.x, Math.min(block.x + block.w, ball.x)),
                qy = Math.max(block.y, Math.min(block.y + block.h, ball.y)),
                inside =
                    ball.x > block.x &&
                    ball.x < block.x + block.w &&
                    ball.y > block.y &&
                    ball.y < block.y + block.h;
            assert.ok(!inside, `the ball's middle went into the block at ${a.toFixed(1)}`);
            assert.ok(
                Math.hypot(ball.x - qx, ball.y - qy) > FIELD.r - TOP * DT,
                `too deep at ${a.toFixed(1)}`,
            );
        }
        assert.ok(hit, `the ball at ${a.toFixed(1)} never met the block`);
        assert.ok(ball.vy > 0 || Math.sign(ball.vx) !== Math.sign(Math.sin(a)), "it bounced off");
        assert.ok(Math.hypot(ball.vx, ball.vy) <= TOP + 1e-9, "and no faster than the top speed");
    }
});

test("where the ball meets the tray sets its lean, the tray's speed turns it a little, and its speed is kept", () => {
    const up = offTray(0, 12, 0);
    assert.ok(Math.abs(up.vx) < 1e-9 && up.vy < 0, "the middle sends it straight up");
    const right = offTray(1, 12, 0),
        left = offTray(-1, 12, 0);
    assert.ok(
        Math.abs(Math.atan2(right.vx, -right.vy) - TILT) < 1e-9,
        "the right end leans it right",
    );
    assert.ok(Math.abs(Math.atan2(left.vx, -left.vy) + TILT) < 1e-9, "the left end leans it left");
    const moving = offTray(0, 12, 10);
    assert.ok(
        moving.vx > 0 && moving.vx < 12 * Math.sin(0.2),
        "a tray moving right turns it a little",
    );
    for (const v of [up, right, left, moving])
        assert.ok(Math.abs(Math.hypot(v.vx, v.vy) - 12) < 1e-9);
    // and it is the tray that does it, through a step
    const tray = { x: 10, y: 28, half: 3, v: 0 },
        ball: Ball = { x: 12.4, y: 26, vx: 0, vy: 12, a: 0 };
    let caught = false;
    for (let i = 0; i < 120 && !caught; i++)
        caught = stepBall(ball, FIELD, [], tray, DT).some((h) => h.kind === "tray");
    assert.ok(caught);
    assert.ok(ball.vy < 0 && ball.vx > 0, "met right of the middle, it goes up and to the right");
});

test("no bounce leaves a ball running flat", () => {
    const flat: Ball = { x: 5, y: 5, vx: 12, vy: 0.3, a: 0 };
    keepSteep(flat);
    assert.ok(Math.abs(flat.vy) >= Math.sin(LEAST) * 12 - 1e-9);
    assert.ok(Math.abs(Math.hypot(flat.vx, flat.vy) - Math.hypot(12, 0.3)) < 1e-9);
    // a ball along a wall's corner leaves at a slant too
    const corner: Box = { id: "c", x: 10, y: 10, w: 2, h: 1 },
        ball: Ball = { x: 8, y: 9.7, vx: 14, vy: 0.2, a: 0 };
    for (let i = 0; i < 240; i++) stepBall(ball, FIELD, [corner], null, DT);
    assert.ok(Math.abs(ball.vy) >= Math.sin(LEAST) * Math.hypot(ball.vx, ball.vy) - 1e-9);
});

test("a block stands while touching blocks reach a fixed one, and a piece cut off falls", () => {
    const base: Box = { id: "base", x: 8, y: 20, w: 6, h: 2, fixed: true },
        wall: Box[] = [
            { id: "l", x: 8, y: 19, w: 2, h: 1 },
            { id: "m", x: 10, y: 19, w: 2, h: 1 },
            { id: "r", x: 12, y: 19, w: 2, h: 1 },
            { id: "top", x: 8, y: 18, w: 6, h: 1 },
            { id: "eave", x: 14, y: 18, w: 2, h: 1 },
        ];
    assert.deepEqual(unheld([base, ...wall]), [], "everything stands to begin with");
    // a hole in the wall: the rest still reaches the base round it
    assert.deepEqual(unheld([base, ...wall.filter((b) => b.id !== "m")]), []);
    // the eave hangs off the top: cut the top and it falls, and so does nothing else
    assert.deepEqual(
        unheld([base, ...wall.filter((b) => b.id !== "top")]).map((b) => b.id),
        ["eave"],
    );
    // a corner touch is not a hold
    assert.deepEqual(
        unheld([base, { id: "k", x: 14, y: 19, w: 1, h: 1 }]).map((b) => b.id),
        ["k"],
    );
    const fall = fallOf({ id: "eave", x: 14, y: 18, w: 2, h: 1 }, { x: 11, y: 18 }, 2);
    const y0 = fall.y;
    for (let i = 0; i < 240; i++) stepFall(fall, 30, DT);
    assert.ok(fall.y > y0 + 10, "it falls under gravity");
    assert.ok(fall.vx > 0, "away from where it was cut");
    assert.ok(fall.a > 1, "and turns as it goes");
});

test("the same start plays the same, step for step", () => {
    const blocks: Box[] = Array.from({ length: 33 }, (_, i) => ({
        id: `b${i}`,
        x: (i % 11) * 2,
        y: 6 + Math.floor(i / 11),
        w: 2,
        h: 1,
    }));
    const run = () => {
        const ball: Ball = { x: 9.3, y: 27, vx: 5.1, vy: -11.2, a: 0 },
            tray = { x: 11, y: 28, half: 3, v: 0 },
            seen: string[] = [];
        let standing = blocks;
        for (let i = 0; i < 240 * 20; i++) {
            tray.x = Math.max(3, Math.min(19, ball.x - (seen.length % 2 ? 1.2 : -1.2)));
            for (const h of stepBall(ball, FIELD, standing, tray, DT))
                if (h.kind === "block") {
                    seen.push(h.id);
                    standing = standing.filter((b) => b.id !== h.id);
                }
        }
        return { seen, ball };
    };
    const a = run(),
        b = run();
    assert.ok(a.seen.length > 5, "the ball broke blocks");
    assert.deepEqual(a, b);
});
