// A garden's rules as plain data: beds, the plants sown in them, the litres each bed holds, and what
// a night does to them. See .docs/engine.md.
import type { Pt } from "./geometry";

export interface Bed {
    /** The bed's top-left corner, in squares. */
    x: number;
    y: number;
    cols: number;
    rows: number;
    /** Squares a cell is across. */
    cell: number;
    /** Litres in the soil now. */
    water: number;
    /** Litres poured or run in since the last night, for a level that measures each day's watering. */
    today: number;
}

export interface Plant {
    bed: number;
    /** The plant's top-left cell. */
    c: number;
    r: number;
    crop: string;
    /** Cells across and down the plant takes. */
    span: number;
    /** Nights it has grown. */
    age: number;
    /** Why it did not grow last night, for the drawing and the words. */
    rest: "fine" | "dry" | "soggy" | "weeded" | "eaten";
}

export interface Weed {
    bed: number;
    c: number;
    r: number;
}

export interface Snail {
    /** The plant it sits on, by its place, so it outlives the list's order. */
    bed: number;
    c: number;
    r: number;
}

export interface Garden {
    beds: Bed[];
    plants: Plant[];
    weeds: Weed[];
    snails: Snail[];
    /** The nights gone. */
    day: number;
}

/** A rectangle of plants in a bed: its top-left cell, and how many plants across and down. */
export interface Sowing {
    bed: number;
    c: number;
    r: number;
    cols: number;
    rows: number;
    span: number;
}

export const bed = (x: number, y: number, cols: number, rows: number, cell = 2): Bed => ({
    x,
    y,
    cols,
    rows,
    cell,
    water: 0,
    today: 0,
});

export const garden = (beds: Bed[]): Garden => ({
    beds,
    plants: [],
    weeds: [],
    snails: [],
    day: 0,
});

/** The bed and cell under a point, or null on the paths and the lawn. */
export function cellAt(beds: readonly Bed[], p: Pt): { bed: number; c: number; r: number } | null {
    for (const [i, b] of beds.entries()) {
        const c = Math.floor((p.x - b.x) / b.cell),
            r = Math.floor((p.y - b.y) / b.cell);
        if (c >= 0 && r >= 0 && c < b.cols && r < b.rows) return { bed: i, c, r };
    }
    return null;
}

/** The middle of a block of cells `span` across, from its top-left cell. */
export const cellMiddle = (b: Bed, c: number, r: number, span = 1): Pt => ({
    x: b.x + (c + span / 2) * b.cell,
    y: b.y + (r + span / 2) * b.cell,
});

/**
 * The rectangle a finger drags out from the cell it started on to the cell it is over, counted in
 * plants of `span` cells and kept inside the bed: the anchor is snapped to the plant grid, so a
 * pumpkin's rows line up however the drag began.
 */
export function sowingFrom(
    beds: readonly Bed[],
    bedAt: number,
    from: { c: number; r: number },
    to: { c: number; r: number },
    span: number,
): Sowing | null {
    const b = beds[bedAt];
    if (!b) return null;
    const across = Math.floor(b.cols / span),
        down = Math.floor(b.rows / span);
    if (across < 1 || down < 1) return null;
    const pc = (c: number) => Math.min(across - 1, Math.max(0, Math.floor(c / span))),
        pr = (r: number) => Math.min(down - 1, Math.max(0, Math.floor(r / span)));
    const c0 = Math.min(pc(from.c), pc(to.c)),
        c1 = Math.max(pc(from.c), pc(to.c)),
        r0 = Math.min(pr(from.r), pr(to.r)),
        r1 = Math.max(pr(from.r), pr(to.r));
    return {
        bed: bedAt,
        c: c0 * span,
        r: r0 * span,
        cols: c1 - c0 + 1,
        rows: r1 - r0 + 1,
        span,
    };
}

/** The plants' top-left cells a sowing would put in, row by row. */
export function holes(s: Sowing): { c: number; r: number }[] {
    const out: { c: number; r: number }[] = [];
    for (let j = 0; j < s.rows; j++)
        for (let i = 0; i < s.cols; i++) out.push({ c: s.c + i * s.span, r: s.r + j * s.span });
    return out;
}

const covers = (p: { c: number; r: number; span: number }, c: number, r: number) =>
    c >= p.c && c < p.c + p.span && r >= p.r && r < p.r + p.span;

/** The plant covering a cell, or null. */
export function plantAt(g: Garden, bedAt: number, c: number, r: number): Plant | null {
    return g.plants.find((p) => p.bed === bedAt && covers(p, c, r)) ?? null;
}

/** Whether a block of cells is bare soil: no plant and no weed in any of it. */
export function bare(g: Garden, bedAt: number, c: number, r: number, span: number): boolean {
    for (let j = 0; j < span; j++)
        for (let i = 0; i < span; i++) {
            if (plantAt(g, bedAt, c + i, r + j)) return false;
            if (g.weeds.some((w) => w.bed === bedAt && w.c === c + i && w.r === r + j))
                return false;
        }
    return true;
}

/** Sows `crop` in every bare hole of a sowing and gives back how many went in. */
export function sow(g: Garden, s: Sowing, crop: string): number {
    let n = 0;
    for (const h of holes(s))
        if (bare(g, s.bed, h.c, h.r, s.span)) {
            g.plants.push({ bed: s.bed, c: h.c, r: h.r, crop, span: s.span, age: 0, rest: "fine" });
            n++;
        }
    return n;
}

/** Ground where water runs down to a bed: a slope above it, in squares. */
export interface Runoff {
    x: number;
    y: number;
    w: number;
    h: number;
    into: number;
}

/**
 * Where water landing at a point ends up: the bed it lands in, or the bed below a slope it lands on,
 * or nowhere when it soaks into the lawn. Gives back the bed it went to.
 */
export function water(
    g: Garden,
    p: Pt,
    litres: number,
    runoff: readonly Runoff[] = [],
): number | null {
    const at = cellAt(g.beds, p);
    const slope = runoff.find(
        (z) => p.x >= z.x && p.x < z.x + z.w && p.y >= z.y && p.y < z.y + z.h,
    );
    const into = at ? at.bed : slope ? slope.into : null;
    const b = into === null ? undefined : g.beds[into];
    if (!b || into === null) return null;
    b.water += litres;
    b.today += litres;
    return into;
}

/** How a night is spent: what each growing plant drinks, and what makes a bed too wet. */
export interface Night {
    /** Litres each growing plant drinks in a night. */
    drink: number;
    /** A bed holding more than this many nights' drink stands in water and grows nothing. */
    soggy: number;
    /** Litres of rain on every bed tonight. */
    rain: number;
    /** Where a level measures each day's watering instead: the litres a bed must have had today, and how near is near enough. */
    exact?: { litres: number; within: number };
    /** Nights from sowing to ripe, for a crop. */
    ripe: (crop: string) => number;
}

/** A plant's stage from its age: sown, sprouted, growing, ripe. */
export function stage(p: Plant, ripe: number): 0 | 1 | 2 | 3 {
    if (p.age <= 0) return 0;
    if (p.age >= ripe) return 3;
    if (ripe <= 2) return 1;
    return p.age * 2 < ripe ? 1 : 2;
}

/** Whether a plant is ripe to pick. */
export const isRipe = (p: Plant, n: Night): boolean => p.age >= n.ripe(p.crop);

/** Litres a bed's growing plants drink in a night. */
export function thirst(g: Garden, bedAt: number, n: Night): number {
    return (
        g.plants.filter((p) => p.bed === bedAt && !isRipe(p, n)).reduce((a, p) => a + p.span, 0) *
        n.drink
    );
}

/** Whether a bed is standing in water. */
export function soggy(g: Garden, bedAt: number, n: Night): boolean {
    const b = g.beds[bedAt];
    const need = thirst(g, bedAt, n);
    if (!b || need <= 0) return false;
    return n.exact ? b.today > n.exact.litres + n.exact.within : b.water > need * n.soggy;
}

const weedBeside = (g: Garden, p: Plant) =>
    g.weeds.some(
        (w) =>
            w.bed === p.bed &&
            w.c >= p.c - 1 &&
            w.c <= p.c + p.span &&
            w.r >= p.r - 1 &&
            w.r <= p.r + p.span &&
            !covers(p, w.c, w.r),
    );

/**
 * A night: rain falls, each bed's growing plants drink if they can, and grow a day unless the bed is
 * dry or soggy, a weed beside them drank their water, or a snail on them ate them back. A soggy bed
 * drains towards what it can hold. Gives back how many plants grew.
 */
export function night(g: Garden, n: Night): number {
    let grew = 0;
    for (const [i, b] of g.beds.entries()) {
        b.water += n.rain;
        const need = thirst(g, i, n);
        const ok = n.exact
            ? Math.abs(b.today - n.exact.litres) <= n.exact.within
            : b.water >= need - 1e-9;
        const wet = soggy(g, i, n);
        for (const p of g.plants.filter((q) => q.bed === i && !isRipe(q, n))) {
            const eaten = g.snails.some((s) => s.bed === i && covers(p, s.c, s.r));
            if (eaten) {
                p.age = Math.max(1, p.age - 1);
                p.rest = "eaten";
            } else if (wet) p.rest = "soggy";
            else if (!ok) p.rest = "dry";
            else if (weedBeside(g, p)) p.rest = "weeded";
            else {
                p.age++;
                p.rest = "fine";
                grew++;
            }
        }
        if (n.exact) b.water = 0;
        else if (wet) b.water = need * n.soggy + (b.water - need * n.soggy) * 0.4;
        else if (ok) b.water = Math.max(0, b.water - need);
        b.today = 0;
    }
    g.snails = [];
    g.day++;
    return grew;
}

/** A number from nought to one fixed by three whole numbers, so a night's weeds come the same way every time. */
export function chance(a: number, b: number, c: number): number {
    const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
    return s - Math.floor(s);
}

/**
 * Weeds that come up overnight in bare cells beside growing plants, and snails that settle on them:
 * at most `weeds` and `snails` of each, picked by `seed` and the night so the same garden grows the
 * same way.
 */
export function pests(
    g: Garden,
    seed: number,
    o: { weeds: number; snails: number; ripe: (crop: string) => number },
): void {
    const growing = g.plants.filter((p) => p.age < o.ripe(p.crop));
    const spots: Weed[] = [];
    for (const p of growing)
        for (const [dc, dr] of [
            [-1, 0],
            [p.span, 0],
            [0, -1],
            [0, p.span],
        ] as const) {
            const c = p.c + dc,
                r = p.r + dr,
                b = g.beds[p.bed];
            if (!b || c < 0 || r < 0 || c >= b.cols || r >= b.rows) continue;
            if (!bare(g, p.bed, c, r, 1)) continue;
            if (spots.some((w) => w.bed === p.bed && w.c === c && w.r === r)) continue;
            spots.push({ bed: p.bed, c, r });
        }
    spots.sort(
        (a, b) =>
            chance(seed, g.day, a.bed * 997 + a.r * 31 + a.c) -
            chance(seed, g.day, b.bed * 997 + b.r * 31 + b.c),
    );
    g.weeds.push(...spots.slice(0, o.weeds));
    const prey = [...growing].sort(
        (a, b) =>
            chance(seed + 7, g.day, a.bed * 997 + a.r * 31 + a.c) -
            chance(seed + 7, g.day, b.bed * 997 + b.r * 31 + b.c),
    );
    g.snails = prey.slice(0, o.snails).map((p) => ({ bed: p.bed, c: p.c, r: p.r }));
}

/** The plants of a crop in a bed as an array, rows and plants in each row, when they make a full rectangle. */
export function arrayOf(
    g: Garden,
    bedAt: number,
    crop: string,
): { rows: number; cols: number } | null {
    const ps = g.plants.filter((p) => p.bed === bedAt && p.crop === crop);
    if (ps.length === 0) return null;
    const span = ps[0]?.span ?? 1;
    const cs = [...new Set(ps.map((p) => p.c))].sort((a, b) => a - b),
        rs = [...new Set(ps.map((p) => p.r))].sort((a, b) => a - b);
    const steps = (xs: number[]) => xs.every((x, i) => i === 0 || x - (xs[i - 1] ?? x) === span);
    if (!steps(cs) || !steps(rs) || cs.length * rs.length !== ps.length) return null;
    return { rows: rs.length, cols: cs.length };
}
