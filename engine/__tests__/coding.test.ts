// The program model and its one interpreter, checked as data: what a line reads as, what a program
// does in a world, and what a run comes to. Everything that shows or proves a program goes through
// these functions, so a mistake here would be a mistake on the page, in the key and in the runner.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    done,
    mazeWorld,
    meets,
    oneLine,
    outcome,
    parse,
    run,
    shapeOf,
    world,
    writeLines,
    type World,
} from "../coding";

const grid = (cols = 6, rows = 5, o: Partial<World> = {}): World => world({ cols, rows, ...o });
const go = (code: string[], w: World = grid(), vars: Record<string, number> = {}) =>
    run(parse(code), w, { vars });

test("a straight program walks the grid one line at a time", () => {
    const r = go(["right 3", "down 2"]);
    assert.equal(r.stopped, "end");
    assert.deepEqual([r.end.col, r.end.row], [4, 3]);
    assert.deepEqual(
        r.frames.map((f) => f.line),
        [1, 2],
    );
    assert.deepEqual(r.frames[0]?.path, [
        { col: 1, row: 1 },
        { col: 2, row: 1 },
        { col: 3, row: 1 },
        { col: 4, row: 1 },
    ]);
    assert.equal(r.end.face, "down", "an arrow move turns the robot the way it goes");
});

test("forward and turns follow the heading, and a right turn is clockwise", () => {
    const r = go(["forward 2", "turn right", "forward 1", "turn left", "forward 1"]);
    assert.deepEqual([r.end.col, r.end.row, r.end.face], [4, 2, "right"]);
    const back = go(["turn around", "back 2"], grid(6, 5, { start: { col: 1, row: 3 } }));
    assert.deepEqual([back.end.col, back.end.row, back.end.face], [3, 3, "left"]);
});

test("a repeat runs its lines again, and nesting multiplies", () => {
    const r = go(["repeat 3", "  right 1", "  down 1"]);
    assert.deepEqual([r.end.col, r.end.row], [4, 4]);
    assert.equal(r.counts.get(2), 3);
    const nested = go(["repeat 2 times", "  repeat 2", "    right 1", "  down 1"]);
    assert.deepEqual([nested.end.col, nested.end.row], [5, 3]);
    assert.equal(nested.counts.get(3), 4, "the inner line runs outer times inner");
    assert.deepEqual(
        nested.frames.filter((f) => f.kind === "repeat" && f.line === 1).map((f) => f.round),
        [
            { i: 1, of: 2 },
            { i: 2, of: 2 },
        ],
    );
});

test("a rock or the edge stops the robot where it is, and says which line", () => {
    const w = mazeWorld({
        cols: 0,
        rows: 0,
        map: ["S . # .", ". . . F"],
        col: 1,
        row: 1,
        face: "right",
        flag: [],
        gems: [],
        rocks: [],
    });
    const r = run(parse(["right 3", "down 1"]), w);
    assert.equal(r.stopped, "bump");
    assert.deepEqual([r.end.col, r.end.row], [2, 1]);
    assert.equal(outcome(r, parse(["right 3"]), w, "bumpline"), 1);
    assert.equal(r.frames.at(-1)?.bump?.why, "rock");
    const edge = go(["up 1"]);
    assert.equal(edge.frames.at(-1)?.bump?.why, "edge");
    const ok = run(parse(["down 1", "right 3"]), w);
    assert.ok(meets(ok, w, "flag"));
});

test("gems are picked up by walking over them, and the goal can ask for all of them", () => {
    const w = mazeWorld({
        cols: 5,
        rows: 3,
        map: [],
        col: 1,
        row: 2,
        face: "right",
        flag: [5, 2],
        gems: [3, 2, 4, 1],
        rocks: [],
    });
    const r = run(parse(["right 2", "up 1", "right 1", "down 1", "right 1"]), w);
    assert.equal(r.end.got.length, 2);
    assert.ok(meets(r, w, "both"));
    assert.ok(!meets(run(parse(["right 4"]), w), w, "both"));
});

test("an if takes one path, and otherwise takes the other", () => {
    const code = ["if the number is more than 5", "  say shout", "otherwise", "  say whisper"];
    assert.equal(go(code, grid(), { number: 6 }).end.said, "shout");
    assert.equal(go(code, grid(), { number: 5 }).end.said, "whisper");
    const w = mazeWorld({
        cols: 0,
        rows: 0,
        map: ["S . #"],
        col: 1,
        row: 1,
        face: "right",
        flag: [],
        gems: [],
        rocks: [],
    });
    const walk = run(parse(["repeat until wall ahead", "  forward 1"]), w);
    assert.deepEqual([walk.end.col, walk.stopped], [2, "end"]);
});

test("a name holds one number at a time, and a line can use it", () => {
    const r = go(["set n to 4", "add 3 to n", "add 3 to n", "right n"], grid(12, 2));
    assert.equal(r.end.vars.n, 10);
    assert.equal(r.end.col, 11);
    assert.equal(go(["set n to 5", "take 2 from n"]).end.vars.n, 3);
    assert.equal(go(["set n to 2", "change n by n + 1"]).end.vars.n, 5);
    assert.match(go(["add 1 to score"]).problems.join(), /score has no number yet/);
});

test("events start their own scripts, and a define is a block made of blocks", () => {
    const code = ["when the flag is tapped", "right 2", "when tapped", "say ouch", "down 1"];
    const p = parse(code);
    assert.deepEqual(p.problems, []);
    assert.equal(run(p, grid()).end.col, 3);
    const tap = run(p, grid(), { event: "tap" });
    assert.deepEqual([tap.end.said, tap.end.row], ["ouch", 2]);
    const proc = go(
        ["define zigzag", "  right 1", "  up 1", "zigzag", "zigzag"],
        grid(6, 5, { start: { col: 1, row: 5 } }),
    );
    assert.deepEqual([proc.end.col, proc.end.row], [3, 3]);
    assert.match(parse(["define jump", "  up 1"]).problems[0]?.message ?? "", /already a block/);
});

test("the pen draws, and the shape it drew can be named", () => {
    const sq = go(["repeat 4", "  forward 3", "  turn right"], grid(8, 8, { pen: true }));
    assert.equal(shapeOf(sq.segments, sq.start), "square");
    const rect = go(["right 4", "down 2", "left 4", "up 2"], grid(8, 8, { pen: true }));
    assert.equal(shapeOf(rect.segments, rect.start), "rectangle");
    const open = go(["right 4", "down 2", "left 3", "up 2"], grid(8, 8, { pen: true }));
    assert.equal(shapeOf(open.segments, open.start), "open");
    const up = go(["pen up", "right 2", "pen down", "right 1"], grid(8, 8, { pen: true }));
    assert.equal(up.segments.length, 1);
});

test("a printer paints pixel rows from the top, and a repeat repeats a row", () => {
    const w = grid(5, 3, { printer: true });
    const r = run(parse(["1 white 3 red 1 white", "repeat 2", "  5 blue"]), w);
    assert.equal(r.end.painted.size, 15);
    assert.equal(r.end.painted.get(1), "red");
    assert.equal(r.end.painted.get(10), "blue");
});

test("music and dance lines are frames the runner can play", () => {
    const r = go(["play C", "play E4 2", "clap 2", "jump", "rest"]);
    assert.deepEqual(
        r.frames.map((f) => f.kind),
        ["play", "play", "dance", "dance", "rest"],
    );
    assert.equal(r.frames[1]?.beats, 2);
    assert.equal(outcome(r, parse([]), grid(), "claps"), 2);
});

test("a line that cannot be read is reported with its number, and the rest still runs", () => {
    const p = parse(["right 2", "jmup", "  down 1", "repeat 3", "down 1"]);
    assert.deepEqual(
        p.problems.map((x) => x.line),
        [2, 4],
    );
    assert.match(p.problems[0]?.message ?? "", /is not a block we know/);
    assert.match(p.problems[1]?.message ?? "", /needs the lines it holds/);
});

test("a lamp flashes long for two beats and short for one, and keeps what it flashed", () => {
    const code = ["repeat 2", "  flash long", "  flash short", "wait"];
    const p = parse(code),
        w = grid(),
        r = run(p, w);
    assert.deepEqual(p.problems, []);
    const flashes = r.frames.filter((f) => f.kind === "flash");
    assert.deepEqual(
        flashes.map((f) => [f.line, f.flash, f.beats]),
        [
            [2, "long", 2],
            [3, "short", 1],
            [2, "long", 2],
            [3, "short", 1],
        ],
    );
    assert.deepEqual(r.end.flashes, ["long", "short", "long", "short"]);
    assert.deepEqual(r.start.flashes, []);
    assert.equal(outcome(r, p, w, "flashes"), 4);
    assert.equal(outcome(r, p, w, "flash(3)"), "long");
    assert.throws(() => outcome(r, p, w, "flash(5)"), /no flash 5/);
});

test("a flash is long or short, and nothing else", () => {
    const p = parse(["flash bright", "flash", "flash long 2", "flash short"]);
    assert.deepEqual(
        p.problems.map((x) => [x.line, x.message]),
        [
            [1, '"flash bright": flash long or flash short'],
            [2, '"flash": flash long or flash short'],
            [3, '"flash long 2": flash long or flash short'],
        ],
    );
    assert.equal(parse(["set flash to 2"]).problems.length, 1, "flash is a block, not a name");
});

test("a lamp lights in a colour, and the run keeps the colours in order", () => {
    const code = ["repeat 2", "  light red", "  light green", "light white"];
    const p = parse(code),
        w = grid(),
        r = run(p, w);
    assert.deepEqual(p.problems, []);
    assert.deepEqual(
        r.frames.filter((f) => f.kind === "light").map((f) => [f.line, f.colour]),
        [
            [2, "red"],
            [3, "green"],
            [2, "red"],
            [3, "green"],
            [4, "white"],
        ],
    );
    assert.deepEqual(r.end.lights, ["red", "green", "red", "green", "white"]);
    assert.deepEqual(r.start.lights, []);
    assert.equal(r.stopped, "end");
    assert.equal(outcome(r, p, w, "lights"), 5);
    assert.equal(outcome(r, p, w, "light(3)"), "red");
    assert.throws(() => outcome(r, p, w, "light(6)"), /no light 6/);
});

test("a light takes one colour of the palette, and nothing else", () => {
    const p = parse(["light bright", "light", "light red blue", "light orange"]);
    assert.deepEqual(
        p.problems.map((x) => x.line),
        [1, 2, 3],
    );
    for (const x of p.problems) assert.match(x.message, /light takes a colour \(red, blue, green/);
    assert.equal(parse(["set light to 2"]).problems.length, 1, "light is a block, not a name");
    // every colour of the palette lights the lamp
    const colours = ["red", "blue", "green", "yellow", "orange", "black", "white"];
    const r = run(parse(colours.map((k) => `light ${k}`)), grid());
    assert.deepEqual(r.end.lights, colours);
});

test("a repeat for ever runs until the step limit and ends with a limit frame", () => {
    const code = ["repeat for ever", "  light red", "  light green"];
    const p = parse(code),
        w = grid(),
        r = run(p, w);
    assert.deepEqual(p.problems, []);
    assert.equal(r.stopped, "limit");
    assert.equal(r.frames.length, 2000);
    // the body's lines come round in order, under the repeat's own frame
    assert.deepEqual(
        r.frames.slice(0, 5).map((f) => [f.line, f.kind]),
        [
            [1, "forever"],
            [2, "light"],
            [3, "light"],
            [1, "forever"],
            [2, "light"],
        ],
    );
    assert.deepEqual(r.frames[3]?.round, { i: 2, of: 0 });
    assert.equal(outcome(r, p, w, "light(4)"), "green");
    // a program that never ends is never done, so it cannot meet a goal
    assert.equal(meets(r, w, "flag"), false);
});

test("a repeat for ever takes no number, and reads the ways a child writes it", () => {
    assert.deepEqual(
        parse(["repeat for ever 3", "  light red"]).problems.map((x) => x.message),
        ['"repeat for ever 3": repeat for ever takes no number'],
    );
    for (const head of ["repeat for ever", "repeat forever", "repeat ever"]) {
        const r = run(parse([head, "  light red"]), grid());
        assert.equal(r.stopped, "limit", head);
        assert.equal(r.end.lights.length, 1000, head);
    }
    assert.equal(parse(["set ever to 2"]).problems.length, 1, "ever is a block word, not a name");
});

test("the lamp world's listings are programs the interpreter reads", () => {
    // the programs the grade 1 lesson and its items print, which were paper listings until now
    const listings = [
        ["repeat for ever", "  light red", "  light green"],
        ["repeat for ever", "  light red", "  light red", "  light green"],
        ["repeat for ever", "  light green", "  light red"],
        ["repeat for ever", "  light red", "  light white", "  light white"],
        ["repeat 2", "  light red", "  light green"],
    ];
    for (const code of listings) assert.deepEqual(parse(code).problems, [], code.join(" / "));
});

test("a run comes to the numbers an item asks about", () => {
    const code = ["right 2", "down 1", "right 1"];
    const p = parse(code),
        w = grid(),
        r = run(p, w);
    assert.equal(outcome(r, p, w, "after(2).col"), 3);
    assert.equal(outcome(r, p, w, "moves"), 4);
    assert.equal(outcome(r, p, w, "ran(3)"), 1);
    assert.throws(() => outcome(r, p, w, "colour"), /not something a run comes to/);
});

test("programs are written back out two spaces a level, and fold into one line for a key", () => {
    assert.deepEqual(
        writeLines([
            { text: "repeat 2", depth: 0 },
            { text: " right 1 ", depth: 1 },
        ]),
        ["repeat 2", "  right 1"],
    );
    assert.equal(
        oneLine(["right 2", "repeat 3", "  up 1", "  right 1", "down 1"]),
        "right 2, repeat 3 (up 1, right 1), down 1",
    );
    assert.equal(
        oneLine(["repeat 2", "  repeat 2", "    right 1", "  down 1"]),
        "repeat 2 (repeat 2 (right 1), down 1)",
    );
});

test("the same program in the same world gives the same frames every time", () => {
    const code = ["repeat 3", "  forward 2", "  turn right", "  paint red"];
    const a = go(code, grid(8, 8)),
        b = go(code, grid(8, 8));
    assert.deepEqual(JSON.stringify(a.frames), JSON.stringify(b.frames));
});

test("a program does its task when its run meets the goal, or draws exactly the target's lines", () => {
    const w = mazeWorld({
        cols: 5,
        rows: 3,
        map: [],
        col: 1,
        row: 1,
        face: "right",
        flag: [4, 3],
        gems: [],
        rocks: [],
    });
    assert.ok(done(["right 3", "down 2"], w, "flag"));
    assert.ok(!done(["right 3", "down 1"], w, "flag"));
    const pen = grid(6, 6, { pen: true });
    const square = run(parse(["right 2", "down 2", "left 2", "up 2"]), pen).segments;
    assert.ok(done(["down 2", "right 2", "up 2", "left 2"], pen, "target", { segments: square }));
    assert.ok(
        !done(["repeat 2", "  right 2", "  down 2", "  left 2", "  up 2"], pen, "target", {
            segments: square,
        }),
        "going round twice draws the lines twice",
    );
    assert.ok(!done(["right 2"], pen, "target", {}), "a target task with no target is never done");
});
