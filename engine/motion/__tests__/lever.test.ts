import assert from "node:assert/strict";
import { test } from "node:test";
import { knock, lean, onPlank, swingTo, turning, type Tilt } from "../lever";

const k = { per: 0.06, most: 0.3 };

test("the turning effect is each mass times its step, the right less the left", () => {
    assert.equal(turning([]), 0);
    assert.equal(
        turning([
            { mass: 6, at: -2 },
            { mass: 2, at: 6 },
        ]),
        0,
    );
    assert.equal(
        turning([
            { mass: 6, at: -2 },
            { mass: 3, at: 5 },
        ]),
        3,
    );
    assert.equal(
        turning([
            { mass: 4, at: -3 },
            { mass: 2, at: 2 },
            { mass: 3, at: 1 },
        ]),
        -5,
    );
});

test("a plank is level only when the turning effects are equal, and leans further the further out they are", () => {
    assert.equal(lean(0, k), 0);
    assert.ok(
        lean(1, k) > 0 && lean(-1, k) < 0,
        "a difference of one already shows, towards the heavier side",
    );
    for (let d = 1; d < 40; d++) assert.ok(lean(d + 1, k) >= lean(d, k), `${d}`);
    assert.equal(lean(1000, k), k.most);
    assert.equal(lean(-1000, k), -k.most);
});

test("a knocked plank swings past where it rests and settles there", () => {
    let t: Tilt = knock({ angle: 0, spin: 0 }, 5, 3, 4, 0.02);
    const spring = { stiffness: 40, damping: 5, most: 0.3 };
    let crossed = false;
    for (let i = 0; i < 600; i++) {
        t = swingTo(t, 0.1, 1 / 60, spring);
        if (t.angle > 0.1 + 0.01) crossed = true;
        assert.ok(Math.abs(t.angle) <= spring.most + 1e-12);
    }
    assert.ok(crossed, "it overshoots");
    assert.ok(
        Math.abs(t.angle - 0.1) < 1e-4 && Math.abs(t.spin) < 1e-3,
        "and comes to rest where it leans",
    );
});

test("a point on the plank turns with it: the right end goes down when the angle is positive", () => {
    const pivot = { x: 10, y: 5 };
    assert.deepEqual(onPlank(pivot, 0, 3, 1), { x: 13, y: 6 });
    const end = onPlank(pivot, 0.2, 4);
    assert.ok(end.y > pivot.y && end.x < 14);
    const hook = onPlank(pivot, 0.2, 4, 1);
    assert.ok(Math.abs(Math.hypot(hook.x - pivot.x, hook.y - pivot.y) - Math.hypot(4, 1)) < 1e-9);
});
