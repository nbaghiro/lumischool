// Penny shove: pull a coin back and let it go, until the felt holds the price.
//
// The coins wait in piles at one end of a counter with a rim, behind a line, and a square of felt at
// the other end is the box. A coin pulled back and let go slides with the pull's strength and stops,
// knocking any coin in its way, so a hard shove can put one coin in and knock another out. The felt's
// total is written beside it in chalk, and a round is won when it comes to the price, in no more
// pieces than the felt takes, with everything still. Which coins to send is the mathematics: making
// an amount, making it in few coins, and making the change. A coin that stops short of the line goes
// back to its pile, and a tap on a coin on the counter sends it home, so nothing is ever lost. See
// .docs/games.md.
import type { Pt } from "../../engine/motion/geometry";
import { slideDistance } from "../../engine/motion/slide";
import { knob } from "../../engine/motion/tune";
import { bodies, type Bodies, type Body } from "../../engine/motion/bodies";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";
import { WORTH, type Piece, type Tray } from "./pay";

export interface ShoveLevel extends ActionLevel {
    /** What the tag says, in cents. */
    price: number;
    /** What was handed over, in cents, or nought when the felt is to hold the price itself. */
    paid: number;
    drawer: Tray;
    /** The most pieces the felt may hold for the round to be won. */
    most: number;
    /** How much of the way to where a shove would stop its aim shows, from nought to one. */
    aim: number;
    /** What the receipt says was bought. */
    item: string;
    /** The line over the field until the first coin is picked up. */
    prompt: string;
}

const MAKE = { quarter: 3, dime: 4, nickel: 3, penny: 5 };

export const SHOVE_LEVELS: Levels<ShoveLevel> = [
    {
        title: "Ten cents",
        grades: [1, 1],
        goal: "Shove coins onto the felt until it holds 10 cents.",
        prompt: "Pull a coin back and let go. Make 10¢ on the felt.",
        price: 10,
        paid: 0,
        drawer: { dime: 1, nickel: 2, penny: 6 },
        most: 10,
        aim: 1,
        item: "Sticker",
    },
    {
        title: "Twenty-five cents in three coins",
        grades: [1, 2],
        goal: "Make 25 cents on the felt with 3 coins or fewer.",
        prompt: "Make 25¢ on the felt, with 3 coins or fewer.",
        price: 25,
        paid: 0,
        drawer: { quarter: 1, dime: 2, nickel: 3, penny: 5 },
        most: 3,
        aim: 1,
        item: "Pencil",
    },
    {
        title: "65 cents in four coins",
        grades: [1, 2],
        goal: "Make 65 cents on the felt with 4 coins or fewer.",
        prompt: "Make 65¢ on the felt, with 4 coins or fewer.",
        price: 65,
        paid: 0,
        drawer: { ...MAKE },
        most: 4,
        aim: 0.8,
        item: "Apple",
    },
    {
        title: "Change from a dollar",
        grades: [2, 3],
        goal: "The sweets cost 48 cents and a dollar was paid. Put the change on the felt, in 5 coins or fewer.",
        prompt: "48¢, and a dollar was paid. Put the change on the felt.",
        price: 48,
        paid: 100,
        drawer: { ...MAKE },
        most: 5,
        aim: 0.6,
        item: "Change",
    },
    {
        title: "99 cents",
        grades: [2, 3],
        goal: "Make 99 cents on the felt with 9 coins or fewer.",
        prompt: "Make 99¢ on the felt, with 9 coins or fewer.",
        price: 99,
        paid: 0,
        drawer: { quarter: 3, dime: 3, nickel: 2, penny: 5 },
        most: 9,
        aim: 0.5,
        item: "Ball",
    },
    {
        title: "$1.87 in seven pieces",
        grades: [3, 4],
        goal: "Make $1.87 on the felt with 7 pieces or fewer.",
        prompt: "Make $1.87 on the felt, with 7 pieces or fewer.",
        price: 187,
        paid: 0,
        drawer: { "1": 2, quarter: 4, dime: 3, nickel: 2, penny: 4 },
        most: 7,
        aim: 0.35,
        item: "Book",
    },
];

/** The shove's tuning table. Friction, bounce and speed take hold at the next shove. */
export const SHOVE = {
    pull: knob(5, 3, 7, 0.5, "squares", "a full pull fits between a pile and the rim behind it"),
    minPull: knob(
        0.6,
        0.3,
        1.2,
        0.1,
        "squares",
        "anything shorter is a tap, which sends a coin home",
    ),
    speed: knob(
        64,
        30,
        90,
        2,
        "squares a second",
        "a full pull slides a coin the length of the counter to the far rim",
    ),
    damping: knob(
        1.6,
        0.8,
        3,
        0.1,
        "a second",
        "a coin slows smoothly, and far pulls and near pulls are easy to tell apart",
    ),
    bounce: knob(
        0.55,
        0.2,
        0.8,
        0.05,
        "of its speed",
        "a coin knocks another on and keeps a little of its own",
    ),
};

const RATE = 60,
    DT = 1 / RATE;
export const COUNTER = {
    world: { w: 52, h: 32 },
    view: { w: 46, h: 27 },
    board: { x: 3.5, y: 4 },
} as const;
/** The shove board drawing's size, rim, start line and felt, in squares from its top left; a test checks they are the drawing's own. */
export const BOARD = {
    w: 45,
    h: 24,
    rim: 1,
    line: 11,
    felt: { x: 28.5, y: 5.5, w: 13, h: 13 },
} as const;
export const INNER = {
    x0: COUNTER.board.x + BOARD.rim,
    y0: COUNTER.board.y + BOARD.rim,
    x1: COUNTER.board.x + BOARD.w - BOARD.rim,
    y1: COUNTER.board.y + BOARD.h - BOARD.rim,
};
/** A piece that comes to rest behind this line goes back to its pile. */
export const LINE = COUNTER.board.x + BOARD.line;
/** The felt, in the world: a piece whose middle rests inside it is on the felt. */
export const BOX = {
    x: COUNTER.board.x + BOARD.felt.x,
    y: COUNTER.board.y + BOARD.felt.y,
    w: BOARD.felt.w,
    h: BOARD.felt.h,
};
/** Real diameters in millimetres, drawn so a quarter is two and a half squares across. */
const MM: Partial<Record<Piece, number>> = {
    quarter: 24.26,
    nickel: 21.21,
    penny: 19.05,
    dime: 17.91,
};
const PER_MM = 2.5 / 24.26;
const NOTE = { w: 6, h: 2.5 };
/** Squares a second under which a sliding piece stops, as a coin on a counter does rather than creeping. */
const STOP = 0.7;
const PILE = { x: 9, gap: 4.6, shown: 4, margin: 1.5 };
const ORDER: Piece[] = ["5", "1", "quarter", "dime", "nickel", "penny"];

const isNote = (k: Piece) => k === "1" || k === "5";
export const radius = (k: Piece): number => ((MM[k] ?? 24) * PER_MM) / 2;
export const targetOf = (L: ShoveLevel): number => (L.paid ? L.paid - L.price : L.price);
export const cents = (n: number): string => (n >= 100 ? `$${(n / 100).toFixed(2)}` : `${n}¢`);
const inside = (r: { x: number; y: number; w: number; h: number }, p: Pt) =>
    p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
const kindsOf = (L: ShoveLevel): Piece[] => ORDER.filter((k) => (L.drawer[k] ?? 0) > 0);

/** How far a pile reaches above its middle, and below it with the steps of its stack. */
const above = (k: Piece) => (isNote(k) ? NOTE.h / 2 : radius(k));
const below = (k: Piece) => above(k) + (PILE.shown - 1) * 0.24;

/**
 * Where a kind's pile stands, down the left of the counter behind the line, in the order of the drawer.
 * A column too tall to keep a margin from the rims, as five kinds with a note at the top are, closes up.
 */
export function pileAt(L: ShoveLevel, k: Piece): Pt {
    const kinds = kindsOf(L),
        i = Math.max(0, kinds.indexOf(k)),
        n = kinds.length - 1,
        first = kinds[0] ?? k,
        last = kinds.at(-1) ?? k;
    const room = INNER.y1 - INNER.y0 - 2 * PILE.margin - above(first) - below(last),
        gap = n > 0 ? Math.min(PILE.gap, room / n) : 0;
    const top =
        gap < PILE.gap
            ? INNER.y0 + PILE.margin + above(first)
            : (INNER.y0 + INNER.y1) / 2 - (n * gap) / 2;
    return { x: PILE.x, y: top + i * gap };
}

function pieceArt(k: Piece): {
    art: string;
    params: Record<string, unknown>;
    crop: { x: number; y: number; w: number; h: number };
    size: number;
} {
    if (isNote(k))
        return {
            art: "money",
            params: { pieces: [k] },
            crop: { x: 0.42, y: 1.02, w: 6.16, h: 2.66 },
            size: 6.16,
        };
    const d = ((MM[k] ?? 24) * 1.55) / 20,
        crop = { x: 1.5 - d / 2 - 0.08, y: 1.5 - d / 2 - 0.08, w: d + 0.16, h: d + 0.16 };
    return { art: "prop.coins", params: { coins: [k] }, crop, size: (crop.w * 2 * radius(k)) / d };
}

interface Coin {
    id: number;
    kind: Piece;
    on: "held" | "board" | "home";
    body: Body | null;
    at: Pt;
    angle: number;
    /** Held: where the pull is measured from. Going home: where the glide began. */
    from: Pt;
    /** Held: how far the hand has pulled it back, which the rim behind a pile does not shorten. */
    pull: Pt;
    t: number;
    /** Whether it was picked up off the counter rather than off its pile. */
    counter: boolean;
}

export interface ShoveState {
    level: number;
    L: ShoveLevel;
    world: Bodies;
    /** How many of each piece are still in their piles. */
    wells: Record<Piece, number>;
    coins: Coin[];
    ids: number;
    hand: Pt | null;
    held: Coin | null;
    /** The keyboard's choice of piece, and how hard a shove it gets, from nought to one. */
    cursor: { i: number; strength: number } | null;
    last: number;
    steps: number;
    still: number;
    lastKnock: number;
    said: string;
    saidAt: number;
    told: string;
    touched: boolean;
    won: boolean;
    wonAt: number;
}

export function start(level: number): ShoveState {
    const L = SHOVE_LEVELS[level] ?? SHOVE_LEVELS[0];
    const world = bodies({ gravity: { x: 0, y: 0 } });
    const I = INNER,
        cx = (I.x0 + I.x1) / 2,
        cy = (I.y0 + I.y1) / 2,
        w = I.x1 - I.x0,
        h = I.y1 - I.y0;
    for (const wall of [
        { x: I.x0 - 1, y: cy, w: 2, h: h + 4 },
        { x: I.x1 + 1, y: cy, w: 2, h: h + 4 },
        { x: cx, y: I.y0 - 1, w: w + 4, h: 2 },
        { x: cx, y: I.y1 + 1, w: w + 4, h: 2 },
    ])
        world.box({ ...wall, fixed: true, friction: 0.1, restitution: 0.5 });
    const wells: Record<Piece, number> = {
        "5": 0,
        "1": 0,
        quarter: 0,
        dime: 0,
        nickel: 0,
        penny: 0,
    };
    for (const k of ORDER) wells[k] = L.drawer[k] ?? 0;
    return {
        level,
        L,
        world,
        wells,
        coins: [],
        ids: 0,
        hand: null,
        held: null,
        cursor: null,
        last: -1,
        steps: 0,
        still: 0,
        lastKnock: -99,
        said: "",
        saidAt: -999,
        told: "",
        touched: false,
        won: false,
        wonAt: -1,
    };
}

function tell(s: ShoveState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

const resting = (s: ShoveState, c: Coin) =>
    c.on === "board" && c.body !== null && !s.world.moving(c.body);
/** The pieces lying still with their middles on the felt. A piece still sliding counts for nothing yet. */
export const boxed = (s: ShoveState): Coin[] =>
    s.coins.filter((c) => resting(s, c) && inside(BOX, c.at));
export const boxTotal = (s: ShoveState): number =>
    boxed(s).reduce((sum, c) => sum + WORTH[c.kind], 0);
export const moving = (s: ShoveState): boolean =>
    s.coins.some(
        (c) => c.on === "home" || (c.on === "board" && c.body !== null && s.world.moving(c.body)),
    );
/** Every piece of the round, wherever it is: in a pile, in a hand, on the counter or on its way home. */
export const pieceCount = (s: ShoveState): number =>
    ORDER.reduce((n, k) => n + s.wells[k], 0) + s.coins.length;

function bodyFor(s: ShoveState, k: Piece, at: Pt): Body {
    if (isNote(k))
        return s.world.box({
            x: at.x,
            y: at.y,
            w: NOTE.w,
            h: NOTE.h,
            density: 0.25,
            friction: 0.3,
            restitution: 0.3,
            damping: { move: dampingOf(k), turn: 3 },
        });
    return s.world.ball({
        x: at.x,
        y: at.y,
        r: radius(k),
        density: 1,
        friction: 0.2,
        restitution: SHOVE.bounce.value,
        fast: true,
        damping: { move: dampingOf(k), turn: 4 },
    });
}

const dampingOf = (k: Piece) => SHOVE.damping.value * (isNote(k) ? 1.25 : 1);
/** The velocity a pull gives: straight back through where it was pulled from, faster the further it was pulled. */
export const shoveOf = (pull: Pt): Pt => {
    const len = Math.hypot(pull.x, pull.y);
    if (len === 0) return { x: 0, y: 0 };
    const speed = SHOVE.speed.value * Math.min(1, len / SHOVE.pull.value);
    return { x: (-pull.x / len) * speed, y: (-pull.y / len) * speed };
};
const within = (pull: Pt): Pt => {
    const len = Math.hypot(pull.x, pull.y),
        most = SHOVE.pull.value;
    return len <= most ? pull : { x: (pull.x / len) * most, y: (pull.y / len) * most };
};

function keepOn(k: Piece, p: Pt): Pt {
    const hx = isNote(k) ? NOTE.w / 2 + 0.1 : radius(k) + 0.05,
        hy = isNote(k) ? NOTE.h / 2 + 0.1 : radius(k) + 0.05;
    return {
        x: Math.max(INNER.x0 + hx, Math.min(INNER.x1 - hx, p.x)),
        y: Math.max(INNER.y0 + hy, Math.min(INNER.y1 - hy, p.y)),
    };
}

function goHome(s: ShoveState, c: Coin, out: Happening[]): void {
    if (c.body) s.world.remove(c.body);
    c.body = null;
    c.on = "home";
    c.from = { ...c.at };
    c.t = 0;
    out.push({ cue: "back" });
}

/** Sends a piece off from `from`, pulled back by `pull`. */
function shove(s: ShoveState, c: Coin, pull: Pt, out: Happening[]): void {
    const p = within(pull),
        at = keepOn(c.kind, { x: c.from.x + p.x, y: c.from.y + p.y }),
        v = shoveOf(p);
    c.body = bodyFor(s, c.kind, at);
    s.world.launch(c.body, v, isNote(c.kind) ? v.y * 0.03 : 0);
    c.on = "board";
    c.at = at;
    s.last = c.id;
    s.told = "";
    out.push({ cue: "lift" });
}

/** Lays a piece from its pile at rest at a place on the counter, as a test's own arrangement does. */
export function lay(s: ShoveState, k: Piece, at: Pt): boolean {
    if (s.wells[k] <= 0) return false;
    s.wells[k]--;
    const c: Coin = {
        id: s.ids++,
        kind: k,
        on: "board",
        body: null,
        at: keepOn(k, at),
        angle: 0,
        from: { ...at },
        pull: { x: 0, y: 0 },
        t: 0,
        counter: false,
    };
    c.body = bodyFor(s, k, c.at);
    s.coins.push(c);
    return true;
}

/** How far back a lying piece reaches, turned as it lies. A piece is over the line only when all of it is. */
export const backOf = (k: Piece, x: number, angle: number): number =>
    x -
    (isNote(k)
        ? (NOTE.w / 2) * Math.abs(Math.cos(angle)) + (NOTE.h / 2) * Math.abs(Math.sin(angle))
        : radius(k));

const reachOf = (k: Piece, d: Pt) =>
    isNote(k)
        ? Math.abs(d.x) <= NOTE.w / 2 + 0.4 && Math.abs(d.y) <= NOTE.h / 2 + 0.6
        : Math.hypot(d.x, d.y) <= radius(k) + 0.7;

function pick(s: ShoveState, t: Pt, out: Happening[]): void {
    const lying = s.coins
        .filter((c) => resting(s, c) && reachOf(c.kind, { x: t.x - c.at.x, y: t.y - c.at.y }))
        .sort(
            (a, b) =>
                Math.hypot(t.x - a.at.x, t.y - a.at.y) - Math.hypot(t.x - b.at.x, t.y - b.at.y),
        )[0];
    if (lying) {
        if (lying.body) s.world.remove(lying.body);
        lying.body = null;
        lying.on = "held";
        lying.from = { ...lying.at };
        lying.pull = { x: 0, y: 0 };
        lying.counter = true;
        s.held = lying;
    } else {
        const k = kindsOf(s.L).find((kind) => {
            const at = pileAt(s.L, kind);
            return s.wells[kind] > 0 && reachOf(kind, { x: t.x - at.x, y: t.y - at.y });
        });
        if (!k) return;
        s.wells[k]--;
        const from = pileAt(s.L, k),
            c: Coin = {
                id: s.ids++,
                kind: k,
                on: "held",
                body: null,
                at: from,
                angle: 0,
                from,
                pull: { x: 0, y: 0 },
                t: 0,
                counter: false,
            };
        s.coins.push(c);
        s.held = c;
    }
    s.touched = true;
    out.push({ cue: "lift" });
}

function letGo(s: ShoveState, out: Happening[]): void {
    const c = s.held;
    s.held = null;
    if (!c) return;
    const pull = c.pull;
    if (Math.hypot(pull.x, pull.y) >= SHOVE.minPull.value) {
        shove(s, c, pull, out);
        return;
    }
    if (c.counter) {
        c.at = { ...c.from };
        goHome(s, c, out);
        return;
    }
    s.wells[c.kind]++;
    s.coins = s.coins.filter((x) => x !== c);
}

function hands(s: ShoveState, pad: Pad, out: Happening[]): void {
    const t = pad.touch;
    if (t) {
        const was = s.hand;
        s.hand = { ...t };
        s.cursor = null;
        // A press that begins on a piece picks it up, and the hand then pulls it back until it lifts.
        if (!was && !s.held) pick(s, t, out);
        const c = s.held;
        if (c) {
            // The piece stops at the rim, and the pull goes on with the hand, as the keys' pull does, so a
            // dollar note in a pile near the rim can be pulled back as far as a coin.
            c.pull = within({ x: t.x - c.from.x, y: t.y - c.from.y });
            c.at = keepOn(c.kind, { x: c.from.x + c.pull.x, y: c.from.y + c.pull.y });
        }
    }
    if (pad.lifted) {
        if (s.held) letGo(s, out);
        s.hand = null;
    }
}

/** What the keyboard can choose, in order: the piles, then the pieces lying still on the counter from left to right. */
function choices(s: ShoveState): { kind: Piece; coin: Coin | null; at: Pt }[] {
    const piles = kindsOf(s.L)
        .filter((k) => s.wells[k] > 0)
        .map((k) => ({ kind: k, coin: null, at: pileAt(s.L, k) }));
    const lying = s.coins
        .filter((c) => resting(s, c))
        .sort((a, b) => a.at.x - b.at.x)
        .map((c) => ({ kind: c.kind, coin: c, at: c.at }));
    return [...piles, ...lying];
}

/** The keyboard's shove: from the chosen piece towards the middle of the felt, as hard as the strength says. */
function keyPull(from: Pt, strength: number): Pt {
    const aim = { x: BOX.x + BOX.w / 2 - from.x, y: BOX.y + BOX.h / 2 - from.y },
        len = Math.hypot(aim.x, aim.y) || 1;
    return {
        x: (-aim.x / len) * strength * SHOVE.pull.value,
        y: (-aim.y / len) * strength * SHOVE.pull.value,
    };
}

function keys(s: ShoveState, pad: Pad, out: Happening[]): void {
    const ups = pad.pressed.filter((d) => d === "up" || d === "down"),
        sides = pad.pressed.filter((d) => d === "left" || d === "right");
    if ((!ups.length && !sides.length && !pad.tapped) || pad.touch || s.held) return;
    const list = choices(s);
    if (!list.length) return;
    if (!s.cursor) {
        s.cursor = { i: 0, strength: 0.5 };
        if (!pad.tapped) return;
    }
    const cur = s.cursor;
    for (const d of ups) cur.i = (cur.i + (d === "down" ? 1 : list.length - 1)) % list.length;
    cur.i = Math.min(cur.i, list.length - 1);
    for (const d of sides)
        cur.strength =
            Math.round(
                Math.max(0.1, Math.min(1, cur.strength + (d === "right" ? 0.1 : -0.1))) * 10,
            ) / 10;
    if (!pad.tapped) return;
    const chosen = list[cur.i];
    if (!chosen) return;
    let c = chosen.coin;
    if (c) {
        if (c.body) s.world.remove(c.body);
        c.body = null;
        c.from = { ...c.at };
    } else {
        s.wells[chosen.kind]--;
        c = {
            id: s.ids++,
            kind: chosen.kind,
            on: "held",
            body: null,
            at: chosen.at,
            angle: 0,
            from: chosen.at,
            pull: { x: 0, y: 0 },
            t: 0,
            counter: false,
        };
        s.coins.push(c);
    }
    s.touched = true;
    shove(s, c, keyPull(c.from, cur.strength), out);
    cur.i = 0;
}

export function step(s: ShoveState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (!s.won) {
        hands(s, pad, out);
        keys(s, pad, out);
    }
    const hit = s.world.step(DT);
    if (hit > 0.3 && s.steps - s.lastKnock > 6) {
        s.lastKnock = s.steps;
        out.push({ cue: "bump" });
    }
    for (const c of s.coins) {
        if (c.on === "board" && c.body) {
            const p = s.world.where(c.body),
                v = s.world.velocity(c.body);
            if (Math.hypot(v.x, v.y) < STOP && s.world.moving(c.body))
                s.world.launch(c.body, { x: 0, y: 0 }, 0);
            c.at = { x: p.x, y: p.y };
            c.angle = isNote(c.kind) ? p.angle : 0;
            const off =
                p.x < INNER.x0 - 0.5 ||
                p.x > INNER.x1 + 0.5 ||
                p.y < INNER.y0 - 0.5 ||
                p.y > INNER.y1 + 0.5;
            const lies = !s.world.moving(c.body),
                behind = lies && p.x < LINE,
                across = lies && !behind && backOf(c.kind, p.x, p.angle) < LINE;
            if (off || behind || across) {
                goHome(s, c, out);
                if (behind) tell(s, "It stopped behind the line, so it went back.");
                else if (across) tell(s, "It stopped on the line, so it went back.");
            }
        } else if (c.on === "home") {
            c.t = Math.min(1, c.t + DT / 0.35);
            const e = 1 - (1 - c.t) ** 3,
                w = pileAt(s.L, c.kind);
            c.at = { x: c.from.x + (w.x - c.from.x) * e, y: c.from.y + (w.y - c.from.y) * e };
            c.angle *= 1 - e;
            if (c.t >= 1) {
                s.wells[c.kind]++;
                s.coins = s.coins.filter((x) => x !== c);
            }
        }
    }
    const calm = !s.held && !moving(s),
        target = targetOf(s.L),
        n = boxed(s).length;
    if (!s.won && calm && n > 0 && boxTotal(s) === target) {
        if (n <= s.L.most) {
            if (++s.still > RATE * 0.5) {
                s.won = true;
                s.wonAt = s.steps;
                tell(
                    s,
                    s.L.paid
                        ? `That is the change, ${cents(target)}.`
                        : `That is ${cents(target)}.`,
                );
                out.push(
                    { cue: "ring" },
                    {
                        burst: {
                            kind: "sparkle",
                            x: BOX.x + BOX.w / 2,
                            y: BOX.y + BOX.h / 2,
                            n: 16,
                        },
                    },
                );
            }
        } else {
            s.still = 0;
            const line = `That is ${cents(target)}, in ${n} pieces. The felt takes ${s.L.most}.`;
            if (s.told !== line) {
                s.told = line;
                tell(s, line);
            }
        }
    } else s.still = 0;
    if (s.won && s.steps - s.wonAt === Math.round(RATE * 0.6)) out.push({ cue: "win" });
    return out;
}

export function back(s: ShoveState): boolean {
    if (s.won || s.held) return false;
    const lying = s.coins.filter((c) => c.on === "board");
    const last = lying.find((c) => c.id === s.last) ?? lying.sort((a, b) => a.id - b.id).at(-1);
    if (!last) return false;
    goHome(s, last, []);
    return true;
}

export function frame(s: ShoveState, _rest = false): Frame {
    const L = s.L,
        W = COUNTER.world,
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    const tag = { x: BOX.x + BOX.w / 2 + 0.5, y: BOX.y - 3 };
    sprites.push(
        {
            key: "board",
            art: "shoveboard",
            params: { felt: true },
            seed: 17,
            x: COUNTER.board.x + BOARD.w / 2,
            y: COUNTER.board.y + BOARD.h / 2,
            z: 0,
            still: true,
        },
        {
            key: "tag",
            art: "pricetag",
            params: { now: L.price, was: 0 },
            seed: 29,
            x: tag.x,
            y: tag.y,
            z: 3,
            still: true,
        },
    );
    if (L.paid)
        sprites.push({
            key: "paid",
            ...pieceArt("1"),
            seed: 31,
            x: BOX.x - 3.8,
            y: BOX.y - 2.6,
            angle: -0.14,
            z: 3,
            still: true,
        });
    if (s.won) {
        const t = Math.min(1, (s.steps - s.wonAt) / (RATE * 0.9)),
            e = 1 - (1 - t) ** 3;
        sprites.push({
            key: "receipt",
            art: "receipt",
            params: {
                shop: "Corner Shop",
                items: [{ name: L.item, cents: targetOf(L) }],
                total: true,
            },
            seed: 37,
            size: 6.5,
            x: tag.x - e * 15,
            y: tag.y + e * 6,
            angle: -0.08 * e,
            z: e > 0.35 ? 4 : 2,
        });
    }
    for (const k of kindsOf(L)) {
        const at = pileAt(L, k),
            n = s.wells[k],
            shown = Math.min(n, PILE.shown),
            art = pieceArt(k);
        for (let j = 0; j < shown; j++) {
            const down = shown - 1 - j;
            sprites.push({
                key: `pile:${k}:${j}`,
                ...art,
                seed: 500 + ORDER.indexOf(k) * 10 + j,
                x: at.x + down * 0.16,
                y: at.y + down * 0.24,
                z: 2 + j,
            });
        }
        const right = isNote(k) ? NOTE.w / 2 + 1.1 : radius(k) + 1.3;
        if (n > 0)
            marks.push({ kind: "word", x: at.x + right, y: at.y + 0.45, text: `× ${n}`, size: 1 });
        else if (isNote(k))
            marks.push({
                kind: "box",
                x: at.x - NOTE.w / 2,
                y: at.y - NOTE.h / 2,
                w: NOTE.w,
                h: NOTE.h,
            });
        else marks.push({ kind: "ring", x: at.x, y: at.y, r: radius(k) });
    }
    const box = new Set(boxed(s));
    for (const c of s.coins) {
        const since = s.won ? (s.steps - s.wonAt) / RATE : 0;
        const hop =
            s.won && box.has(c) && since < 1.6
                ? 1 +
                  0.16 *
                      Math.max(0, Math.sin(Math.PI * 2 * (since * 1.6 - (c.at.x - BOX.x) * 0.03)))
                : 1;
        sprites.push({
            key: `coin:${c.id}`,
            ...pieceArt(c.kind),
            seed: 400 + c.id,
            x: c.at.x,
            y: c.at.y,
            angle: c.angle,
            scale: hop,
            z: c.on === "held" ? 8 : c.on === "home" ? 6 : 5,
        });
    }
    const total = boxTotal(s),
        rings = L.most < ORDER.reduce((n, k) => n + (L.drawer[k] ?? 0), 0),
        under = BOX.y + BOX.h + 1.5;
    marks.push({
        kind: "word",
        x: rings ? BOX.x + 2.2 : BOX.x + BOX.w / 2,
        y: under + 0.45,
        text: cents(total),
        size: 1.5,
    });
    if (rings)
        for (let i = 0; i < L.most; i++)
            marks.push({
                kind: "ring",
                x: BOX.x + 5.2 + i * 0.95,
                y: under,
                r: 0.34,
                on: i < box.size,
                solid: true,
            });
    if (L.paid)
        marks.push({ kind: "word", x: BOX.x + BOX.w / 2, y: BOX.y + 1.5, text: "change", size: 1 });
    const aim = (from: Pt, pull: Pt, k: Piece) => {
        if (Math.hypot(pull.x, pull.y) < SHOVE.minPull.value) return;
        const v = shoveOf(pull),
            speed = Math.hypot(v.x, v.y),
            far = slideDistance(Math.max(0, speed - STOP), dampingOf(k)) * L.aim;
        marks.push({
            kind: "line",
            a: from,
            b: { x: from.x + (v.x / speed) * far, y: from.y + (v.y / speed) * far },
            style: "aim",
            head: true,
        });
    };
    const c = s.held;
    if (c && !s.won) aim(c.at, c.pull, c.kind);
    else if (s.cursor && !s.won) {
        const chosen = choices(s)[s.cursor.i];
        if (chosen) {
            marks.push({
                kind: "ring",
                x: chosen.at.x,
                y: chosen.at.y,
                r: (isNote(chosen.kind) ? NOTE.w / 2 : radius(chosen.kind)) + 0.4,
                on: true,
            });
            aim(chosen.at, keyPull(chosen.at, s.cursor.strength), chosen.kind);
        }
    }
    return {
        sprites,
        marks,
        camera: { x: W.w / 2, y: W.h / 2, zoom: 1 },
        view: { ...COUNTER.view },
        world: { ...W },
    };
}

const NAMES: Record<Piece, [string, string]> = {
    "5": ["a five dollar note", "five dollar notes"],
    "1": ["a dollar note", "dollar notes"],
    quarter: ["a quarter", "quarters"],
    dime: ["a dime", "dimes"],
    nickel: ["a nickel", "nickels"],
    penny: ["a penny", "pennies"],
};
function named(kinds: Piece[]): string {
    const words = ORDER.filter((k) => kinds.includes(k)).map((k) => {
        const n = kinds.filter((x) => x === k).length;
        return n === 1 ? NAMES[k][0] : `${n} ${NAMES[k][1]}`;
    });
    return words.length > 1
        ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`
        : (words[0] ?? "");
}

export function say(s: ShoveState): string {
    const L = s.L,
        inBox = boxed(s),
        n = inBox.length;
    const piles = ORDER.flatMap((k) => Array.from({ length: s.wells[k] }, () => k));
    const outside = s.coins
        .filter((c) => c.on === "board" && !inBox.includes(c))
        .map((c) => c.kind);
    return [
        s.said,
        L.paid
            ? `The price is ${cents(L.price)} and ${cents(L.paid)} was paid, so the change goes on the felt.`
            : `The price tag says ${cents(L.price)}.`,
        n
            ? `On the felt: ${named(inBox.map((c) => c.kind))}, ${cents(boxTotal(s))} in ${n} ${n === 1 ? "piece" : "pieces"}.`
            : "The felt is empty.",
        `The felt takes ${L.most} ${L.most === 1 ? "piece" : "pieces"}.`,
        outside.length ? `On the counter off the felt: ${named(outside)}.` : "",
        piles.length ? `In the piles: ${named(piles)}.` : "The piles are empty.",
        s.held ? `You are holding ${NAMES[s.held.kind][0]}.` : "",
    ]
        .filter(Boolean)
        .join(" ");
}

export const shoveGame: ActionGame<ShoveState> = {
    id: "pay",
    title: "Penny shove",
    group: "action",
    levels: SHOVE_LEVELS,
    rate: RATE,
    bleed: true,
    touch: true,
    plays: { activity: "pay.make-the-amount", levels: [2, 3, 5] },
    cover: { art: "prop.coins", params: { coins: ["penny", "nickel", "dime", "quarter"] } },
    hint: "Pull a coin back from its pile and let go to shove it onto the felt, or choose a coin with up and down, set how hard with left and right, and press space",
    controls: {},
    start,
    step,
    frame,
    say,
    back,
    tuning: SHOVE,
    note: (s) =>
        !s.touched && !s.won ? s.L.prompt : s.steps - s.saidAt < RATE * 4 || s.won ? s.said : "",
    won: (s) => s.won,
    still: {
        press: () => Math.round(RATE * 0.25),
        settling: (s) => (s.won ? s.steps - s.wonAt < RATE : moving(s)),
    },
};
