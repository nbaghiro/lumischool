// Row to the jetty: a stroke adds speed by the rule, a boat arriving faster than gently bumps and
// comes away, and one gliding on slowly enough comes to rest and wins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHELF_IDS } from "./shelf";
import { emptyPad, spent } from "../../../engine/motion/pad";
import { seeded } from "../../../engine/motion/spawn";
import { ACTIVITIES } from "../activities";
import { gameById } from "../catalogue";

const loadRow = async () => ({
    ...(await import("../row")),
    ...(await import("../../../engine/motion/stroke")),
});
type RowKit = Awaited<ReturnType<typeof loadRow>>;
type RowBoat = ReturnType<RowKit["start"]>;

/** Holds space for `length` of a whole stroke, or the left arrow to back water, then waits `gap` seconds with nothing held. */
function rowKeys(R: RowKit, s: RowBoat, length: number, gap: number): void {
    const pad = emptyPad();
    if (length > 0) {
        pad.go = true;
        pad.tapped = true;
    } else if (length < 0) pad.holding.push("left");
    for (let i = 0; i < Math.round(Math.abs(length) * R.ROW.hold.value * 60) && !s.won; i++) {
        R.step(s, pad);
        spent(pad);
    }
    for (let i = 0; i < Math.max(1, Math.round(gap * 60)) && !s.won; i++) R.step(s, emptyPad());
}

/** The speed over the bed a glide from here reaches the level's mark at, or 0 if it stops or turns back first. */
function rowLands(R: RowKit, s: RowBoat, v: number): number {
    let x = s.x;
    for (let t = 0; t < 60; t += 0.05) {
        const g = R.glide(v, 0.05, R.ROW.water.value, s.L.current);
        if (x < s.L.target && x + g.moved >= s.L.target) return g.v - s.L.current;
        if (g.v - s.L.current < 0.02) return 0;
        x += g.moved;
        v = g.v;
    }
    return 0;
}

/** A careful rower on the keys: whole strokes in time, until a shorter one would glide the bow in gently. */
function rowCareful(R: RowKit, level: number): RowBoat {
    const s = R.start(level),
        gentle = R.ROW.gentle.value,
        r = R.rhythmOf();
    for (let n = 0; n < 80 && !s.won; n++) {
        const now = rowLands(R, s, s.v);
        if (now > 0 && now <= gentle) {
            rowKeys(R, s, 0, 1);
            continue;
        }
        const soft = Array.from({ length: 20 }, (_, i) => (i + 1) / 20).find((l) => {
            const a = rowLands(R, s, R.drive(s.v, l, "in time", r));
            return a > 0.15 && a <= gentle * 0.8;
        });
        rowKeys(R, s, soft ?? (now > gentle ? -0.5 : 1), 0.8);
    }
    for (let i = 0; i < 60 * 30 && !s.won; i++) R.step(s, emptyPad());
    return s;
}

test("every rowing level can be won by careful strokes, and the race's two versions keep their distances and posts", async () => {
    const R = await loadRow();
    for (let level = 0; level < R.ROW_LEVELS.length; level++) {
        const s = rowCareful(R, level);
        assert.ok(s.won, `${s.L.title}: the careful rower is left at ${s.x.toFixed(1)} metres`);
        assert.equal(s.x, s.L.target);
        assert.ok(s.strokes >= 5 && s.strokes <= 30, `${s.L.title}: ${s.strokes} strokes`);
    }
    assert.equal(gameById("straight"), R.rowGame);
    const race = ACTIVITIES.find((a) => a.id === "race.stop-on-the-line");
    assert.ok(race);
    assert.equal(R.rowGame.plays?.activity, race.id);
    for (const [version, level] of (R.rowGame.plays?.levels ?? []).entries()) {
        const L = R.ROW_LEVELS[level],
            named = String(race.versions[version] ?? "");
        assert.ok(
            L &&
                L.target === L.metres &&
                named.startsWith(`${L.metres} metres in ${L.every === 10 ? "tens" : "fives"}`),
            `version ${version}, ${named}, is level ${level}`,
        );
    }
});

test("a rowing stroke adds speed by the rule: by the length dragged, less when caught too soon after the last, and the same when late", async () => {
    const R = await loadRow();
    const s = R.start(0),
        r = R.rhythmOf(),
        keep = Math.exp(-R.ROW.water.value / 60),
        drag = R.ROW.drag.value;
    const near = (a: number, b: number, what: string) =>
        assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a} against ${b}`);
    const stroke = (length: number, wait: number) => {
        for (let i = 0; i < Math.round(wait * 60); i++) R.step(s, emptyPad());
        const pad = emptyPad();
        pad.touch = { x: 40, y: 20 };
        R.step(s, pad);
        spent(pad);
        const before = s.v;
        pad.touch = { x: 40 - drag * length, y: 20 };
        R.step(s, pad);
        spent(pad);
        const after = s.v,
            timing = s.stroke?.timing;
        pad.lifted = pad.touch;
        pad.touch = null;
        R.step(s, pad);
        return { before, after, timing };
    };
    const half = stroke(0.5, 0);
    assert.equal(half.timing, "in time", "a first stroke is in time");
    near(half.after, R.drive(half.before, 0.5, "in time", r) * keep, "half a drag");
    const rushed = stroke(1, 0.2);
    assert.equal(rushed.timing, "rushed");
    assert.equal(s.rushed, 1);
    near(rushed.after, R.drive(rushed.before, 1, "rushed", r) * keep, "a rushed catch");
    assert.ok(
        rushed.after < R.drive(rushed.before, 1, "in time", r) * keep,
        "keeps less of its push",
    );
    const good = stroke(1, 1);
    assert.equal(good.timing, "in time");
    near(good.after, R.drive(good.before, 1, "in time", r) * keep, "a catch in time");
    const late = stroke(1, 3);
    assert.equal(late.timing, "late");
    near(late.after, R.drive(late.before, 1, "in time", r) * keep, "a late catch pushes fully");
    const whole = R.start(0),
        part = R.start(0);
    rowKeys(R, whole, 1, 0);
    rowKeys(R, part, 0.5, 0.3);
    assert.ok(whole.v > part.v, "a longer hold rows harder");
    // A hand takes time over a drag too: a whole drag over as long as a whole hold rows the same.
    const dragged = R.start(0),
        pad = emptyPad(),
        steps = Math.round(R.ROW.hold.value * 60);
    pad.touch = { x: 40, y: 20 };
    R.step(dragged, pad);
    spent(pad);
    for (let i = 1; i <= steps; i++) {
        pad.touch = { x: 40 - (drag * i) / steps, y: 20 };
        R.step(dragged, pad);
        spent(pad);
    }
    assert.ok(
        Math.abs(dragged.v - whole.v) < 0.05,
        `a whole drag and a whole hold agree: ${dragged.v.toFixed(2)} and ${whole.v.toFixed(2)}`,
    );
});

test("a rowing boat reaching the jetty faster than gently, or with its oars still pulling, bumps and comes away and never wins", async () => {
    const R = await loadRow();
    const fast = R.start(0);
    fast.x = 95;
    fast.v = 3;
    let bumped = false;
    for (let i = 0; i < 60 * 40; i++) {
        const out = R.step(fast, emptyPad());
        if (!bumped && out.some((h) => "cue" in h && h.cue === "bump")) {
            bumped = true;
            assert.ok(fast.v < 0 && fast.x < 100, "it comes away backwards");
        }
        assert.ok(!fast.won, "a bump never wins");
    }
    assert.ok(bumped && fast.bumps === 1, "it bumped once");
    assert.ok(fast.x < 99 && Math.abs(fast.v) < 0.05, "and came to rest short of the jetty");
    for (const [arrive, wins] of [
        [0.3, true],
        [0.6, true],
        [0.65, true],
        [0.8, false],
        [1, false],
        [2, false],
    ] as const) {
        const s = R.start(0);
        s.x = 96;
        s.v = arrive + R.ROW.water.value * 4;
        for (let i = 0; i < 60 * 30 && !s.won && s.bumps === 0; i++) R.step(s, emptyPad());
        assert.equal(s.won, wins, `arriving at ${arrive} metres a second`);
        assert.equal(s.bumps, wins ? 0 : 1);
    }
    const pulling = R.start(0),
        pad = emptyPad();
    pulling.x = 99.99;
    pulling.v = 0.1;
    pad.go = true;
    pad.tapped = true;
    let speed = -1;
    for (let i = 0; i < 30 && pulling.bumps === 0; i++) {
        speed = pulling.v;
        R.step(pulling, pad);
        spent(pad);
    }
    assert.ok(
        !pulling.won && pulling.bumps === 1 && speed < R.ROW.gentle.value,
        `a drive still in the water rams the jetty, here at ${speed.toFixed(2)} metres a second`,
    );
    assert.match(pulling.said, /oars were still pulling/);
    // A drag that goes on after the bump is not a rushed stroke: the bump knocked the oars out of the hand.
    const knocked = R.start(0),
        hand = emptyPad();
    knocked.x = 99.6;
    knocked.v = 0.6;
    knocked.steps = 1000;
    knocked.endedAt = 700;
    hand.touch = { x: 40, y: 20 };
    R.step(knocked, hand);
    spent(hand);
    for (let i = 1; i <= 18; i++) {
        hand.touch = { x: 40 - (R.ROW.drag.value * i) / 18, y: 20 };
        R.step(knocked, hand);
        spent(hand);
        R.step(knocked, hand);
    }
    hand.lifted = hand.touch;
    hand.touch = null;
    R.step(knocked, hand);
    assert.ok(
        knocked.bumps === 1 && knocked.rushed === 0 && !knocked.won,
        "the drag going on after the bump is not a stroke",
    );
    assert.match(knocked.said, /oars were still pulling/);
});

test("a rowing boat gliding onto the jetty or the buoy slowly enough comes to rest there and wins, and the finish says where", async () => {
    const R = await loadRow();
    for (let level = 0; level < R.ROW_LEVELS.length; level++) {
        const s = R.start(level),
            L = s.L;
        s.x = L.target - 3;
        const v = Array.from({ length: 800 }, (_, i) => i / 100).find((u) => {
            const a = rowLands(R, s, u);
            return a > 0.25 && a < 0.55;
        });
        assert.ok(v !== undefined, L.title);
        s.v = v;
        for (let i = 0; i < 60 * 30 && !s.won; i++) R.step(s, emptyPad());
        assert.ok(s.won && R.rowGame.won(s) && s.x === L.target && s.v === 0, L.title);
        assert.equal(R.rowGame.note(s), L.done);
        assert.ok(
            R.say(s).includes(`${L.target} metres`) && !/\b0 metres|moves/.test(R.say(s)),
            `the finish reads true: ${R.say(s)}`,
        );
    }
    const short = R.start(0);
    short.x = 90;
    short.v = 1;
    short.strokes = 1;
    for (let i = 0; i < 60 * 30; i++) R.step(short, emptyPad());
    assert.ok(!short.won);
    const said = /Stopped at (\d+) metres, (\d+) metres short of the jetty/.exec(short.said);
    assert.ok(said, short.said);
    assert.equal(
        Number(said[1]) + Number(said[2]),
        100,
        "the stop and the gap add up to the jetty",
    );
});

test("random rowing strokes on the keys, one for every 2.5 metres of river, bring the boat to rest at the mark at most one time in five", async () => {
    const R = await loadRow();
    for (let level = 0; level < R.ROW_LEVELS.length; level++) {
        const rnd = seeded(900 + level),
            rounds = 30;
        let wins = 0;
        for (let round = 0; round < rounds; round++) {
            const s = R.start(level);
            for (let k = 0; k < Math.ceil(s.L.metres / 2.5) && !s.won; k++)
                rowKeys(R, s, (rnd() < 0.8 ? 1 : -1) * rnd() * 1.2, 0.1 + rnd() * 1.5);
            for (let i = 0; i < 60 * 30 && !s.won; i++) R.step(s, emptyPad());
            if (s.won) wins++;
        }
        assert.ok(wins / rounds <= 0.2, `${R.ROW_LEVELS[level]?.title}: ${wins} of ${rounds}`);
    }
});

test("the same hands give the same rowing, stroke for stroke", async () => {
    const R = await loadRow();
    const play = () => {
        const s = R.start(3),
            rnd = seeded(77),
            pad = emptyPad(),
            log: string[] = [];
        for (let k = 0; k < 14; k++) {
            pad.touch = { x: 40, y: 20 };
            R.step(s, pad);
            spent(pad);
            const len = 1 + rnd() * 5,
                wait = 20 + Math.floor(rnd() * 60);
            for (let i = 1; i <= 20; i++) {
                pad.touch = { x: 40 - (len * i) / 20, y: 20 };
                log.push(JSON.stringify(R.step(s, pad)));
                spent(pad);
            }
            pad.lifted = pad.touch;
            pad.touch = null;
            R.step(s, pad);
            spent(pad);
            for (let i = 0; i < wait; i++) R.step(s, pad);
        }
        return JSON.stringify({
            x: s.x,
            v: s.v,
            strokes: s.strokes,
            rushed: s.rushed,
            bumps: s.bumps,
            steps: s.steps,
            won: s.won,
            said: s.said,
            frame: R.frame(s),
            log,
        });
    };
    assert.equal(play(), play());
});

test("under reduced motion a rowing press is a whole stroke, and its glide is worked out to rest before the next", async () => {
    const R = await loadRow();
    const s = R.start(0),
        G = R.rowGame;
    const press = (key: "go" | "left") => {
        const pad = emptyPad();
        if (key === "go") {
            pad.go = true;
            pad.tapped = true;
        } else pad.holding.push("left");
        for (let i = 0; i < G.still.press(s); i++) {
            R.step(s, pad);
            spent(pad);
        }
        for (let n = 0; n < 60 * 20 && G.still.settling?.(s); n++) R.step(s, emptyPad());
    };
    press("go");
    assert.equal(s.strokes, 1);
    assert.ok(
        s.stroke === null && Math.abs(s.v) <= 0.1 && !G.still.settling?.(s),
        "the stroke came to rest",
    );
    const first = s.x;
    assert.ok(first > 3, `one press rowed ${first.toFixed(1)} metres`);
    press("go");
    assert.equal(s.rushed, 0, "a stroke after a glide worked out to rest is never rushed");
    assert.ok(s.x > first);
    const second = s.x;
    press("left");
    assert.ok(s.x < second, "the left arrow backs water");
    // As the page does it: a finger down is a press, moving it runs no steps, and lifting it is a press again.
    const pad = emptyPad(),
        backed = s.x;
    pad.touch = { x: 40, y: 20 };
    for (let i = 0; i < G.still.press(s); i++) {
        R.step(s, pad);
        spent(pad);
    }
    pad.touch = null;
    for (let n = 0; n < 60 * 20 && G.still.settling?.(s); n++) R.step(s, pad);
    pad.lifted = { x: 40 - R.ROW.drag.value, y: 20 };
    for (let i = 0; i < G.still.press(s); i++) {
        R.step(s, pad);
        spent(pad);
    }
    for (let n = 0; n < 60 * 20 && G.still.settling?.(s); n++) R.step(s, emptyPad());
    assert.equal(s.strokes, 4, "a drag rows when it lifts");
    assert.ok(s.x > backed + 3);
});

test("every drawing a rowing frame names is on the shelf, through a bump, a stop short and a finish", async () => {
    const known = SHELF_IDS;
    const R = await loadRow();
    assert.ok(known.has(R.rowGame.cover.art), R.rowGame.cover.art);
    for (let level = 0; level < R.ROW_LEVELS.length; level++) {
        const won = rowCareful(R, level),
            frames = [R.frame(won), R.frame(won, true)];
        const bump = R.start(level);
        bump.x = bump.L.target - 2;
        bump.v = 5;
        bump.strokes = 1;
        for (let i = 0; i < 60 * 20; i++) {
            R.step(bump, emptyPad());
            if (i % 60 === 0) frames.push(R.frame(bump), R.frame(bump, true));
        }
        const rowing = R.start(level);
        rowKeys(R, rowing, 0.5, 0);
        frames.push(R.frame(rowing), R.frame(rowing, true));
        for (const f of frames)
            for (const sp of f.sprites)
                assert.ok(
                    known.has(sp.art),
                    `${sp.key} asks for ${sp.art}, which is not on the shelf`,
                );
        const boat = frames[0]?.sprites.find((sp) => sp.key === "boat");
        assert.ok(
            boat && boat.art === "rowboat" && boat.params?.cheer === 1 && boat.params.lifted === 1,
            `${R.ROW_LEVELS[level]?.title}: the rower has tied up and put both arms up`,
        );
        const ids = new Set(frames.flatMap((f) => f.sprites.map((sp) => sp.art)));
        assert.ok(
            ids.has("riverpost") &&
                (ids.has("mooringbuoy") || ids.has("jetty")) &&
                ids.has("reeds"),
            `${R.ROW_LEVELS[level]?.title}: posts, a finish and reeds`,
        );
        if (R.ROW_LEVELS[level]?.current)
            assert.ok(ids.has("current"), `${R.ROW_LEVELS[level]?.title}: the current is drawn`);
    }
    const art = {
        ...(await import("../../../engine/parts/travel/rowboat")),
        ...(await import("../../../engine/parts/measuring/riverpost")),
    };
    assert.deepEqual(
        [R.BOAT.box.w, R.BOAT.box.h, R.BOAT.waterline, R.BOAT.bowAt],
        [art.ROWBOAT.w, art.ROWBOAT.h, art.ROWBOAT.waterline, art.ROWBOAT.bow],
        "the boat floats by its drawing's own waterline and bow",
    );
    // The posts' plates stand clear of the boat and its rower, so the numbers are never behind the boat.
    const s = R.start(0),
        f = R.frame(s),
        boat = f.sprites.find((sp) => sp.key === "boat"),
        post = f.sprites.find((sp) => sp.key === "post:0");
    assert.ok(boat && post && boat.size !== undefined && post.size !== undefined);
    const boatTop = boat.y - boat.size * (art.ROWBOAT.h / art.ROWBOAT.w),
        plateBottom =
            post.y -
            post.size *
                ((Number(post.params?.tall) - art.RIVERPOST.plate.top - art.RIVERPOST.plate.h) /
                    art.RIVERPOST.w);
    assert.ok(
        plateBottom < boatTop - 0.5,
        `the plate's foot at ${plateBottom.toFixed(2)} is above the boat's top at ${boatTop.toFixed(2)}`,
    );
    const banks = R.ROW_LEVELS.map((_, i) =>
        R.frame(R.start(i))
            .sprites.filter((sp) => sp.key.startsWith("bank:"))
            .map((sp) => `${sp.art}@${sp.x}`)
            .join(","),
    );
    assert.equal(
        new Set(banks).size,
        R.ROW_LEVELS.length,
        "every level has bank scenery of its own",
    );
});
