// Flying the paper plane over the journal's map (plane.ts), held to the game rules: no clock, no
// score, nothing to fail, the same flight for the same hands, and never past what the child's map
// has drawn.
import assert from "node:assert/strict";
import { test } from "node:test";
import { down, emptyPad, spent, up, type Dir, type Pad } from "../pad";
import {
    approach,
    landStep,
    FLY,
    fieldAt,
    step,
    takeOff,
    type FlightEvent,
    type Plane,
    type Sky,
} from "../plane";

const R = FLY.rate,
    DT = 1 / R;
const open = (p: { x: number; y: number }) => Math.hypot(p.x, p.y) < 9000;
const sky = (o: Partial<Sky> = {}): Sky => ({
    bounds: { x: -10000, y: -10000, w: 20000, h: 20000 },
    open,
    fields: [
        { node: 0, at: { x: 0, y: 0 }, angle: 0 },
        { node: 1, at: { x: 6000, y: 0 }, angle: 0 },
    ],
    sights: [{ art: "whale", at: { x: 3000, y: 300 }, name: "A whale" }],
    stars: [
        { x: 1500, y: 0 },
        { x: 2500, y: 0 },
    ],
    wind: () => ({ x: 60, y: 0 }),
    ...o,
});

/** Fly for some seconds, holding and pressing as `hands` says at each step, and gather what happened. */
function fly(
    p: Plane,
    s: Sky,
    seconds: number,
    hands: (t: number, pad: Pad) => void = () => {},
): FlightEvent[] {
    const pad = emptyPad(),
        out: FlightEvent[] = [];
    for (let k = 0; k < seconds * R; k++) {
        hands(k * DT, pad);
        out.push(...step(p, s, pad, DT));
        spent(pad);
    }
    return out;
}
const press = (pad: Pad, d: Dir) => {
    down(pad, d);
    up(pad, d);
};

test("the plane climbs with speed and comes down only on a field: anywhere else it skims low and flies on", () => {
    const s = sky(),
        p = takeOff({ x: 0, y: 0 }, 0);
    fly(p, s, 6);
    assert.ok(p.height > 0.3 && p.phase === "air", "it did not lift off on slow");
    // the lever right down over open country: it sinks to a skim and never touches down
    const q = takeOff({ x: 0, y: 0 }, Math.PI / 2);
    fly(q, s, 3);
    const ev = fly(q, s, 20, (t, pad) => {
        if (t === 0) press(pad, "down");
    });
    assert.ok(!ev.some((e) => e.is === "touch" || e.is === "landed"), "it came down off a field");
    assert.ok(
        Math.abs(q.height - FLY.skim) < 0.02 && q.phase === "air",
        `it is at ${q.height.toFixed(2)}, not skimming`,
    );
});

test("with the lever down over a field it lands there, and says whether it came in against the wind", () => {
    const s = sky({ wind: () => ({ x: 60, y: 0 }) });
    // flying west, into a wind from the west, towards the second field
    const p = takeOff({ x: 7400, y: 0 }, Math.PI);
    const ev = fly(p, s, 12, (t, pad) => {
        if (t === 0) press(pad, "down");
    });
    const touch = ev.find((e) => e.is === "touch"),
        landed = ev.find((e) => e.is === "landed");
    assert.ok(touch && touch.is === "touch" && touch.into, "it did not come down into the wind");
    assert.ok(
        landed && landed.is === "landed" && landed.node === 1,
        "it did not land at the field it came down on",
    );
    assert.equal(p.phase, "down");
    assert.ok(
        fieldAt(s, p) === 1 || Math.hypot(p.x - 6000, p.y) < 1200,
        "it rolled off far past the field",
    );
});

test("it cannot fly out over the blank paper: near the edge of what the map has drawn it turns back", () => {
    const s = sky(),
        p = takeOff({ x: 0, y: 0 }, 0);
    const ev = fly(p, s, 90, (t, pad) => {
        if (t === 0) {
            press(pad, "up");
            press(pad, "up");
        }
    });
    const turned = ev.filter((e) => e.is === "turned").length;
    assert.ok(turned > 0, "it was never turned back");
    assert.ok(
        Math.hypot(p.x, p.y) < 9000 + FLY.probe,
        `it got to ${Math.round(p.x)},${Math.round(p.y)}, out over the paper`,
    );
});

test("steering turns it, the wind carries it more the higher it flies, and nothing is counted", () => {
    const s = sky({ fields: [] });
    const a = takeOff({ x: 0, y: 0 }, 0);
    fly(a, s, 0.8, (_t, pad) => {
        if (!pad.holding.includes("left")) down(pad, "left");
    });
    assert.ok(a.heading < -1, "holding left did not turn it left");
    // two planes on the same heading, one low and one high: the high one is carried further sideways
    const wind = sky({ fields: [], wind: () => ({ x: 0, y: 80 }) }),
        low = takeOff({ x: 0, y: 0 }, 0),
        high = takeOff({ x: 0, y: 0 }, 0);
    fly(high, wind, 1, (t, pad) => {
        if (t === 0) {
            press(pad, "up");
            press(pad, "up");
        }
    });
    fly(low, wind, 1);
    fly(low, wind, 4, (t, pad) => {
        if (t === 0) press(pad, "down");
    });
    fly(high, wind, 4);
    assert.ok(high.y > low.y, "the wind did not carry the higher plane further");
    // what a flight keeps is where the plane is and what it has seen this flight; there is no score in it
    assert.deepEqual(
        Object.keys(a).filter((k) => /score|points|lives|timer|clock/i.test(k)),
        [],
    );
});

test("it catches the stars along the way and spots a creature when it flies low over it", () => {
    const s = sky(),
        p = takeOff({ x: 0, y: 0 }, 0);
    const ev = fly(p, s, 8);
    assert.deepEqual(
        ev.filter((e) => e.is === "caught").map((e) => (e.is === "caught" ? e.star : -1)),
        [0, 1],
    );
    const low = takeOff({ x: 1800, y: 300 }, 0);
    const seen = fly(low, s, 4, (t, pad) => {
        if (t === 0) press(pad, "down");
    });
    assert.ok(
        seen.some((e) => e.is === "spotted" && e.sight === 0),
        "flying low past the whale did not spot it",
    );
    const high = takeOff({ x: 1800, y: 300 }, 0);
    high.height = 1;
    high.notch = 3;
    const none = fly(high, s, 2);
    assert.ok(!none.some((e) => e.is === "spotted"), "the whale was spotted from high up");
});

test("the same hands give the same flight", () => {
    const hands = (t: number, pad: Pad) => {
        if (t === 0) press(pad, "up");
        if (t > 1 && t < 2.5 && !pad.holding.includes("right")) down(pad, "right");
        if (t >= 2.5 && pad.holding.includes("right")) up(pad, "right");
        if (Math.abs(t - 4) < DT / 2) press(pad, "down");
    };
    const a = takeOff({ x: 0, y: 0 }, 0),
        b = takeOff({ x: 0, y: 0 }, 0);
    const ea = fly(a, sky(), 10, hands),
        eb = fly(b, sky(), 10, hands);
    assert.deepEqual(ea, eb);
    assert.deepEqual([a.x, a.y, a.heading, a.height], [b.x, b.y, b.heading, b.height]);
});

test("a requested landing preserves the initial pose and descends to a stationary touchdown", () => {
    const p = takeOff({ x: 150, y: -200 }, 0);
    Object.assign(p, { notch: 3, height: 1, speed: 900, vx: 900, vy: 0 });
    const field = { node: 7, at: { x: 1600, y: 200 }, angle: 0 };
    const landing = approach(p, field);
    landStep(p, landing, 0);
    assert.equal(p.x, 150);
    assert.equal(p.y, -200);
    assert.equal(p.height, 1);
    assert.equal(p.speed, 900);
    let height = p.height;
    let sawLand = false,
        sawRoll = false;
    for (let t = 0; t < landing.duration + DT; t += DT) {
        landStep(p, landing, DT);
        assert.ok(p.height <= height + 1e-9);
        height = p.height;
        sawLand ||= p.notch === 0 && p.phase === "air";
        sawRoll ||= p.phase === "rolling";
    }
    assert.ok(sawLand && sawRoll);
    assert.equal(p.phase, "down");
    assert.equal(p.speed, 0);
    assert.equal(p.height, 0);
    assert.equal(p.landed, 7);
    assert.deepEqual({ x: p.x, y: p.y }, field.at);
});
