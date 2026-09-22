// The bead string: the string is as long as the count, the beads alternate in fives, and the paper
// is the same paper for the same seed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DIRS, emptyPad, spent, type Dir } from "../../../engine/motion/pad";
import {
    beadColour,
    snakeGame,
    SNAKE_LEVELS,
    start as startSnake,
    step as stepSnake,
    type SnakeState,
} from "../snake";

/** The first step of the shortest way to the next number, around the string, or null. */
function towards(s: SnakeState): Dir | null {
    const want = s.cards.find((c) => c.n === s.count + s.L.by);
    if (!want) return null;
    const key = (x: number, y: number) => y * s.L.cols + x;
    const blocked = new Set(s.body.slice(0, -1).map((c) => key(c.x, c.y)));
    const from = new Map<number, [number, Dir]>();
    const q: [number, number][] = [[s.body[0].x, s.body[0].y]];
    const seen = new Set([key(s.body[0].x, s.body[0].y)]);
    while (q.length) {
        const [x, y] = q.shift() ?? [0, 0];
        if (x === want.x && y === want.y) break;
        for (const d of Object.keys(DIRS) as Dir[]) {
            const nx = x + DIRS[d].x,
                ny = y + DIRS[d].y,
                k = key(nx, ny);
            if (
                nx < 0 ||
                ny < 0 ||
                nx >= s.L.cols ||
                ny >= s.L.rows ||
                seen.has(k) ||
                blocked.has(k)
            )
                continue;
            seen.add(k);
            from.set(k, [key(x, y), d]);
            q.push([nx, ny]);
        }
    }
    let k = key(want.x, want.y),
        first: Dir | null = null;
    for (let hop = from.get(k); hop; hop = from.get(k)) {
        first = hop[1];
        k = hop[0];
    }
    return first;
}

function playSnake(
    level: number,
    seed = 1,
): { s: SnakeState; lengths: [number, number][]; steps: number } {
    const s = startSnake(level, seed),
        pad = emptyPad(),
        lengths: [number, number][] = [];
    let steps = 0;
    while (!s.won && steps < 60 * 300) {
        if (s.tick === s.every - 1 || s.stopped) {
            const d = towards(s);
            if (d) pad.pressed.push(d);
        }
        const had = s.count;
        stepSnake(s, pad);
        spent(pad);
        steps++;
        if (s.count !== had) lengths.push([s.count, s.body.length - 1 + s.grow]);
    }
    return { s, lengths, steps };
}

test("the bead string is as long as the last number picked up, at both levels", () => {
    for (const [level, L] of SNAKE_LEVELS.entries()) {
        const { s, lengths } = playSnake(level);
        assert.ok(s.won, `level ${level + 1} is not won`);
        assert.equal(s.body.length - 1, L.to, "the string at the end is as long as the count");
        for (const [count, beads] of lengths)
            assert.equal(beads, count, `after ${count} the string owes or has ${beads} beads`);
        assert.deepEqual(
            lengths.map(([c]) => c),
            Array.from({ length: L.to / L.by }, (_, i) => (i + 1) * L.by),
            "the count went in order",
        );
    }
});

test("the beads alternate in fives, the way the shelf's bead string does", () => {
    assert.deepEqual(
        Array.from({ length: 12 }, (_, i) => beadColour(i + 1)[0]).join(""),
        "tttttssssstt",
    );
});

test("the same seed lays out the same paper, and every number is on it once", () => {
    const a = startSnake(1, 5),
        b = startSnake(1, 5),
        c = startSnake(1, 6);
    assert.deepEqual(a.cards, b.cards);
    assert.notDeepEqual(a.cards, c.cards);
    const L = SNAKE_LEVELS[1];
    assert.ok(L, "there is a second level");
    assert.deepEqual(
        a.cards.map((x) => x.n).sort((p, q) => p - q),
        [...Array.from({ length: L.to / L.by }, (_, i) => (i + 1) * L.by), ...L.decoys].sort(
            (p, q) => p - q,
        ),
    );
});

test("a number that is not next is passed over, stays on the paper, and is said", () => {
    const s = startSnake(1, 1),
        pad = emptyPad();
    const head = s.body[0];
    s.cards.push({ x: head.x + 1, y: head.y, n: 14 });
    for (let i = 0; i < s.every; i++) {
        stepSnake(s, pad);
        spent(pad);
    }
    assert.equal(s.body[0].x, head.x + 1);
    assert.equal(s.count, 0);
    assert.ok(s.cards.some((c) => c.n === 14 && c.x === head.x + 1));
    assert.match(snakeGame.say(s), /14 is not next\. Next is 3\./);
});

test("running into the edge stops the guide and loses nothing, and a turn goes on", () => {
    const s = startSnake(0, 1),
        pad = emptyPad();
    pad.pressed.push("up");
    let steps = 0;
    while (!s.stopped && steps++ < 60 * 20) {
        stepSnake(s, pad);
        spent(pad);
    }
    assert.ok(s.stopped);
    assert.equal(s.body[0].y, 0);
    const before = JSON.stringify([s.body, s.count, s.cards]);
    for (let i = 0; i < 30; i++) {
        stepSnake(s, pad);
        spent(pad);
    }
    assert.equal(
        JSON.stringify([s.body, s.count, s.cards]),
        before,
        "waiting at the edge changes nothing",
    );
    pad.pressed.push("right");
    stepSnake(s, pad);
    spent(pad);
    assert.ok(!s.stopped);
    assert.equal(s.body[0].x, 4);
});

test("under reduced motion one press moves the bead string one square", () => {
    const s = startSnake(0, 1),
        pad = emptyPad();
    pad.pressed.push("down");
    const n = snakeGame.still.press(s);
    for (let i = 0; i < n; i++) {
        stepSnake(s, pad);
        spent(pad);
    }
    assert.deepEqual(s.body[0], { x: 3, y: SNAKE_LEVELS[0].rows / 2 + 1 });
});
