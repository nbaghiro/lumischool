// The bead string: snake on squared paper, where the snake is a bead string and what it picks up is
// the next number in a count.
//
// The guide leads a string of beads round the paper. Numbers lie on the squares; only the next
// number in the count couples on, and when it does the string grows until it is that many beads
// long, so the string is always as long as the last number picked up and the jumps between the
// numbers it carries are the step of the count. The beads alternate in fives, the way the shelf's
// bead string does, so a length is read by its fives rather than counted from one. A number that is
// not next is passed over and stays where it is. Running into the edge or the string itself stops
// the guide until the child turns: nothing is lost, there is no clock and there are no lives, which
// are the refusals in .docs/activities.md applied to a game that moves on its own.
import { DIRS, opposite, type Dir, type Pad } from "../../engine/motion/pad";
import { seeded } from "../../engine/motion/spawn";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";

export interface SnakeLevel extends ActionLevel {
    cols: number;
    rows: number;
    /** The count goes up in this. */
    by: number;
    /** The last number of the count, which wins. */
    to: number;
    /** Squares a second. */
    speed: number;
    /** Numbers on the paper that are not in the count. */
    decoys: number[];
}

export const SNAKE_LEVELS: Levels<SnakeLevel> = [
    {
        title: "Count to ten",
        goal: "Pick up the numbers in order, from 1 to 10.",
        grades: [1, 1],
        cols: 24,
        rows: 14,
        by: 1,
        to: 10,
        speed: 3.2,
        decoys: [],
    },
    {
        title: "Count in threes",
        goal: "Pick up the threes in order, from 3 to 30.",
        grades: [2, 3],
        cols: 28,
        rows: 16,
        by: 3,
        to: 30,
        speed: 4.6,
        decoys: [10, 14, 20, 25, 28],
    },
];

interface Cell {
    x: number;
    y: number;
}
interface Card extends Cell {
    n: number;
}

export interface SnakeState {
    level: number;
    L: SnakeLevel;
    /**
     * Head first. The head is the guide; every cell after it is a bead. The head is its own member
     * because there is always one: a step pushes the new head on before it takes the tail off.
     */
    body: [Cell, ...Cell[]];
    /** Where each part was before the last move, so a frame can draw the glide between the two. */
    prev: Cell[];
    dir: Dir;
    queue: Dir[];
    /** Beads still owed to the string, added one a move at the tail. */
    grow: number;
    /** Squares the tail has just left, most recent first, so a string that picks up a number can grow back along them at once. */
    left: Cell[];
    /** The last number picked up, 0 before the first. */
    count: number;
    cards: Card[];
    /** Steps since the last move, and steps between moves. */
    tick: number;
    every: number;
    stopped: boolean;
    /** The number last passed over that was not next, so it is said once rather than every step. */
    passed: number | null;
    said: string;
    /** The step the sentence was said at, so it stays up long enough to be read and then goes. */
    saidAt: number;
    steps: number;
    bumps: number;
    won: boolean;
}

const RATE = 60;
const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

export function start(level: number, seed = 1): SnakeState {
    const L = SNAKE_LEVELS[level] ?? SNAKE_LEVELS[0];
    const rnd = seeded(seed * 7919 + level);
    const head = { x: 3, y: Math.floor(L.rows / 2) };
    const taken: Cell[] = [head, { x: 4, y: head.y }, { x: 5, y: head.y }, { x: 6, y: head.y }];
    const cards: Card[] = [];
    const numbers = [...Array.from({ length: L.to / L.by }, (_, i) => (i + 1) * L.by), ...L.decoys];
    for (const n of numbers) {
        // A card is never on the edge, never next to another card, and never on the first run of road.
        for (let tries = 0; tries < 500; tries++) {
            const c = {
                x: 1 + Math.floor(rnd() * (L.cols - 2)),
                y: 1 + Math.floor(rnd() * (L.rows - 2)),
            };
            if (taken.some((t) => Math.abs(t.x - c.x) < 2 && Math.abs(t.y - c.y) < 2)) continue;
            cards.push({ ...c, n });
            taken.push(c);
            break;
        }
    }
    return {
        level,
        L,
        body: [head],
        prev: [head],
        dir: "right",
        queue: [],
        grow: 0,
        left: [],
        count: 0,
        cards,
        tick: 0,
        every: Math.max(1, Math.round(RATE / L.speed)),
        stopped: false,
        passed: null,
        said: "",
        saidAt: 0,
        steps: 0,
        bumps: 0,
        won: false,
    };
}

function tell(s: SnakeState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

const next = (s: SnakeState) => s.count + s.L.by;

function blocked(s: SnakeState, c: Cell): boolean {
    if (c.x < 0 || c.y < 0 || c.x >= s.L.cols || c.y >= s.L.rows) return true;
    // The tail moves out of the way this move unless the string is still growing.
    const body = s.grow > 0 ? s.body : s.body.slice(0, -1);
    return body.some((b) => same(b, c));
}

/** Turns asked for since the last move, kept in order, without turning straight back into the string. */
function listen(s: SnakeState, pad: Pad): void {
    const last = () => s.queue[s.queue.length - 1] ?? s.dir;
    for (const d of pad.pressed)
        if (s.queue.length < 3 && d !== last() && (s.body.length < 2 || !opposite(d, last())))
            s.queue.push(d);
    if (
        pad.held &&
        !s.queue.length &&
        pad.held !== s.dir &&
        (s.body.length < 2 || !opposite(pad.held, s.dir))
    )
        s.queue.push(pad.held);
}

export function step(s: SnakeState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    if (s.won) return out;
    s.steps++;
    listen(s, pad);
    if (s.stopped) {
        if (!s.queue.length) return out;
        s.stopped = false;
        s.tick = s.every;
    }
    if (++s.tick < s.every) return out;
    s.tick = 0;
    if (s.queue.length) s.dir = s.queue.shift() ?? s.dir;
    const head = s.body[0];
    const to = { x: head.x + DIRS[s.dir].x, y: head.y + DIRS[s.dir].y };
    if (blocked(s, to)) {
        s.stopped = true;
        s.bumps++;
        s.prev = s.body.map((c) => ({ ...c }));
        tell(
            s,
            to.x < 0 || to.y < 0 || to.x >= s.L.cols || to.y >= s.L.rows
                ? "That is the edge of the paper. Turn to go on."
                : "That is the string. Turn to go on.",
        );
        out.push({ cue: "bump" }, { shake: 0.25 });
        return out;
    }
    s.prev = s.body.map((c) => ({ ...c }));
    s.body.unshift(to);
    if (s.steps - s.saidAt > RATE * 2.5) s.said = "";
    if (s.grow > 0) {
        s.grow--;
        // The new bead grows out of where the tail was, which for a string with no beads is the head.
        s.prev.push({ ...(s.prev[s.prev.length - 1] ?? to) });
    } else {
        const gone = s.body.pop();
        if (gone) s.left = [gone, ...s.left].slice(0, s.L.by + 1);
    }
    const card = s.cards.find((c) => same(c, to));
    if (card && card.n === next(s)) {
        s.count = card.n;
        // The string grows at once, back along the squares the tail has just left, so it is as long
        // as the number the moment the number is picked up. Whatever cannot fit is owed.
        let owed = s.L.by;
        while (owed > 0) {
            const back = s.left[0];
            if (!back || s.body.some((b) => same(b, back))) break;
            s.left.shift();
            s.body.push(back);
            s.prev.push({ ...back });
            owed--;
        }
        s.left = [];
        s.grow += owed;
        s.cards = s.cards.filter((c) => c !== card);
        s.passed = null;
        out.push({ cue: "place" }, { puff: { x: to.x + 0.5, y: to.y + 0.5, n: 6 } });
        if (s.count >= s.L.to) {
            s.won = true;
            tell(s, `${s.count}, and the string is ${s.count} beads long.`);
            out.push({ cue: "win" });
        } else tell(s, `${s.count}. Next is ${next(s)}.`);
    } else if (card && card.n !== s.passed) {
        s.passed = card.n;
        tell(s, `${card.n} is not next. Next is ${next(s)}.`);
        out.push({ cue: "nope" });
    }
    return out;
}

/** Bead k, counting from one at the guide's end, is orange in the first five, blue in the next five, and so on. */
export const beadColour = (k: number): "tang" | "sky" =>
    Math.floor((k - 1) / 5) % 2 === 0 ? "tang" : "sky";

/** A bead cropped out of the shelf's bead string: its first bead is orange and its sixth is blue. */
const BEAD = { tang: { x: 1, y: 1.5, w: 1, h: 1 }, sky: { x: 6, y: 1.5, w: 1, h: 1 } };

export function frame(s: SnakeState, rest = false): Frame {
    const u = rest || s.stopped ? 1 : Math.min(1, s.tick / s.every);
    // Bead i between where it was and where it is. An index past the string reads as the guide,
    // which is where a bead that is not on the string yet comes from.
    const at = (i: number): { x: number; y: number } => {
        const b = s.body[i] ?? s.body[0],
            a = s.prev[i] ?? b;
        return { x: a.x + (b.x - a.x) * u + 0.5, y: a.y + (b.y - a.y) * u + 0.5 };
    };
    const sprites: Sprite[] = [];
    const marks: Mark[] = [];
    for (const c of s.cards) {
        sprites.push({
            key: `card:${c.n}`,
            art: "digitcards",
            params: { digits: [c.n], picked: [] },
            seed: 300 + c.n,
            crop: { x: 0.5, y: 1, w: 3, h: 4 },
            size: 1.3,
            x: c.x + 0.5,
            y: c.y + 0.5,
            z: 1,
            still: true,
        });
    }
    // Beads are drawn from the tail up so the guide's end sits on top.
    for (let i = s.body.length - 1; i >= 1; i--) {
        const p = at(i),
            colour = beadColour(i);
        const a = at(i - 1);
        sprites.push({
            key: `bead:${i}`,
            art: "beadstring",
            params: { beads: 10, mark: 0 },
            seed: 41,
            crop: BEAD[colour],
            x: p.x,
            y: p.y,
            angle: Math.atan2(a.y - p.y, a.x - p.x),
            z: 2,
        });
        if (i % s.L.by === 0 && i <= s.count)
            marks.push({ kind: "word", x: p.x, y: p.y + 0.95, text: String(i), size: 0.62 });
    }
    const h = at(0);
    sprites.push({
        key: "head",
        art: "guide.firefly",
        params: { pose: s.won ? "cheer" : s.stopped ? "point" : "idle" },
        seed: 7,
        size: 1.9,
        x: h.x,
        y: h.y - 0.1,
        z: 3,
        flip: s.dir === "left",
    });
    const w = s.L.cols,
        hh = s.L.rows;
    marks.push(
        { kind: "line", a: { x: 0, y: 0 }, b: { x: w, y: 0 } },
        { kind: "line", a: { x: w, y: 0 }, b: { x: w, y: hh } },
        { kind: "line", a: { x: w, y: hh }, b: { x: 0, y: hh } },
        { kind: "line", a: { x: 0, y: hh }, b: { x: 0, y: 0 } },
    );
    return {
        sprites,
        marks,
        camera: { x: w / 2, y: hh / 2 },
        view: { w, h: hh },
        world: { w, h: hh },
    };
}

const words = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function say(s: SnakeState): string {
    const head = s.body[0];
    const beads = s.body.length - 1;
    const want = s.cards.find((c) => c.n === next(s));
    const where = want
        ? [
              want.x > head.x
                  ? words(want.x - head.x, "square right", "squares right")
                  : want.x < head.x
                    ? words(head.x - want.x, "square left", "squares left")
                    : "",
              want.y > head.y
                  ? words(want.y - head.y, "square down", "squares down")
                  : want.y < head.y
                    ? words(head.y - want.y, "square up", "squares up")
                    : "",
          ]
              .filter(Boolean)
              .join(" and ")
        : "";
    const base = s.won
        ? `The string is ${words(beads, "bead", "beads")} long and the count is finished.`
        : `The string is ${words(beads, "bead", "beads")} long. The next number is ${next(s)}${where ? `, ${where}` : ""}.`;
    return s.said ? `${s.said} ${base}` : base;
}

export const snakeGame: ActionGame<SnakeState> = {
    id: "snake",
    title: "Bead string",
    group: "action",
    levels: SNAKE_LEVELS,
    rate: RATE,
    cover: { art: "beadstring", params: { beads: 10, mark: 7 } },
    hint: "Arrow keys, a swipe on the paper, or the arrows below to turn",
    controls: { arrows: { up: "Up", down: "Down", left: "Left", right: "Right" } },
    start,
    step,
    frame,
    say,
    note: (s) => s.said,
    won: (s) => s.won,
    still: { press: (s) => s.every },
};
