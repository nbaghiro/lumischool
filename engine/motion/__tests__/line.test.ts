import assert from "node:assert/strict";
import { test } from "node:test";
import { line, stepLine, taut } from "../line";

const run = (
    l: ReturnType<typeof line>,
    a: { x: number; y: number },
    b: { x: number; y: number },
) => {
    for (let i = 0; i < 240; i++) stepLine(l, a, b, { g: 20, dt: 1 / 60 });
};

test("a slack line hangs below its ends and never stretches past its length", () => {
    const a = { x: 0, y: 0 },
        b = { x: 6, y: 0 },
        l = line(a, b, 10);
    run(l, a, b);
    const mid = l.pts[Math.floor(l.pts.length / 2)];
    assert.ok(mid && mid.y > 2, `the middle sags to ${mid?.y}`);
    let along = 0;
    for (let i = 0; i + 1 < l.pts.length; i++) {
        const p = l.pts[i],
            q = l.pts[i + 1];
        if (p && q) along += Math.hypot(q.x - p.x, q.y - p.y);
    }
    assert.ok(along <= 10.05, `the line is ${along} long`);
    assert.ok(taut(l) > 0 && taut(l) < 0.4, `a sagging line is slack: ${taut(l)}`);
});

test("pulled as far apart as it is long, a line is taut and lies straight", () => {
    const a = { x: 0, y: 0 },
        b = { x: 8, y: 0 },
        l = line(a, b, 8);
    run(l, a, b);
    assert.ok(Math.abs(taut(l) - 1) < 1e-9);
    // it sags a little under its own weight, as a fishing line does, never more than an eighth of its length
    for (const p of l.pts) assert.ok(Math.abs(p.y) < 1, `a taut line barely sags: ${p.y}`);
    assert.ok(
        taut(line(a, { x: 12, y: 0 }, 8)) > 1,
        "pulled further than its length it is over-taut",
    );
});

test("the same steps give the same line", () => {
    const one = line({ x: 0, y: 0 }, { x: 5, y: 3 }, 9),
        two = line({ x: 0, y: 0 }, { x: 5, y: 3 }, 9);
    run(one, { x: 0, y: 0 }, { x: 5, y: 3 });
    run(two, { x: 0, y: 0 }, { x: 5, y: 3 });
    assert.deepEqual(one, two);
});
