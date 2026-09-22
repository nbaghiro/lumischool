// The nine mechanics, one case each for the rule that makes the mechanic what it is: the thing a
// child has to see is the thing the mechanic refuses to do for them. The cases every mechanic has to
// pass, that a position is never changed in place and always reads as a sentence, come first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIVITIES } from "../activities";
import { bind } from "../games";
import { explore, prove } from "../prove";
import { jump, type JumpVersion } from "../jump";
import { pay, wanted, type PayVersion } from "../pay";
import { pour, type PourPos, type PourVersion } from "../pour";
import { race, swept, CELL, type RacePos, type RaceVersion } from "../race";
import { distinguishable, label, rule, run, type RuleVersion } from "../rule";
import { share, type SharePos, type ShareVersion } from "../share";
import { shunt, CAR, SPUR, type ShuntVersion } from "../shunt";
import { spell, spellings, type SpellVersion } from "../spell";
import { weigh, type WeighPos, type WeighVersion } from "../weigh";
import { CELL as CIRCUIT_CELL } from "../../../engine/parts/sport/racecircuit";
import { CAR as YARD_CAR, SPUR as YARD_SPUR } from "../../../engine/parts/travel/yard";

test("a move does not change the position it was given, which is what makes undo free", () => {
    const a = ACTIVITIES[0];
    assert.ok(a);
    const r = a.round(0);
    const before = r.start.say;
    const boardBefore = JSON.stringify(r.start.board);
    const first = r.start.moves[0];
    assert.ok(first);
    first.next();
    assert.equal(r.start.say, before);
    assert.equal(JSON.stringify(r.start.board), boardBefore);
});

test("the same move always leads to the same position", () => {
    for (const a of ACTIVITIES) {
        const r = a.round(0);
        for (const m of r.start.moves) assert.equal(m.next().key, m.next().key, `${a.id} ${m.say}`);
    }
});

test("a won position offers no moves, so a round cannot be played past its end", () => {
    for (const a of ACTIVITIES) {
        const r = a.round(0);
        const ex = explore(r);
        for (const node of ex.nodes.values()) {
            if (node.pos.won) assert.equal(node.pos.moves.length, 0, a.id);
        }
    }
});

test("every position has a text form and every move reads as a sentence", () => {
    for (const a of ACTIVITIES) {
        for (let v = 0; v < a.versions.length; v++) {
            const r = a.round(v);
            for (const node of explore(r).nodes.values()) {
                assert.ok(
                    node.pos.say.trim().length > 8,
                    `${a.id} ${node.pos.key}: "${node.pos.say}"`,
                );
                for (const m of node.pos.moves)
                    assert.ok(m.say.trim().length > 3, `${a.id} ${m.say}`);
            }
        }
    }
});

test("every board part names a drawing and passes it parameters", () => {
    for (const a of ACTIVITIES) {
        for (let v = 0; v < a.versions.length; v++) {
            const r = a.round(v);
            for (const node of explore(r).nodes.values()) {
                assert.ok(node.pos.board.parts.length, `${a.id} draws nothing`);
                for (const part of node.pos.board.parts) {
                    assert.match(part.art, /^[a-z][a-z0-9.]*$/, `${a.id} art "${part.art}"`);
                    assert.equal(typeof part.params, "object");
                }
            }
        }
    }
});

test("the balance never holds more props than the drawing can take", () => {
    const a = ACTIVITIES[0];
    assert.ok(a);
    for (let v = 0; v < a.versions.length; v++) {
        for (const node of explore(a.round(v)).nodes.values()) {
            for (const part of node.pos.board.parts) {
                for (const side of ["left", "right"] as const) {
                    const held = part.params[side];
                    assert.ok(
                        Array.isArray(held) && held.length <= 6,
                        `${side} pan holds ${JSON.stringify(held)}`,
                    );
                }
            }
        }
    }
});

test("weighing is only won when the beam is level with something in both pans", () => {
    const v: WeighVersion = {
        fixed: ["cube"],
        tray: { ball: 4 },
        worth: { cube: 6, ball: 2 },
        pans: "right",
        capacity: 6,
    };
    const s = weigh.start(v);
    assert.equal(weigh.won(s, v), false, "an empty right pan is not level");
    const three = [0, 1, 2].reduce<WeighPos>(
        (acc) => weigh.apply(acc, { take: false, kind: "ball", pan: "right" }, v),
        s,
    );
    assert.equal(weigh.won(three, v), true, "three balls make six");
    const four = weigh.apply(three, { take: false, kind: "ball", pan: "right" }, v);
    assert.equal(weigh.won(four, v), false);
});

test("a card the line cannot take is not offered, which is where the arithmetic is", () => {
    const v: JumpVersion = { from: 0, to: 10, step: 1, start: 9, target: 10, cards: [1, 5, -10] };
    const offered = jump.moves(jump.start(v), v).map((m) => m.n);
    assert.deepEqual(offered, [1], "+5 would pass 10 and -10 would pass 0");
});

test("the number line draws the jumps taken, and two routes to the same place play the same", () => {
    const v: JumpVersion = { from: 0, to: 10, step: 1, start: 0, target: 3, cards: [1, 2] };
    const a = jump.apply(jump.apply(jump.start(v), { n: 1 }, v), { n: 2 }, v);
    const b = jump.apply(jump.apply(jump.start(v), { n: 2 }, v), { n: 1 }, v);
    assert.equal(jump.key(a), jump.key(b), "the same future, so the same key");
    const drawn = (s: typeof a) => jump.board(s, v).parts[0]?.params.jumps;
    assert.notDeepEqual(drawn(a), drawn(b), "and a different picture, because the route is drawn");
});

test("the machine cannot be guessed before anything has been fed in", () => {
    const v: RuleVersion = {
        cards: [
            { op: "add", a: 1 },
            { op: "add", a: 2 },
        ],
        answer: 0,
        inputs: [1, 2],
    };
    assert.ok(
        rule.moves(rule.start(v), v).every((m) => "feed" in m),
        "only feeds at the start",
    );
    const fed = rule.apply(rule.start(v), { feed: 1 }, v);
    assert.ok(
        rule.moves(fed, v).some((m) => "name" in m),
        "and naming opens up once something is known",
    );
});

test("a rule reads and runs the way it is written", () => {
    assert.equal(label({ op: "muladd", a: 2, b: 1 }), "× 2 + 1");
    assert.equal(label({ op: "muladd", a: 3, b: -1 }), "× 3 - 1");
    assert.equal(run({ op: "muladd", a: 3, b: -1 }, 4), 11);
    assert.equal(run({ op: "mul", a: 10 }, 3), 30);
});

test("two rules that no input can separate are reported by the mechanic's own check", () => {
    const twins: RuleVersion = {
        cards: [
            { op: "add", a: 0 },
            { op: "mul", a: 1 },
        ],
        answer: 0,
        inputs: [1, 2],
    };
    assert.equal(distinguishable(twins, []), false, "+ 0 and x 1 are the same machine");
    assert.ok(rule.audit?.(twins).length, "so the audit says so");
});

const LANE: RaceVersion = {
    track: ["S#########F"],
    from: [0, 0],
    finish: "stop",
    top: 3,
    look: "lanes",
    metres: 100,
    around: [],
};

test("at three cells a turn the stop has to be planned, and the line is reached too fast to take", () => {
    // Two cells from the finish at a speed of three. Slowing to two lands on the line exactly, which
    // is the trap: the car is on the finish and still moving, and every move from there leaves the
    // track, so the round ends without a win. The mistake was made three turns earlier.
    const fast: RacePos = { x: 8, y: 0, vx: 3, vy: 0, lap: true, done: false, trail: [] };
    const only = race.moves(fast, LANE);
    assert.deepEqual(
        only.map((m) => m.vx),
        [2],
        "faster and holding both leave the track",
    );
    const slower = only[0];
    assert.ok(slower);
    const onTheLine = race.apply(fast, slower, LANE);
    assert.equal(onTheLine.x, 10);
    assert.equal(race.won(onTheLine, LANE), false, "on the line at two is not stopped on the line");
    assert.deepEqual(race.moves(onTheLine, LANE), [], "and there is nowhere left to go");
    // Coming in at one, braking to nought is the win.
    const slow: RacePos = { ...fast, x: 10, vx: 1 };
    const braked = race.apply(slow, { dx: -1, dy: 0, vx: 0, vy: 0 }, LANE);
    assert.equal(race.won(braked, LANE), true);
});

test("the cells a turn passes through are the cells that have to be track", () => {
    assert.deepEqual(swept(0, 0, 3, 0), [
        [1, 0],
        [2, 0],
        [3, 0],
    ]);
    assert.deepEqual(swept(0, 0, 2, 2), [
        [1, 1],
        [2, 2],
    ]);
    assert.deepEqual(swept(1, 1, 1, 1), []);
});

test("the finish does not count until the lap marker is behind the car", () => {
    const ring: RaceVersion = {
        track: ["#C#", "#.#", "FS#"],
        from: [1, 2],
        finish: "reach",
        top: 1,
        look: "circuit",
        metres: 0,
        around: [],
    };
    const start = race.start(ring);
    assert.equal(start.lap, false, "there is a marker, so the lap starts unfinished");
    const west = race.apply(start, { dx: -1, dy: 0, vx: -1, vy: 0 }, ring);
    assert.equal(west.x, 0, "that is the finish band");
    assert.equal(race.won(west, ring), false, "and it does not count yet");
});

test("the siding is a stack, so the carriage pushed in first is the one that comes out last", () => {
    const v: ShuntVersion = {
        train: ["1", "2", "3"],
        order: ["3", "2", "1"],
        siding: 3,
        windows: 2,
    };
    let s = shunt.start(v);
    s = shunt.apply(s, { do: "in" }, v);
    s = shunt.apply(s, { do: "in" }, v);
    assert.deepEqual(s.spur, ["3", "2"]);
    s = shunt.apply(s, { do: "out" }, v);
    assert.deepEqual(s.line, ["1", "2"], "2 came back out, not 3");
    // Reversing needs the other end: pushing in from one end and pulling out at the other turns the
    // train round, which is the move a child has to find.
    let t = shunt.start(v);
    for (let i = 0; i < 3; i++) t = shunt.apply(t, { do: "in" }, v);
    t = shunt.apply(t, { do: "round" }, v);
    for (let i = 0; i < 3; i++) t = shunt.apply(t, { do: "out" }, v);
    assert.deepEqual(t.line, ["3", "2", "1"]);
    assert.equal(shunt.won(t, v), true);
});

test("pouring moves as much as the other jug will take and not a drop more", () => {
    const v: PourVersion = {
        jugs: [
            { max: 5, step: 1 },
            { max: 3, step: 1 },
        ],
        target: 4,
        unit: "l",
    };
    const full = pour.apply(pour.start(v), { fill: 0 }, v);
    assert.deepEqual(full.level, [5, 0]);
    const poured = pour.apply(full, { from: 0, to: 1 }, v);
    assert.deepEqual(poured.level, [2, 3], "three went across and two stayed behind");
    // A pour that would move nothing is not a move at all: not out of an empty jug, and not into a
    // full one.
    const pours = (s: PourPos): string[] =>
        pour.moves(s, v).flatMap((m) => ("from" in m ? [`${m.from}->${m.to}`] : []));
    assert.deepEqual(
        pours(poured),
        ["1->0"],
        "B still has three and A has room; A cannot pour into a full B",
    );
    assert.deepEqual(pours({ level: [0, 3] }), ["1->0"]);
    assert.deepEqual(pours({ level: [0, 0] }), []);
});

test("the counter holds what the version allows, which is what stops the price being paid in pennies", () => {
    const v: PayVersion = {
        price: 65,
        paid: 0,
        drawer: { quarter: 3, dime: 4, nickel: 3, penny: 5 },
        most: 4,
    };
    assert.equal(wanted(v), 65);
    let s = pay.start(v);
    for (const piece of ["quarter", "quarter", "dime", "nickel"] as const) {
        s = pay.apply(s, { take: true, piece }, v);
    }
    assert.equal(pay.won(s, v), true, "25 and 25 and 10 and 5");
    assert.ok(
        pay.moves(s, v).every((m) => !m.take),
        "the counter is full, so only a coin going back is left",
    );
    // A drawer of dimes and pennies can reach 65 and not in eight pieces, and the refusal says so
    // rather than leaving the prover to report that nothing wins.
    const pennies: PayVersion = { ...v, most: 8, drawer: { penny: 9, dime: 9 } };
    assert.ok(
        pay.accepts(pennies).some((p) => p.includes("cannot be made")),
        pay.accepts(pennies).join("; "),
    );
});

test("a plate holds one whole, and two plates the other way round are the same position", () => {
    const v: ShareVersion = { pieces: [2, 2, 1, 1, 1, 1], whole: 4, names: ["Ann", "Ben"] };
    const start = share.start(v);
    const ann = share.apply(start, { size: 2, plate: 0, off: false }, v);
    const ben = share.apply(start, { size: 2, plate: 1, off: false }, v);
    assert.equal(share.key(ann), share.key(ben), "who has the half does not change the future");
    // A plate with three quarters on it is not offered a half, because a plate holds one whole.
    const nearly: SharePos = { plates: [[1, 1, 1], []], tray: [2, 2, 1] };
    assert.ok(!share.moves(nearly, v).some((m) => !m.off && m.plate === 0 && m.size === 2));
    assert.ok(share.moves(nearly, v).some((m) => !m.off && m.plate === 0 && m.size === 1));
});

test("a set of tiles that spells the word two ways is refused, because both would be right", () => {
    assert.equal(spellings("star", ["s", "t", "ar"], 3), 1);
    // With "a" and "r" as well, three boxes still only have one answer, because s t a r is four.
    assert.equal(spellings("star", ["s", "t", "ar", "a", "r"], 3), 1);
    assert.equal(spellings("star", ["s", "t", "ar", "a", "r"], 4), 1);
    // "st" as a tile is the broken case: st a r and s t ar both fill three boxes.
    assert.equal(spellings("star", ["s", "t", "ar", "st", "a", "r"], 3), 2);
    const twoWays: SpellVersion = {
        sounds: ["s", "t", "ar"],
        tiles: ["s", "t", "ar", "st", "a", "r"],
        word: "star",
        picture: { art: "prop.star", params: {} },
    };
    assert.ok(
        spell.accepts(twoWays).some((p) => p.includes("different ways")),
        spell.accepts(twoWays).join("; "),
    );
});

test("the numbers a mechanic places its drawings on are the numbers those drawings are built on", () => {
    // Two mechanics lay parts out in squares on a shared sheet, and the spacing has to be the cell
    // the drawing itself uses. A mechanic states its own numbers rather than reading a drawing, so
    // the constants are written twice and this is what keeps the two copies the same number.
    assert.equal(CELL, CIRCUIT_CELL, "the race cell and the circuit drawing's cell");
    assert.equal(CAR, YARD_CAR, "the carriage length the yard spaces its places by");
    assert.equal(SPUR, YARD_SPUR, "how far below the main line the siding is drawn");
});

test("the mechanic refuses a fill that is legal in shape and nonsense in content", () => {
    const bad: [string, () => string[]][] = [
        [
            "a left pan nothing in the tray can match",
            () =>
                weigh.accepts({
                    fixed: ["cube"],
                    tray: { star: 2 },
                    worth: { cube: 40, star: 1 },
                    pans: "right",
                    capacity: 6,
                }),
        ],
        [
            "a tray whose lightest prop is heavier than the target",
            () =>
                weigh.accepts({
                    fixed: ["star"],
                    tray: { cube: 2 },
                    worth: { star: 1, cube: 9 },
                    pans: "right",
                    capacity: 6,
                }),
        ],
        [
            "a flag that is not on the line",
            () => jump.accepts({ from: 0, to: 10, step: 1, start: 0, target: 14, cards: [3, 4] }),
        ],
        [
            "a card that is not a whole number of steps",
            () => jump.accepts({ from: 0, to: 20, step: 2, start: 0, target: 10, cards: [3, 4] }),
        ],
        [
            "a hand of one card",
            () => jump.accepts({ from: 0, to: 10, step: 1, start: 0, target: 4, cards: [4] }),
        ],
        [
            "too few cards to make a guess cost anything",
            () =>
                rule.accepts({
                    cards: [
                        { op: "add", a: 1 },
                        { op: "add", a: 2 },
                    ],
                    answer: 0,
                    inputs: [1, 2],
                }),
        ],
        [
            "two cards that read the same",
            () =>
                rule.accepts({
                    cards: [
                        { op: "add", a: 1 },
                        { op: "add", a: 1 },
                        { op: "mul", a: 2 },
                        { op: "mul", a: 3 },
                    ],
                    answer: 0,
                    inputs: [1, 2],
                }),
        ],
        [
            "a lanes track the scale under it would not fit",
            () => race.accepts({ ...LANE, track: ["S###F"] }),
        ],
        ["a car that starts on the finish", () => race.accepts({ ...LANE, from: [10, 0] })],
        [
            "an order made of different carriages",
            () => shunt.accepts({ train: ["1", "2"], order: ["1", "3"], siding: 1, windows: 2 }),
        ],
        [
            "jugs that can never measure the target",
            () =>
                pour.accepts({
                    jugs: [
                        { max: 4, step: 1 },
                        { max: 6, step: 1 },
                    ],
                    target: 3,
                    unit: "l",
                }),
        ],
        [
            "pieces that will not share evenly",
            () => share.accepts({ pieces: [2, 1, 1, 1], whole: 4, names: ["Ann", "Ben"] }),
        ],
        [
            "a word with no tile for one of its sounds",
            () =>
                spell.accepts({
                    sounds: ["b", "u", "s"],
                    tiles: ["b", "u", "d", "o"],
                    word: "bus",
                    picture: { art: "bus", params: {} },
                }),
        ],
        [
            "a rule that would show a negative number",
            () =>
                rule.accepts({
                    cards: [
                        { op: "add", a: 1 },
                        { op: "muladd", a: 1, b: -8 },
                        { op: "mul", a: 2 },
                        { op: "mul", a: 3 },
                    ],
                    answer: 1,
                    inputs: [1, 2],
                }),
        ],
    ];
    for (const [why, refuse] of bad) {
        const problems = refuse();
        assert.ok(problems.length, `a fill with ${why} was accepted`);
        for (const p of problems)
            assert.ok(p.length > 20, `"${p}" does not say enough to repair it`);
    }
});

test("the fills the activities actually use are accepted", () => {
    for (const a of ACTIVITIES) {
        for (let v = 0; v < a.versions.length; v++) {
            assert.deepEqual(a.round(v).accepts(), [], `${a.id} v${v}`);
        }
    }
});

test("a refused fill fails the gate, and says why rather than saying it cannot be won", () => {
    const nonsense = bind(
        weigh,
        {
            id: "test.bad",
            title: "Bad",
            kind: "weigh",
            skills: [],
            grades: [1, 1],
            paper: "x",
            versions: [
                {
                    values: "unmatchable",
                    v: {
                        fixed: ["cube"],
                        tray: { star: 1 },
                        worth: { cube: 40, star: 1 },
                        pans: "right",
                        capacity: 6,
                    },
                },
            ],
        },
        0,
    );
    const p = prove(nonsense);
    assert.equal(p.ok, false);
    assert.ok(p.problems[0]?.includes("cannot reach"), p.problems.join("; "));
});
