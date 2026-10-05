import { test } from "node:test";
import assert from "node:assert/strict";
import {
    GOLF_LEVELS,
    clockOf,
    gateShut,
    golfCourse,
    golfGame,
    golfWorld,
    moverAt,
    startGolf,
    type GolfCourse,
    type GolfState,
} from "../golf";
import { golfChallenge, golfPlan, isGolfConfiguration, playGolf } from "../golf-challenges";
import { emptyPad, spent, type Pad } from "../../../engine/motion/pad";

function settle(s: GolfState, pad = emptyPad()): void {
    for (let i = 0; i < 1800 && s.moving; i++) {
        golfGame.step(s, pad);
        spent(pad);
    }
    assert.equal(s.moving, false, "every launched ball returns to rest");
}
function release(s: GolfState, angle: number, power: number): void {
    const pad = emptyPad();
    pad.released = { x: -Math.cos(angle) * power, y: -Math.sin(angle) * power };
    golfGame.step(s, pad);
    spent(pad);
    settle(s, pad);
}
function toward(s: GolfState, point: { x: number; y: number }): void {
    const dx = point.x - s.ball.x,
        dy = point.y - s.ball.y;
    release(s, Math.atan2(dy, dx), Math.sqrt(Math.hypot(dx, dy)));
}

test("all nine garden courses have complete pointer-input win witnesses", () => {
    for (let phase = 0; phase < 3; phase++)
        for (let variant = 0; variant < 3; variant++) {
            const s = startGolf(golfCourse(phase, variant));
            const waypoints =
                phase === 1
                    ? [
                          { x: 14, y: 6 },
                          { x: 20, y: 6 },
                          { x: 20, y: 15 },
                          { x: 27, y: 15 },
                          s.course.cup,
                      ]
                    : [s.course.cup];
            for (const point of waypoints)
                for (let retry = 0; retry < 4 && !s.ball.sunk; retry++) {
                    if (Math.hypot(point.x - s.ball.x, point.y - s.ball.y) < 0.1) break;
                    toward(s, point);
                }
            assert.ok(golfGame.won(s), `${phase}/${variant} remains at ${s.ball.x}, ${s.ball.y}`);
            assert.equal(s.shots, phase === 0 ? 1 : phase === 1 ? 5 : 3);
        }
});
test("a real bank shot rebounds off the boundary and finishes gently in the cup", () => {
    const s = startGolf(golfCourse(0, 0)),
        pad = emptyPad();
    pad.released = { x: -Math.cos(0.93) * 5.2, y: -Math.sin(0.93) * 5.2 };
    golfGame.step(s, pad);
    spent(pad);
    let bounced = false;
    for (let i = 0; i < 1800 && s.moving; i++) {
        bounced ||= s.ball.vy < 0;
        golfGame.step(s, pad);
    }
    assert.ok(bounced);
    assert.ok(s.ball.sunk);
    assert.equal(s.shots, 1);
});
test("a keyboard putt wins the first course and held turn controls cover all directions", () => {
    const s = startGolf(golfCourse(0)),
        pad = emptyPad();
    pad.tapped = true;
    golfGame.step(s, pad);
    spent(pad);
    settle(s, pad);
    assert.ok(s.ball.sunk);
    const turning = startGolf(golfCourse(0)),
        keys = emptyPad();
    keys.holding = ["right"];
    for (let i = 0; i < 252; i++) golfGame.step(turning, keys);
    assert.ok(turning.angle > 2 * Math.PI);
    assert.equal(turning.shots, 0);
    keys.holding = ["left"];
    for (let i = 0; i < 504; i++) golfGame.step(turning, keys);
    assert.ok(turning.angle < -2 * Math.PI);
    assert.equal(turning.shots, 0);
});
test("pointer pulls launch in all four directions with the familiar pull-back mapping", () => {
    for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ]) {
        assert.ok(dx !== undefined && dy !== undefined);
        const s = startGolf(golfCourse(0)),
            pad = emptyPad();
        pad.released = { x: -dx, y: -dy };
        golfGame.step(s, pad);
        assert.ok(s.ball.vx * dx + s.ball.vy * dy > 0);
        assert.equal(s.shots, 1);
    }
});
test("a rolling ball ignores further releases; stopping makes the next putt immediately available", () => {
    const s = startGolf(golfCourse(2)),
        pad = emptyPad();
    pad.released = { x: -4, y: 0 };
    golfGame.step(s, pad);
    spent(pad);
    for (let i = 0; i < 20; i++) {
        pad.tapped = true;
        pad.released = { x: 0, y: -8 };
        golfGame.step(s, pad);
        spent(pad);
    }
    assert.equal(s.shots, 1);
    settle(s);
    assert.ok(!s.ball.sunk);
    assert.match(s.message, /next putt/i);
    assert.ok(golfGame.pullFrom?.(s));
    toward(s, s.course.cup);
    assert.equal(s.shots, 2);
});
test("reduced-motion settlement reaches the same rest position as normal fixed steps", () => {
    const normal = startGolf(golfCourse(2, 2)),
        reduced = startGolf(golfCourse(2, 2));
    const launch = (): Pad => ({ ...emptyPad(), released: { x: -4, y: 1 } });
    const a = launch(),
        b = launch();
    golfGame.step(normal, a);
    spent(a);
    for (let i = 0; i < golfGame.still.press(reduced); i++) {
        golfGame.step(reduced, b);
        spent(b);
    }
    settle(normal, a);
    for (let i = 0; i < 1800 && golfGame.still.settling?.(reduced); i++) golfGame.step(reduced, b);
    assert.deepEqual(reduced, normal);
});

const NEW = Array.from({ length: GOLF_LEVELS.length - 3 }, (_, i) => i + 3);

test("every new hole and each of its arrangements is sunk by the solver through the Pad within par", () => {
    for (const phase of NEW)
        for (let variant = 0; variant < 3; variant++) {
            const course = golfCourse(phase, variant);
            const plan = golfPlan(course);
            assert.ok(plan, `${GOLF_LEVELS[phase]?.title} ${variant} has no plan`);
            const end = playGolf(course, plan);
            assert.ok(end.ball.sunk, `${GOLF_LEVELS[phase]?.title} ${variant} replays to the cup`);
            assert.ok(course.par !== undefined && end.shots <= course.par);
            assert.deepEqual(playGolf(course, plan), end, "the same putts give the same hole");
            assert.ok(isGolfConfiguration(golfChallenge(variant, phase)));
        }
});

test("random putting almost never sinks a new hole within par and one", () => {
    let seed = 11;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (const phase of NEW) {
        let wins = 0;
        for (let tr = 0; tr < 20; tr++) {
            const course = golfCourse(phase, tr % 3),
                s = startGolf(course);
            for (let p = 0; p <= (course.par ?? 3) && !s.ball.sunk; p++)
                release(s, rnd() * Math.PI * 2, 0.8 + rnd() * 7.2);
            if (s.ball.sunk) wins++;
        }
        assert.ok(wins <= 2, `${GOLF_LEVELS[phase]?.title} won ${wins} of 20 at random`);
    }
});

test("the windmill's rail closes the door on a ball and opens it again in turn", () => {
    const course = golfCourse(4, 0),
        gate = course.gates?.[0];
    assert.ok(gate);
    const shutAt = Array.from({ length: 144 }, (_, t) => gateShut(gate, t));
    assert.ok(shutAt.includes(true) && shutAt.includes(false));
    // a putt straight at the door while it is shut comes back off the rail
    let t = 0;
    while (!gateShut(gate, t + 40)) t++;
    const s = startGolf(course),
        pad = emptyPad();
    for (let i = 0; i < t; i++) golfGame.step(s, pad);
    release(s, 0, 4.5);
    assert.ok(!s.ball.sunk);
    assert.ok(s.ball.x < gate.rect.x, "the ball stays on the tee's side of the door");
});

test("a ball rolled into the pipe comes out the far side going the same way", () => {
    const course = golfCourse(7, 1),
        s = startGolf(course),
        pipe = course.tunnels?.[0];
    assert.ok(pipe);
    const wall = course.walls[0];
    assert.ok(wall);
    release(s, 0, 3.6);
    assert.ok(s.ball.x > wall.x + 1, "past the wall, which it could not roll through");
    assert.ok(Math.abs(s.ball.y - pipe.to.y) < 0.5);
});

test("a ball in the pond comes back to where it was putted from, and the putt still counts", () => {
    const course = golfCourse(6, 0),
        s = startGolf(course),
        heard: string[] = [];
    const pad = emptyPad();
    pad.released = { x: -Math.cos(-0.9) * 4, y: -Math.sin(-0.9) * 4 };
    for (const h of golfGame.step(s, pad)) if ("cue" in h) heard.push(h.cue);
    spent(pad);
    for (let i = 0; i < 1800 && s.moving; i++)
        for (const h of golfGame.step(s, pad)) if ("cue" in h) heard.push(h.cue);
    assert.ok(heard.includes("splash"));
    assert.deepEqual({ x: s.ball.x, y: s.ball.y }, course.start);
    assert.equal(s.shots, 1);
    assert.match(s.message, /Splash/);
});

test("a slope bends a putt downhill, and mud stops a ball sooner than sand or lawn", () => {
    const flat: GolfCourse = { ...golfCourse(5, 0), slopes: [] },
        hill = golfCourse(5, 0),
        a = startGolf(flat),
        b = startGolf(hill);
    release(a, 0, 4);
    release(b, 0, 4);
    assert.ok(b.ball.y > a.ball.y + 1, "downhill is down the page on this hole");
    const ys = golfWorld(b).slopes?.[0];
    assert.ok(ys && Math.hypot(ys.ax, ys.ay) < golfWorld(b).deceleration, "a ball can rest on it");
    const lawn = startGolf({ ...golfCourse(9, 0), mud: [], slopes: [] }),
        mud = startGolf({ ...golfCourse(9, 0), slopes: [] });
    release(lawn, 0, 4);
    release(mud, 0, 4);
    assert.ok(mud.ball.x < lawn.ball.x - 3);
});

test("the gnome walks his track out and back, and the board reads par and the aim", () => {
    const m = golfCourse(8, 0).movers?.[0];
    assert.ok(m);
    assert.deepEqual(moverAt(m, 0), m.rect);
    assert.ok(Math.abs(moverAt(m, 90).y - (m.rect.y + m.dy)) < 1e-9);
    assert.equal(clockOf(0), 3);
    assert.equal(clockOf(-Math.PI / 2), 12);
    assert.equal(clockOf(Math.PI), 9);
    const s = startGolf(golfCourse(3, 0));
    const words = golfGame.frame(s).marks.flatMap((m) => (m.kind === "word" ? [m.text] : []));
    assert.ok(words.some((w) => /par 2/.test(w)));
    assert.ok(words.some((w) => /o'clock/.test(w)));
    // the older holes keep their board as it was, with no par
    const old = golfGame.frame(startGolf(golfCourse(0, 0))).marks;
    assert.ok(!old.some((m) => m.kind === "word" && /par/.test(m.text)));
});

test("sinking within par says so, and over par says to have another go", () => {
    const course = golfCourse(6, 0),
        plan = golfPlan(course);
    assert.ok(plan);
    const end = playGolf(course, plan);
    assert.match(end.message, /par|hole in one/i);
});
