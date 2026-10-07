// The variations of Knock it down, and a pilot that wins each one through the real game. The pilot
// plays as a child does: it watches where the ball will come down, gets the tray there, and picks
// where along the tray to meet it by trying each place on a copy of the round for one trip up and
// back, keeping the one that does the most for the target. Before a serve it tries each place along
// the foot the same way. A helpful gift is caught when there is time to fetch it and still meet the
// ball. The pads it gives are the keys, or a finger held where the tray should be and let go to
// serve, and they replay to the same round.
import {
    FIELD_AT,
    KNOCK_LEVELS,
    TRAY_Y,
    canMake,
    cloneKnock,
    deadEnd,
    fly,
    knockGame,
    progressOf,
    startKnock,
    type Gift,
    type KnockLevel,
    type KnockState,
} from "./knock";
import { SUB } from "../../engine/motion/pinball";
import { emptyPad, type Pad } from "../../engine/motion/pad";
import { KNOCKFRAME } from "../../engine/parts/sport/knockframe";

const F_W = KNOCKFRAME.field.w;
const RATE = 60;
const TICKS = SUB / RATE;
const R = 0.45;
/** Squares a second a gift falls at: the same as the game's. */
const GIFT_FALL = 4;

interface KnockConfiguration {
    phase: number;
    variant: number;
}

/** The level as authored, mirrored, with its numbers turned round, and those mirrored. */
export const KNOCK_VARIANTS = 4;

/** The other way round, and never nought below zero, which a trip through JSON would not keep. */
const flip = (v: number) => 0 - v;

function mirror(L: KnockLevel): KnockLevel {
    return { ...L, blocks: L.blocks.map((p) => ({ ...p, x: flip(p.x - F_W + p.w) })) };
}

/** The numbers, and the stars' numbers, read from the last block to the first, so every number stays and moves. */
function turned(L: KnockLevel): KnockLevel {
    const numbers = L.blocks
            .filter((p) => (p.n ?? 0) > 0)
            .map((p) => p.n ?? 0)
            .reverse(),
        stars = L.blocks
            .filter((p) => p.star !== undefined)
            .map((p) => p.star ?? 0)
            .reverse();
    let k = 0,
        j = 0;
    return {
        ...L,
        blocks: L.blocks.map((p) => ({
            ...p,
            ...((p.n ?? 0) > 0 ? { n: numbers[k++] ?? p.n } : {}),
            ...(p.star !== undefined ? { star: stars[j++] ?? p.star } : {}),
        })),
    };
}

/** A level as one of its variations lays it out. */
function varyKnock(L: KnockLevel, variant: number): KnockLevel {
    const numbers = variant >= 2 ? turned(L) : L;
    return variant % 2 === 1 ? mirror(numbers) : numbers;
}

export function knockChallenge(seed: number, phase: number): KnockConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < KNOCK_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % KNOCK_VARIANTS };
}

export function isKnockConfiguration(v: unknown, phase: number): v is KnockConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < KNOCK_VARIANTS &&
        KNOCK_LEVELS[phase] !== undefined
    );
}

export function openKnockConfiguration(c: KnockConfiguration): KnockState {
    const L = KNOCK_LEVELS[c.phase];
    if (!L) throw new Error("No such Knock it down level");
    return startKnock(varyKnock(L, c.variant), c.phase);
}

/** How good a round is to go on from. */
function worth(s: KnockState): number {
    if (s.won || s.end === "won") return 1e7;
    if (s.end === "out" || deadEnd(s)) return -1e7;
    const p = progressOf(s),
        loose = s.boxes.filter((b) => s.off[b.id] && !b.fixed).length,
        gifts = s.gifts.length;
    return p.completed * 1000 + loose * 3 + gifts * 40;
}

/** A ball heading down near the tray's line: where the next catch is decided. */
const coming = (s: KnockState) => s.balls.some((m) => m.vy > 0 && m.y + R >= TRAY_Y - 0.05);

/** Where the first ball to come down meets the tray's line, and in how many sub-steps, with the tray away; null when none comes within six seconds. */
function landing(s: KnockState): { x: number; ticks: number; straight: boolean } | null {
    const c = cloneKnock(s),
        b0 = c.bounces;
    const n = fly(c, false, SUB * 6, (k) => coming(k) || k.won || !k.balls.length);
    const m = c.balls.find((x) => x.vy > 0 && x.y + R >= TRAY_Y - 0.05);
    if (!m) return null;
    return { x: m.x, ticks: n, straight: c.bounces === b0 };
}

/** The worth of a round after the tray meets the ball where it is now, played out for one trip up and back. */
function trip(s: KnockState): number {
    const c = cloneKnock(s),
        caught = c.catches;
    fly(
        c,
        true,
        SUB * 8,
        (k) =>
            k.won ||
            !k.balls.length ||
            (k.catches > caught && (k.held !== null || coming(k) || !k.balls.length)),
    );
    // a ball that got past the tray is a ball lost
    return worth(c) - (c.balls.length === 0 && c.held === null && !c.won ? 1e5 : 0);
}

const hashed = (a: number, b: number) => {
    let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b, 0xc2b2ae35);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
};

/** The best place for the tray's middle among `xs`, each tried for one trip; ties go a different way each trip, so the pilot never loops. */
function best(s: KnockState, xs: number[], place: (c: KnockState, x: number) => void): number {
    let top = -Infinity,
        at = s.tray.x;
    xs.forEach((x, i) => {
        const c = cloneKnock(s);
        place(c, x);
        const v = trip(c) + hashed(s.catches * 31 + s.bounces, i) * 2;
        if (v > top) {
            top = v;
            at = x;
        }
    });
    return at;
}

const OFFS = [-0.85, -0.68, -0.5, -0.33, -0.16, 0, 0.16, 0.33, 0.5, 0.68, 0.85];

interface Memo {
    /** The bounce count the plan was made at, and where the tray should be. */
    at: number;
    x: number;
    serve: boolean;
    /** The sub-step the ball is due at the tray's line. */
    due: number;
}

const clampX = (s: KnockState, x: number) => Math.max(s.tray.half, Math.min(F_W - s.tray.half, x));

/** The gifts worth catching: a star that still fits and leaves the total makeable, and any other gift. */
function helpful(s: KnockState): Gift[] {
    const a = s.L.ask;
    return s.gifts.filter((g) => {
        if (g.kind !== "star" || a.kind !== "stars") return true;
        const rest = [
            ...s.L.blocks.map((p, i) => (s.off[`b${i}`] || p.gift !== "star" ? 0 : (p.star ?? 0))),
            ...s.gifts.filter((o) => o !== g && o.kind === "star").map((o) => o.n),
        ].filter((n) => n > 0);
        return s.sum + g.n <= a.total && canMake(rest, a.total - s.sum - g.n);
    });
}

/** Seconds until a gift reaches the tray. */
const dueOf = (s: KnockState, g: Gift) => (s.tray.y - 0.2 - g.y) / GIFT_FALL;

/** A gift worth fetching now: one that can be caught before the ball needs the tray, and the tray back in time. */
function fetchable(s: KnockState, ballTicks: number, ballX: number): number | null {
    const VT = 18;
    let pick: number | null = null,
        soonest = Infinity;
    for (const g of helpful(s)) {
        const t = dueOf(s, g);
        if (t <= 0) continue;
        const there = Math.abs(g.x - s.tray.x) / VT,
            back = Math.abs(ballX - g.x) / VT;
        if (there < t && t + back < ballTicks / SUB && t < soonest) {
            soonest = t;
            pick = g.x;
        }
    }
    return pick;
}

/** Where the pilot wants the tray now, and whether to serve. */
function plan(s: KnockState, memo: Memo): { x: number; serve: boolean } {
    if (s.held !== null) {
        if (memo.at !== -1 - s.left || !memo.serve) {
            const xs: number[] = [];
            for (let x = s.tray.half; x <= F_W - s.tray.half + 1e-9; x += 1) xs.push(x);
            memo.x = best(s, xs, (c, x) => {
                c.tray.x = x;
                c.tray.v = 0;
                knockGame.step(c, { ...emptyPad(), tapped: true });
            });
            memo.at = -1 - s.left;
            memo.serve = true;
        }
        return { x: memo.x, serve: Math.abs(s.tray.x - memo.x) < 0.3 && Math.abs(s.tray.v) < 1 };
    }
    memo.serve = false;
    if (memo.at !== s.bounces) {
        const land = landing(s);
        memo.at = s.bounces;
        if (!land) {
            memo.x = s.tray.x;
            memo.due = Infinity;
            return { x: memo.x, serve: false };
        }
        memo.due = s.steps * TICKS + land.ticks;
        memo.x = clampX(s, land.x);
        const lx = land.x,
            after = helpful(s).find((g) => {
                const due = dueOf(s, g) - land.ticks / SUB;
                return due > 0 && due < 1.4;
            });
        if (after) {
            // a gift comes down just after the ball: meet the ball with the end of the tray nearest it
            memo.x = clampX(s, lx - 0.8 * s.tray.half * Math.sign(lx - after.x || 1));
        } else if (land.straight) {
            memo.x = best(
                s,
                OFFS.map((o) => clampX(s, lx - o * s.tray.half)),
                (c, x) => {
                    c.tray.x = x;
                    c.tray.v = 0;
                },
            );
        }
    }
    if (s.gifts.length) {
        const gift = fetchable(s, memo.due - s.steps * TICKS, memo.x);
        if (gift !== null) return { x: clampX(s, gift), serve: false };
    }
    return { x: memo.x, serve: false };
}

/** The pad that moves the tray towards `x` by `hands`, or serves. */
function padFor(s: KnockState, x: number, serve: boolean, hands: "keys" | "touch"): Pad {
    const at = { x: FIELD_AT.x + x, y: FIELD_AT.y + TRAY_Y + 3 };
    if (hands === "touch")
        return serve ? { ...emptyPad(), lifted: at } : { ...emptyPad(), touch: at };
    if (serve) return { ...emptyPad(), tapped: true, go: true, keys: true };
    const e = x - s.tray.x,
        v = s.tray.v,
        dir = e > 0 ? "right" : "left";
    // hold towards the place while it is further than the tray would glide once let go
    if (
        Math.abs(e) > Math.abs(v) / 25 + 0.2 &&
        (v === 0 || Math.sign(v) === Math.sign(e) || Math.abs(e) > 0.6)
    )
        return {
            ...emptyPad(),
            holding: [dir],
            held: dir,
            pressed: Math.abs(v) < 0.5 ? [dir] : [],
        };
    return emptyPad();
}

const kept = (p: Pad): Pad => ({ ...p, holding: [...p.holding], pressed: [...p.pressed] });

const LIMIT = RATE * 300;

/** The pads that play a variation to its win by `hands`, or null when it is not won in five minutes. */
export function knockWay(
    c: KnockConfiguration,
    hands: "keys" | "touch",
    watch?: (s: KnockState) => void,
): Pad[] | null {
    const s = openKnockConfiguration(c),
        pads: Pad[] = [],
        memo: Memo = { at: -999, x: s.tray.x, serve: false, due: Infinity };
    while (!s.end && s.steps < LIMIT) {
        const want = plan(s, memo),
            pad = padFor(s, want.x, want.serve, hands);
        pads.push(kept(pad));
        knockGame.step(s, pad);
        watch?.(s);
    }
    return s.end === "won" ? pads : null;
}
