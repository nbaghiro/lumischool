import assert from "node:assert/strict";
import { test } from "node:test";
import {
    ahead,
    blockedAt,
    facing,
    heading,
    roamer,
    route,
    stepRoam,
    walkTo,
    type Gait,
    type Place,
} from "../roam";

const GAIT: Gait = { speed: 6, accel: 40, radius: 0.4 };
const DT = 1 / 60;
const OPEN: Place = { w: 20, h: 12, blocked: [] };

test("the held arrows point one of eight ways, and opposites cancel", () => {
    assert.deepEqual(heading(["right"]), { x: 1, y: 0 });
    const d = heading(["up", "left"]);
    assert.ok(d && Math.abs(d.x + Math.SQRT1_2) < 1e-9 && Math.abs(d.y + Math.SQRT1_2) < 1e-9);
    assert.equal(heading(["left", "right"]), null);
    assert.equal(heading([]), null);
});

test("it speeds up to a walk, faces the way it walks, and slows to a stand when let go", () => {
    const r = roamer(5, 6);
    stepRoam(r, { x: 1, y: 0 }, OPEN, GAIT, DT);
    assert.ok(r.vx > 0 && r.vx < GAIT.speed, "it does not jump to full speed");
    for (let i = 0; i < 30; i++) stepRoam(r, { x: 1, y: 0 }, OPEN, GAIT, DT);
    assert.equal(r.vx, GAIT.speed);
    assert.deepEqual(r.face, { x: 1, y: 0 });
    const at = r.x;
    let steps = 0;
    while (stepRoam(r, null, OPEN, GAIT, DT) === "walk") steps++;
    assert.ok(steps < 10, `it took ${steps} steps to stop`);
    assert.ok(r.x - at < 0.5, "it stops near where it was let go");
    assert.ok(r.stride > 0);
    assert.deepEqual(r.face, { x: 1, y: 0 }, "it still faces the way it walked");
});

test("it slides along a wall it walks into at a slant, and never into it or off the place", () => {
    const place: Place = { w: 20, h: 12, blocked: [{ x: 10, y: 0, w: 2, h: 12 }] };
    const r = roamer(8, 6);
    for (let i = 0; i < 120; i++)
        stepRoam(r, { x: Math.SQRT1_2, y: Math.SQRT1_2 }, place, GAIT, DT);
    assert.ok(r.x <= 10 - GAIT.radius + 1e-9, "it stays out of the wall");
    assert.ok(r.y > 10, "it slid down along it");
    assert.ok(!blockedAt(place, r, GAIT.radius));
});

test("sent to a point, it finds its way round what is in the way and stops on it", () => {
    const place: Place = { w: 20, h: 12, blocked: [{ x: 9, y: 0, w: 2, h: 9 }] };
    const r = roamer(3, 3);
    assert.ok(walkTo(r, place, { x: 16, y: 3 }, GAIT));
    let end = "";
    for (let i = 0; i < 60 * 10 && end !== "arrived"; i++) end = stepRoam(r, null, place, GAIT, DT);
    assert.equal(end, "arrived");
    assert.ok(Math.hypot(r.x - 16, r.y - 3) < 0.1, `it ended at ${r.x}, ${r.y}`);
});

test("a route goes round soft ground when that is not much further, and over it to a point on it", () => {
    const place: Place = { w: 20, h: 12, blocked: [], soft: [{ x: 8, y: 3, w: 4, h: 6 }] };
    const way = route(place, { x: 4, y: 6 }, { x: 16, y: 6 }, GAIT.radius);
    assert.ok(way);
    for (const p of way)
        assert.ok(!(p.x > 8 && p.x < 12 && p.y > 3 && p.y < 9), "it went over the soil");
    const onto = route(place, { x: 4, y: 6 }, { x: 10, y: 6 }, GAIT.radius);
    assert.deepEqual(onto?.[onto.length - 1], { x: 10, y: 6 });
});

test("a point inside something is reached at the nearest free place beside it", () => {
    const place: Place = { w: 20, h: 12, blocked: [{ x: 14, y: 4, w: 3, h: 3 }] };
    const way = route(place, { x: 3, y: 5 }, { x: 15.5, y: 5.5 }, GAIT.radius);
    const last = way?.[way.length - 1];
    assert.ok(last && !blockedAt(place, last, GAIT.radius));
    assert.ok(last && Math.hypot(last.x - 15.5, last.y - 5.5) < 2.5);
});

test("of the things within reach, the one it faces is the one it takes", () => {
    const r = roamer(10, 6, { x: 1, y: 0 });
    const left = { x: 8.6, y: 6, id: "left" },
        right = { x: 11.8, y: 6, id: "right" },
        far = { x: 18, y: 6, id: "far" };
    assert.equal(facing(r, [left, right, far], 3)?.id, "right");
    r.face = { x: -1, y: 0 };
    assert.equal(facing(r, [left, right, far], 3)?.id, "left");
    assert.equal(facing(r, [far], 3), null);
    assert.deepEqual(ahead(r, 2), { x: 8, y: 6 });
});

test("walking straight into the corner of something eases round it instead of stopping dead", () => {
    const place: Place = { w: 20, h: 12, blocked: [{ x: 8, y: 6.2, w: 3, h: 3 }] };
    const r = roamer(4, 5.9);
    for (let i = 0; i < 120; i++) stepRoam(r, { x: 1, y: 0 }, place, GAIT, DT);
    assert.ok(r.x > 12, `it stopped at ${r.x}`);
    assert.ok(!blockedAt(place, r, GAIT.radius));
});

test("on an island it never walks into the water, and a route keeps to the land round a bay", () => {
    // a C of land round a bay that opens to the right
    const land = [
        { x: 1, y: 1 },
        { x: 19, y: 1 },
        { x: 19, y: 4 },
        { x: 6, y: 4 },
        { x: 6, y: 8 },
        { x: 19, y: 8 },
        { x: 19, y: 11 },
        { x: 1, y: 11 },
    ];
    const place: Place = { w: 20, h: 12, blocked: [], land };
    assert.ok(blockedAt(place, { x: 12, y: 6 }, GAIT.radius), "the bay is water");
    assert.ok(!blockedAt(place, { x: 12, y: 2.5 }, GAIT.radius));
    const r = roamer(15, 2.5);
    for (let i = 0; i < 120; i++) stepRoam(r, { x: 0, y: 1 }, place, GAIT, DT);
    assert.ok(r.y < 4 - GAIT.radius + 0.01, `it walked into the bay at ${r.y}`);
    const way = route(place, r, { x: 15, y: 9.5 }, GAIT.radius);
    assert.ok(way);
    for (const p of way) assert.ok(!blockedAt(place, p, GAIT.radius), `${p.x}, ${p.y} is wet`);
    assert.ok(walkTo(r, place, { x: 15, y: 9.5 }, GAIT));
    let end = "";
    for (let i = 0; i < 60 * 10 && end !== "arrived"; i++) end = stepRoam(r, null, place, GAIT, DT);
    assert.ok(Math.hypot(r.x - 15, r.y - 9.5) < 0.1, `it ended at ${r.x}, ${r.y}`);
});
