// The program model and its one interpreter, checked as data: what a line reads as, what a program
// does in a world, and what a run comes to. Everything that shows or proves a program goes through
// these functions, so a mistake here would be a mistake on the page, in the key and in the runner.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    done,
    everyRun,
    mazeWorld,
    meets,
    oneLine,
    outcome,
    overAll,
    parse,
    run,
    senseOf,
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

test("a build that draws random numbers is done only if every number they could be reaches the goal", () => {
    const w = mazeWorld({
        cols: 8,
        rows: 1,
        map: [],
        col: 1,
        row: 1,
        face: "right",
        flag: [8, 1],
        gems: [],
        rocks: [],
    });
    assert.ok(
        done(
            ["set roll to random 1 to 6", "right roll", "set gap to 7 - roll", "right gap"],
            w,
            "flag",
        ),
    );
    const once = ["set roll to random 1 to 6", "right roll", "set gap to 3", "right gap"];
    assert.ok(
        everyRun(parse(once), w).some((x) => x.run.stopped === "end" && x.run.end.col === 8),
        "one roll of this program reaches the flag",
    );
    assert.ok(!done(once, w, "flag"));
});

test("a list keeps several numbers under one name, and a repeat can go through it", () => {
    const code = [
        "set cargo to list 4, 7, 2",
        "set total to 0",
        "for each crate in cargo",
        "  add crate to total",
        "add 5 to cargo",
        "replace item 1 of cargo with 3",
    ];
    const p = parse(code),
        w = grid(),
        r = run(p, w);
    assert.deepEqual(p.problems, []);
    assert.deepEqual(r.problems, []);
    assert.equal(outcome(r, p, w, "value(total)"), 13, "the total adds every item once");
    assert.equal(outcome(r, p, w, "list(cargo)"), "3, 7, 2, 5", "add puts a number on the end");
    assert.equal(outcome(r, p, w, "length(cargo)"), 4);
    assert.equal(outcome(r, p, w, "item(2).cargo"), 7);
    assert.deepEqual(
        r.frames.filter((f) => f.kind === "each").map((f) => f.round),
        [
            { i: 1, of: 3 },
            { i: 2, of: 3 },
            { i: 3, of: 3 },
        ],
    );
    const found = go([
        "set shelf to list 12, 18, 25, 31",
        "set i to 1",
        "repeat until item i of shelf is 25",
        "  add 1 to i",
        "set last to length of shelf",
    ]);
    assert.deepEqual([found.end.vars.i, found.end.vars.last], [3, 4]);
    assert.match(go(["set n to item 1 of shelf"]).problems.join(), /no list called shelf/);
    assert.match(
        go(["set shelf to list 1, 2", "set n to item 3 of shelf"]).problems.join(),
        /no item 3: it holds 2 items/,
    );
    assert.match(
        parse(["for each in cargo", "  right 1"]).problems[0]?.message ?? "",
        /for each box in cargo/,
    );
});

test("conditions join with and and or, and or joins looser than and", () => {
    const says = (n: number, cond: string): string =>
        go([`if ${cond}`, "  say yes", "otherwise", "  say no"], grid(), { n }).end.said;
    assert.equal(says(7, "n is more than 3 and n is less than 9"), "yes");
    assert.equal(says(12, "n is more than 3 and n is less than 9"), "no");
    assert.equal(says(12, "n is less than 3 or n is more than 9"), "yes");
    assert.equal(says(2, "n is 1 and n is 1 or n is 2"), "yes", "(a and b) or c");
    assert.equal(says(5, "not n is 5 or n is 5"), "yes");
    assert.ok(parse(["if n is more than 3 and less than 9", "  say yes"]).problems.length);
});

test("a block of your own can take inputs, which hold their numbers only while it runs", () => {
    const code = [
        "define box width height",
        "  repeat 2",
        "    forward width",
        "    turn right",
        "    forward height",
        "    turn right",
        "set width to 9",
        "box 3 2",
    ];
    const p = parse(code),
        w = grid(8, 8, { pen: true }),
        r = run(p, w);
    assert.deepEqual(p.problems, []);
    assert.equal(outcome(r, p, w, "moves"), 10);
    assert.equal(outcome(r, p, w, "shape"), "rectangle");
    assert.equal(r.end.vars.width, 9, "the name outside the block has its own number back");
    assert.equal(r.end.vars.height, undefined);
    assert.match(
        parse([...code.slice(0, 6), "box 3"]).problems[0]?.message ?? "",
        /takes 2 numbers/,
    );
});

test("a turn can be any number of degrees, and a turtle walks off the squares to draw a shape", () => {
    const hexagon = ["repeat 6", "  forward 3", "  turn left 60"];
    const w = grid(12, 12, { pen: true, start: { col: 4, row: 11 } });
    const p = parse(hexagon),
        r = run(p, w);
    assert.equal(r.stopped, "end");
    assert.deepEqual(
        [r.end.col, r.end.row, r.end.angle],
        [4, 11, 0],
        "round and back to the start",
    );
    assert.equal(outcome(r, p, w, "sides"), 6);
    const twice = parse(["repeat 6", "  forward 3", "  turn left 120"]);
    assert.equal(
        outcome(run(twice, w), twice, w, "sides"),
        3,
        "a hexagon's inside angle as the turn draws a triangle twice, which has three sides",
    );
    assert.equal(outcome(r, p, w, "turned"), 360);
    assert.equal(outcome(r, p, w, "moves"), 18, "a slanted side counts its whole length");
    assert.equal(outcome(r, p, w, "shape"), "closed");
    const square = run(parse(["repeat 4", "  forward 2", "  turn left 90"]), w);
    assert.equal(
        shapeOf(square.segments, square.start),
        "square",
        "a quarter turn stays on the squares",
    );
    assert.equal(square.end.face, "right");
    const off = run(parse(["turn left 45", "forward 20"]), w);
    assert.equal(off.stopped, "bump", "a slanted move stops at the edge of the paper");
});

test("a random number is the same on every run, and every way a program could run can be counted", () => {
    const dice = ["set a to random 1 to 6", "set b to random 1 to 6", "set total to a + b"];
    const p = parse(dice),
        w = grid();
    assert.deepEqual(p.problems, []);
    const one = run(p, w);
    assert.equal(one.rolls, 2);
    assert.deepEqual(one.end.vars, run(p, w).end.vars, "a seeded run gives the same numbers");
    assert.equal(everyRun(p, w).length, 36);
    assert.equal(overAll(p, w, "outcomes"), 36);
    assert.equal(overAll(p, w, "ways(value(total)=7)"), 6);
    assert.equal(overAll(p, w, "least(value(total))"), 2);
    assert.equal(overAll(p, w, "most(value(total))"), 12);
    assert.equal(overAll(p, w, "kinds(value(total))"), 11);
    assert.equal(overAll(p, w, "likeliest(value(total))"), 7);
    assert.equal(overAll(p, w, "fair(value(total))"), "no");
    const die = parse(["set roll to random 1 to 6"]);
    assert.equal(overAll(die, w, "fair(value(roll))"), "yes");
    // a spinner that is heads on 1 and tails on 2 or 3 is not fair, though it can land either way
    const spinner = parse(["if random 1 to 3 is 1", "  say heads", "otherwise", "  say tails"]);
    assert.equal(overAll(spinner, w, "kinds(said)"), 2);
    assert.equal(overAll(spinner, w, "fair(said)"), "no");
    assert.equal(overAll(spinner, w, "likeliest(said)"), "tails");
});

test("a share must come out whole, and a block of your own can be given a sum", () => {
    const halve = parse([
        "set t to 84",
        "repeat 3",
        "  set gap to t - 20",
        "  take gap / 2 from t",
    ]);
    assert.deepEqual(halve.problems, []);
    assert.equal(run(halve, grid()).end.vars.t, 28, "84, 52, 36, 28: half the gap each time");
    assert.equal(run(parse(["set a to 12 ÷ 4"]), grid()).end.vars.a, 3);
    assert.match(run(parse(["set a to 7 / 2"]), grid()).problems[0] ?? "", /not a whole number/);
    assert.match(run(parse(["set a to 7 / 0"]), grid()).problems[0] ?? "", /no answer/);
    const spiral = parse([
        "define spiral n",
        "  forward n",
        "  turn left",
        "  if n is more than 1",
        "    spiral n - 1",
        "spiral 4",
    ]);
    assert.deepEqual(spiral.problems, []);
    const w = grid(9, 9, { pen: true, start: { col: 3, row: 7 } }),
        r = run(spiral, w);
    assert.equal(
        outcome(r, spiral, w, "ran(2)"),
        4,
        "4, 3, 2 and 1: the block uses itself three times",
    );
    assert.equal(outcome(r, spiral, w, "moves"), 10);
    assert.match(
        parse(["define box a b", "  right a", "box 1 + 1 2"]).problems[0]?.message ?? "",
        /takes 2 numbers/,
        "a block with two inputs still takes a number or a name for each",
    );
});

test("a block that uses itself draws a fractal, and a block with no way to stop is caught", () => {
    const tree = [
        "define tree size",
        "  forward size",
        "  if size is more than 1",
        "    turn left",
        "    tree size / 2",
        "    turn around",
        "    tree size / 2",
        "    turn left",
        "  back size",
    ];
    const w = grid(12, 12, { pen: true, start: { col: 6, row: 12 }, face: "up" });
    for (const [size, calls] of [
        [1, 1],
        [2, 3],
        [4, 7],
    ] as const) {
        const p = parse([...tree, `tree ${size}`]),
            r = run(p, w);
        assert.equal(r.stopped, "end");
        assert.equal(outcome(r, p, w, "ran(2)"), calls, `tree ${size} draws ${calls} lines`);
        assert.deepEqual([r.end.col, r.end.row, r.end.face], [6, 12, "up"], "back where it began");
    }
    const endless = parse(["define fall n", "  forward 1", "  fall n - 1", "fall 3"]);
    const r = run(endless, grid(40, 40, { pen: true }));
    assert.match(r.problems[0] ?? "", /uses itself too many times over/);
});

test("not turns a question round, before a comparison as well as in front of one", () => {
    const said = (cond: string, n: number) =>
        go([`if ${cond}`, "  say yes", "otherwise", "  say no"], grid(), { n }).end.said;
    assert.equal(said("n is not more than 5", 5), "yes");
    assert.equal(said("n is not more than 5", 6), "no");
    assert.equal(said("n is not less than 5", 5), "yes");
    assert.equal(said("n is not at least 5", 4), "yes");
    assert.equal(said("n is not at most 5", 5), "no");
    assert.equal(said("not n is more than 5", 3), "yes");
    assert.equal(said("n is more than 1 and not n is more than 5", 3), "yes");
    assert.equal(said("n is not 5", 5), "no", "is not on its own still means not equal");
});

test("a broadcast runs every script that receives it, in order, before the next line", () => {
    const p = parse([
        "when the flag is tapped",
        "set n to 1",
        "broadcast go",
        "say done",
        "when I receive go",
        "add 10 to n",
        "broadcast again",
        "when I receive go",
        "add 100 to n",
        "when I receive again",
        "double n",
    ]);
    assert.deepEqual(p.problems, []);
    const r = run(p, grid());
    assert.equal(r.end.vars.n, 122, "1, then 11, doubled to 22, then 122");
    assert.equal(r.end.said, "done");
    assert.deepEqual(
        r.frames.map((f) => f.line),
        [2, 3, 6, 7, 11, 9, 4],
    );
    assert.equal(r.frames[1]?.message, "go");
    const loop = run(parse(["broadcast ping", "when I receive ping", "broadcast ping"]), grid());
    assert.match(loop.problems[0] ?? "", /too many times over/);
    assert.equal(run(parse(["when I receive go", "say hi"]), grid()).frames.length, 0);
});

test("a sensor reads a world the program's switches change, a minute for every wait", () => {
    const { sense, problems } = senseOf(["temp starts 15 changes -1 heater 2 least 0 most 40"]);
    assert.deepEqual(problems, []);
    const w = grid(1, 1, { sense });
    const code = [
        "repeat 20",
        "  if temp is less than 18",
        "    switch heater on",
        "  if temp is more than 21",
        "    switch heater off",
        "  wait 1",
    ];
    const p = parse(code),
        r = run(p, w);
    assert.equal(r.stopped, "end");
    assert.deepEqual(
        r.minutes.map((m) => m.values.temp),
        [15, 16, 17, 18, 19, 20, 21, 22, 21, 20, 19, 18, 17, 18, 19, 20, 21, 22, 21, 20, 19],
        "it warms by 1 a minute with the heater on and cools by 1 with it off",
    );
    assert.equal(outcome(r, p, w, "minutes"), 20);
    assert.equal(outcome(r, p, w, "minute(7).temp"), 22);
    assert.equal(outcome(r, p, w, "minute(7).heater"), "on");
    assert.equal(outcome(r, p, w, "minute(8).heater"), "off");
    assert.equal(outcome(r, p, w, "switched(heater)"), 4, "on, off, on and off again");
    assert.equal(outcome(r, p, w, "switched(heater, on)"), 2);
    assert.equal(outcome(r, p, w, "on(heater)"), "off");
    assert.equal(outcome(r, p, w, "lowest(temp)"), 15);
    assert.equal(outcome(r, p, w, "highest(temp)"), 22);
    assert.equal(outcome(r, p, w, "stays(temp, 17, 22)"), "yes");
    assert.equal(outcome(r, p, w, "stays(temp, 18, 21)"), "no");
    assert.equal(outcome(r, p, w, "value(temp)"), 19);
    const wait = r.frames.find((f) => f.kind === "rest");
    assert.equal(wait?.state.vars.temp, 16, "each frame keeps what the sensor read after it");
    assert.equal(wait?.state.on.heater, true);
    assert.match(
        run(parse(["set temp to 30"]), w).problems[0] ?? "",
        /what a sensor reads/,
        "a program asks about a sensor and cannot set it",
    );
});

test("a pump stops at a level, and daylight follows its readings", () => {
    const tank = grid(1, 1, { sense: senseOf(["level starts 0 pump 15 most 100"]).sense });
    const fill = parse([
        "switch pump on",
        "repeat until level is at least 80",
        "  wait 1",
        "switch pump off",
    ]);
    const r = run(fill, tank);
    assert.equal(outcome(r, fill, tank, "value(level)"), 90);
    assert.equal(outcome(r, fill, tank, "minutes"), 6);
    const day = grid(1, 1, { sense: senseOf(["daylight reads 9 7 5 3 1"]).sense });
    const lamp = parse([
        "repeat 6",
        "  if daylight is less than 4",
        "    switch lamp on",
        "  otherwise",
        "    switch lamp off",
        "  wait 1",
    ]);
    const night = run(lamp, day);
    assert.deepEqual(
        night.minutes.map((m) => m.values.daylight),
        [9, 7, 5, 3, 1, 1, 1],
        "the last reading holds",
    );
    assert.equal(
        outcome(night, lamp, day, "minute(3).lamp"),
        "off",
        "switched on only after it reads 3",
    );
    assert.equal(outcome(night, lamp, day, "minute(4).lamp"), "on");
    assert.deepEqual(senseOf(["light reads 1 2"]).problems.length, 1, "light is a block's word");
    assert.match(senseOf(["temp starts warm"]).problems[0] ?? "", /whole number/);
});
