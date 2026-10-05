// The variations of Charlie's garden, and a gardener that plays each one to its end through the real
// game: by the keys, walking Charlie with held arrows and pressing the Action, and by a finger, tapping
// things to send her to them. It sows the arrays the job asks for, waters each bed as much as its
// plants drink and no more (leaving a bed alone on a rainy night), shoos the snails and pulls the weeds,
// passes the nights at the sundial, picks everything and shares the harvest. A variation a child is
// given has been played to the end this way in the tests.
import { cellMiddle, isRipe, thirst, type Bed } from "../../engine/motion/garden";
import type { Pt } from "../../engine/motion/geometry";
import { emptyPad, type Dir, type Pad } from "../../engine/motion/pad";
import { route } from "../../engine/motion/roam";
import {
    DIAL,
    FREE,
    GARDEN,
    GARDEN_LEVELS,
    SPAN,
    crateAt,
    gaitOf,
    gardenGame,
    nightOf,
    packetAt,
    placeOf,
    startGarden,
    type Ask,
    type GardenLevel,
    type GardenState,
    type Held,
} from "./garden";

export interface GardenConfiguration {
    phase: number;
    variant: number;
}

export const GARDEN_VARIANTS = 3;

type Shape = { rows: number; cols: number };

/** The arrays and amounts each level's variations ask for, in order. */
const ARRAYS: Partial<Record<number, Shape[]>> = {
    0: [
        { rows: 1, cols: 5 },
        { rows: 1, cols: 4 },
        { rows: 1, cols: 6 },
    ],
    1: [
        { rows: 2, cols: 3 },
        { rows: 2, cols: 4 },
        { rows: 3, cols: 3 },
    ],
    2: [
        { rows: 3, cols: 4 },
        { rows: 2, cols: 6 },
        { rows: 4, cols: 4 },
    ],
    3: [
        { rows: 3, cols: 5 },
        { rows: 4, cols: 4 },
        { rows: 3, cols: 6 },
    ],
    5: [
        { rows: 4, cols: 5 },
        { rows: 3, cols: 5 },
        { rows: 4, cols: 4 },
    ],
};
const LITRES = [2, 1.5, 2.5];
const SHARES = [
    { count: 24, share: 4 },
    { count: 20, share: 4 },
    { count: 18, share: 3 },
];
const WANTS = [
    { customers: 3, each: 5 },
    { customers: 4, each: 4 },
    { customers: 2, each: 6 },
];

const rowsOf = (a: Shape, word: string) =>
    a.rows === 1 ? `a row of ${a.cols} ${word}` : `${a.rows} rows of ${a.cols} ${word}`;

/** A level as one of its variations lays it out, with its words to match. */
export function vary(L: GardenLevel, phase: number, variant: number): GardenLevel {
    const v = ((variant % GARDEN_VARIANTS) + GARDEN_VARIANTS) % GARDEN_VARIANTS;
    if (v === 0 || !L.ask) return L;
    const a: Ask = { ...L.ask };
    const shape = ARRAYS[phase]?.[v];
    if (phase === 3 && shape) {
        // the rainy bed is as big as the array, so filling it is the job
        a.rows = shape.rows;
        a.cols = shape.cols;
        return {
            ...L,
            ask: a,
            beds: L.beds.map((b) => (b.job ? { ...b, rows: shape.rows, cols: shape.cols } : b)),
            prompt: `The bed is ${shape.cols} holes across and ${shape.rows} down. Fill it with sunflowers.`,
        };
    }
    if (shape) {
        a.rows = shape.rows;
        a.cols = shape.cols;
        const word =
            a.crop === "lettuce"
                ? "lettuces"
                : a.crop === "strawberry"
                  ? "strawberries"
                  : "carrots";
        return {
            ...L,
            ask: a,
            goal: L.goal.replace(/(a row of \d+|\d+ rows of \d+) \w+/, rowsOf(shape, word)),
            prompt: L.prompt.replace(/(a row of \d+|\d+ rows of \d+)/, rowsOf(shape, "").trim()),
        };
    }
    if (phase === 4) {
        const litres = LITRES[v] ?? 2;
        a.litres = litres;
        return {
            ...L,
            ask: a,
            goal: L.goal.replace(/\d+(\.\d+)? litres/, `${litres} litres`),
        };
    }
    if (phase === 6) {
        const x = SHARES[v] ?? { count: 24, share: 4 };
        a.count = x.count;
        a.share = x.share;
        return {
            ...L,
            ask: a,
            goal: `Grow ${x.count} strawberries and share them fairly between the ${x.share} baskets. Pull up weeds and shoo the snails.`,
            prompt: `Sow ${x.count} strawberries. How many rows, and how many in a row?`,
        };
    }
    if (phase === 7) {
        const x = WANTS[v] ?? { customers: 3, each: 5 };
        a.want = x;
        return {
            ...L,
            ask: a,
            goal: `${x.customers} customers each want ${x.each} carrots. Grow enough, pick them, and fill each customer's crate.`,
            prompt: `How many carrots will ${x.customers} customers who want ${x.each} each need? Sow them.`,
        };
    }
    return L;
}

export function gardenChallenge(seed: number, phase: number): GardenConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < GARDEN_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % GARDEN_VARIANTS };
}

export function isGardenConfiguration(v: unknown, phase: number): v is GardenConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < GARDEN_VARIANTS &&
        GARDEN_LEVELS[phase] !== undefined
    );
}

/** The level a configuration plays: the free garden takes its gardener from the variation instead. */
export const levelFor = (c: GardenConfiguration): GardenLevel => {
    const L = GARDEN_LEVELS[c.phase] ?? GARDEN_LEVELS[0];
    return c.phase === FREE ? L : vary(L, c.phase, c.variant);
};

export function openGardenConfiguration(c: GardenConfiguration): GardenState {
    return startGarden(levelFor(c), c.phase, c.variant + 1, c.phase === FREE ? c.variant : 0);
}

/**
 * The array to sow in a bed for a job that names only a number: as many to a row as the bed takes
 * that the number divides, so it is one rectangle.
 */
export function shapeFor(n: number, bed: Pick<Bed, "cols" | "rows">, span: number): Shape | null {
    const across = Math.floor(bed.cols / span),
        down = Math.floor(bed.rows / span);
    for (let cols = across; cols >= 1; cols--)
        if (n % cols === 0 && n / cols <= down) return { rows: n / cols, cols };
    return null;
}

/** Whether a configuration's job can be laid out in its beds at all; the tests play each one through. */
export function gardenCertified(c: GardenConfiguration): boolean {
    const L = levelFor(c);
    const a = L.ask;
    if (!a) return true;
    const span = SPAN[a.crop];
    return L.beds
        .filter((b) => b.job)
        .every((b) => {
            if (a.rows !== undefined && a.cols !== undefined)
                return a.cols * span <= b.cols && a.rows * span <= b.rows;
            const n = a.count ?? (a.want ? a.want.customers * a.want.each : 0);
            return shapeFor(n, b, span) !== null;
        });
}

export type Act = { pad: Pad } | { command: string };

const copy = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

/** The most steps the gardener is given for one errand: a walk, a fill or a wait. */
const CAP = 60 * 20;

/** The arrows that point from `a` towards `b`, one or two of them, as a child holding them would. */
function arrows(a: Pt, b: Pt): Dir[] {
    const dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy);
    if (d < 1e-6) return [];
    const out: Dir[] = [];
    if (Math.abs(dx) > 0.38 * d) out.push(dx > 0 ? "right" : "left");
    if (Math.abs(dy) > 0.38 * d) out.push(dy > 0 ? "down" : "up");
    return out;
}

/**
 * Plays a configuration through the game by `hands`, giving back the acts that did it, or null where
 * they did not finish the job. The keys walk Charlie with held arrows and press the Action; a finger
 * taps things to send her to them, drags out the rows on a bed and holds still to pour or to share.
 */
export function solve(c: GardenConfiguration, hands: "touch" | "keys"): Act[] | null {
    const s = openGardenConfiguration(c);
    const L = s.L;
    const acts: Act[] = [];
    const run = (more: Partial<Pad> = {}): void => {
        const pad = { ...emptyPad(), ...more };
        acts.push({ pad: copy(pad) });
        gardenGame.step(s, pad);
    };
    const idle = (n: number) => {
        for (let i = 0; i < n; i++) run();
    };
    let stuck = false;
    const until = (done: () => boolean, pad: Partial<Pad> = {}): void => {
        for (let i = 0; i < CAP && !done(); i++) run(pad);
        if (!done()) stuck = true;
    };
    const settle = () => {
        until(() => Math.hypot(s.me.vx, s.me.vy) < 0.01 && !s.errand && !s.me.route.length);
    };

    // the keys: arrows held along the way round what is in the way, let go near the spot
    const walk = (to: Pt, near = 0.35, go = false): void => {
        const way = route(placeOf(s), s.me, to, gaitOf().radius) ?? [to];
        for (let i = 0; i < CAP; i++) {
            if (Math.hypot(to.x - s.me.x, to.y - s.me.y) <= near) break;
            while (way.length > 1) {
                const w = way[0];
                if (!w || Math.hypot(w.x - s.me.x, w.y - s.me.y) > 0.5) break;
                way.shift();
            }
            const next = way[0] ?? to;
            const held = arrows(s.me, next);
            if (!held.length) break;
            run({ holding: held, held: held[held.length - 1] ?? null, go });
        }
        until(() => Math.hypot(s.me.vx, s.me.vy) < 0.01, { go });
    };
    const turn = (to: Pt): void => {
        const held = arrows(s.me, to);
        run({ holding: held, held: held[held.length - 1] ?? null });
        until(() => Math.hypot(s.me.vx, s.me.vy) < 0.01);
    };
    const press = (): void => {
        run({ go: true, tapped: true });
        run();
    };
    const pressHeld = (done: () => boolean): void => {
        run({ go: true, tapped: true });
        until(done, { go: true });
        run();
    };
    /** Up to a thing, turned to it, and the Action pressed. */
    const use = (at: Pt): void => {
        walk(at, 1.6);
        turn(at);
        press();
    };

    // a finger: a tap, a drag along points, or a hold at a point until something is done
    const tap = (p: Pt): void => {
        run({ touch: p });
        run({ lifted: p });
        settle();
    };
    const drag = (pts: readonly Pt[]): void => {
        const first = pts[0];
        if (!first) return;
        run({ touch: first });
        let at = first;
        for (const p of pts.slice(1)) {
            for (let k = 1; k <= 6; k++)
                run({
                    touch: { x: at.x + ((p.x - at.x) * k) / 6, y: at.y + ((p.y - at.y) * k) / 6 },
                });
            at = p;
        }
        run({ lifted: at });
        settle();
    };
    const hold = (p: Pt, done: () => boolean): void => {
        until(done, { touch: p });
        run({ lifted: p });
        settle();
    };

    const take = (what: Held["what"], at: () => Pt): void => {
        if (s.hand.what === what) return;
        if (hands === "touch") tap(at());
        else use(at());
        if (s.hand.what !== what) stuck = true;
    };

    const a = L.ask;
    const crop = a?.crop ?? "carrot";
    const span = SPAN[crop];
    const cropAt = Math.max(0, L.crops.indexOf(crop));
    const jobs = L.beds.flatMap((b, i) => (b.job || !a ? [i] : []));
    const sowIn = a ? jobs : [0];

    // sow
    for (const bi of sowIn) {
        const b = s.g.beds[bi];
        if (!b) return null;
        const shape: Shape | null =
            a?.rows !== undefined && a.cols !== undefined
                ? { rows: a.rows, cols: a.cols }
                : a
                  ? shapeFor(a.count ?? (a.want ? a.want.customers * a.want.each : 0), b, span)
                  : { rows: 2, cols: 2 };
        if (!shape) return null;
        if (s.hand.what !== "seed") take("seed", () => s.packets[cropAt] ?? packetAt(cropAt));
        const corner = cellMiddle(b, 0, 0),
            far = cellMiddle(b, (shape.cols - 1) * span, (shape.rows - 1) * span);
        if (hands === "touch") drag([corner, far]);
        else {
            walk({ x: corner.x, y: b.y - 0.7 });
            turn({ x: corner.x, y: b.y + 1 });
            press();
            walk(shape.rows === 1 ? { x: far.x, y: b.y - 0.7 } : far, 0.3);
            press();
        }
        if (stuck) return null;
    }

    const litre = GARDEN.litre.value;
    const inFlight = () => s.water.tags.length * litre;
    const growing = () => s.g.plants.some((p) => !isRipe(p, nightOf(s)));

    // the nights, until everything sown is ripe
    for (let day = 0; day < 10 && growing(); day++) {
        const n = nightOf(s);
        for (const [bi, b] of s.g.beds.entries()) {
            const need = thirst(s.g, bi, n);
            if (need <= 0) continue;
            const target = n.exact
                ? n.exact.litres
                : n.rain > 0 && b.water + n.rain >= need
                  ? 0
                  : Math.max(0, need + 0.3 - b.water);
            if (target <= 0) continue;
            const startWater = b.water;
            const reached = () =>
                (n.exact ? b.today : b.water - startWater) + inFlight() >= target - 0.05;
            take("can", () => s.canAt);
            const mid = cellMiddle(b, Math.floor(b.cols / 2), 0);
            if (hands === "touch") hold(mid, reached);
            else {
                walk({ x: mid.x, y: b.y - 0.7 });
                turn({ x: mid.x, y: b.y + 1 });
                pressHeld(reached);
            }
            until(() => s.water.tags.length === 0);
            if (stuck) return null;
        }
        // shoo the snails and pull the weeds before the night
        for (let guard = 0; guard < 12 && (s.g.snails.length || s.g.weeds.length); guard++) {
            const x = s.g.snails[0] ?? s.g.weeds[0];
            const b = x ? s.g.beds[x.bed] : undefined;
            if (!x || !b) break;
            const at = cellMiddle(b, x.c, x.r);
            if (hands === "touch") tap(at);
            else use(at);
        }
        if (hands === "touch") tap(DIAL);
        else use(DIAL);
        idle(10);
        if (stuck) return null;
    }

    // pick everything ripe, with the basket
    const ripe = () =>
        s.g.plants
            .filter((p) => isRipe(p, nightOf(s)))
            .map((p) => {
                const b = s.g.beds[p.bed];
                return b ? cellMiddle(b, p.c, p.r, p.span) : null;
            })
            .filter((p): p is Pt => p !== null)
            .sort((p, q) => p.y - q.y || p.x - q.x);
    if (ripe().length) take("basket", () => s.basketAt);
    for (let guard = 0; guard < 6 && ripe().length; guard++) {
        const pts = ripe();
        if (hands === "touch") drag(pts);
        else {
            const first = pts[0];
            if (!first) break;
            walk(first, 1);
            turn(first);
            run({ go: true, tapped: true });
            for (const p of pts) walk(p, 0.6, true);
            run();
        }
        if (stuck) return null;
    }
    idle(40);

    // share the harvest between the crates
    if (a && s.crates.length) {
        const total = s.basket[crop] + s.crates.reduce((x, y) => x + y, 0);
        const per = a.want ? a.want.each : total / s.crates.length;
        for (let i = 0; i < s.crates.length; i++) {
            const full = () => (s.crates[i] ?? 0) >= per;
            const at = crateAt(s, i);
            if (hands === "touch") hold(at, full);
            else {
                walk(at, 1.6);
                turn(at);
                pressHeld(full);
            }
            if (stuck || (s.crates[i] ?? 0) !== per) return null;
        }
        idle(40);
    }
    if (!a) return acts;
    return s.won ? acts : null;
}

/** Plays acts into a fresh start of a configuration. */
export function replay(c: GardenConfiguration, acts: readonly Act[]): GardenState {
    const s = openGardenConfiguration(c);
    for (const act of acts) {
        if ("pad" in act) gardenGame.step(s, copy(act.pad));
        else gardenGame.command?.(s, act.command);
    }
    return s;
}
