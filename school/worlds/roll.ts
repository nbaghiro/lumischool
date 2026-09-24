// The journal's geometry: a year as one roll of paper, one sheet wide, running downward.
//
// A day is a row. Its sheets sit in the one column, one under the other, and the world is drawn in
// the margins either side. Days run down the roll in the order they were done, so the past is
// always straight up and today is the bottom of what has been written. The path runs down one
// margin beside a day's sheets, crosses under them to the date of the next day, and runs down the
// other margin beside that one, so it passes every day and never crosses paper.
//
// A term is a stretch of the roll, and each stretch is in one world. It starts with that world's
// horizon, drawn side on: the sky, a far row of drawings along the horizon and the thing you arrive
// at. Below the horizon the ground opens out and the days begin.
//
// Pure: the same days and the same sheet heights always lay out the same way, which is what lets a
// child's working be kept beside the day it was done on. Heights come from the browser, so the page
// measures the sheets and passes them in. Everything is snapped to whole squares so a sheet's own
// grid lines up with the paper under the world.
import {
    at,
    BLEED,
    FADE,
    type Pt,
    type Rect,
    type RollOptions,
    type Day,
    type Next,
    type Row,
    type Stretch,
    type Scenery,
    type RollLayout,
    type Sample,
} from "../../engine/space";
import { U } from "../../engine/paper";
import { artById } from "./art";
import { pathOrder, type Year } from "../year";
import type { Progress } from "../record/record";

export const SQ = 20;

/**
 * A drawing in the far margin stands this far clear of the sheet's edge and is drawn no wider than
 * this, so the whole of it and the line under it are in the window while a child reads. Measured: a
 * laptop of 1440 reads a roll at zoom 1 and shows 720 units either side of the middle, which is
 * half a sheet of 840 plus 70 plus 230. The line under a reach keeps the same envelope, which is
 * `.j-reach` in engine/ui/world.css. */
export const BESIDE = 70;
export const MARGIN_WIDE = 230;
/**
 * And never at fewer pixels than this for one of the drawing's own squares, since what decides
 * whether a drawing reads is the size of a square rather than its width. The rule has two halves
 * (the map art lead's shots). A landmark in a margin is recognised beside the sheet rather than
 * answered, and twelve pixels a square is enough for that: a range at 12.1 still reads as three
 * snow-capped mountains with its shading and the zigzag under the snow. A drawing that carries
 * words or parts meant to be counted needs question size, about twenty, so it belongs on the sheet
 * or in a narrower take rather than in a margin; that is fineness rather than width, and it is what
 * actually fails. Six drawings are under this floor today (the train, the ramp, the departures
 * board, the fossil, the planets and the magnet); each wants a narrower take rather than a ban, so
 * they stand capped until those are drawn. */
export const MARGIN_SQUARE = 12;

/**
 * How much of its own size a drawing is drawn at in the far margin, or null when it cannot be shown
 * there and still read. A drawing narrower than the margin's width is drawn whole.
 */
export function inMargin(art: string, w: number): number | null {
    if (w <= MARGIN_WIDE) return 1;
    const squares = w / (U * (artById(art)?.scale ?? 1));
    return MARGIN_WIDE / squares >= MARGIN_SQUARE ? MARGIN_WIDE / w : null;
}

export const WIDE: RollOptions = {
    sheet: 840,
    margin: 760,
    band: 340,
    horizon: 1480,
    gap: 120,
    lane: 110,
};
export const NARROW: RollOptions = {
    sheet: 380,
    margin: 300,
    band: 300,
    horizon: 1320,
    gap: 100,
    lane: 70,
};

export const addDays = (iso: string, n: number): string =>
    new Date(new Date(`${iso}T00:00:00Z`).valueOf() + n * 864e5).toISOString().slice(0, 10);

/** Which term a unit is in. The map draws three units to a row, and a row is a term; this agrees. */
export function termOf(year: Year, unit: number): number {
    const i = year.units.findIndex((u) => u.n === unit);
    return Math.floor(Math.max(0, i) / 3) + 1;
}

export const termsIn = (year: Year): number => Math.max(1, Math.ceil(year.units.length / 3));

/**
 * The year's lessons as the days they fall into: a maths lesson starts a day and a lesson from
 * another track joins it, two at most. A lesson from another track keeps the week of the maths lesson
 * it sits beside: the year model gives it a placeholder week of its own, and the journal's dates would
 * run backwards on it.
 */
/**
 * The one lesson a child stands at on a day that holds several: the maths lesson when there is one,
 * since maths is the path and every other subject hangs off it, and otherwise the last of them in
 * the year's order. It was once the last of them whatever their subjects, which read as deliberate
 * and was not: an aside is spread along the whole path by `hostOf` in school/year.ts, so on any
 * weekday whose aside hung further along than the day's maths the child stood a term ahead on the
 * map, and their roll opened in that world. Which weekday that was depended on which day each
 * subject fell on, so a child's place moved with the timetable rather than with their work. */
export function standingAt(year: Year, now: readonly string[]): string | undefined {
    const mine = pathOrder(year).filter((l) => now.includes(l.id));
    return (mine.find((l) => !l.branch) ?? mine.at(-1))?.id;
}

export function dayGroups(year: Year): { lessons: string[]; week: number; unit: number }[] {
    const groups: { lessons: string[]; week: number; unit: number }[] = [];
    for (const l of pathOrder(year)) {
        const last = groups.at(-1);
        if (l.branch && last && last.lessons.length < 2) last.lessons.push(l.id);
        else
            groups.push({
                lessons: [l.id],
                week: l.branch && last ? last.week : l.week,
                unit: l.unit,
            });
    }
    return groups;
}

/**
 * The days a child has done, and today, read off the year and the child's record. A maths lesson
 * starts a day and the lessons from other tracks that sit beside it join that day, two sheets at
 * most, so a family doing everything does about two lessons a day, which is what tracks.md says a
 * year is. Nothing here names a lesson: rewrite the curriculum and the days follow.
 *
 * Today is the day of the record's next lesson, with the lessons beside it. `now`, the lessons the
 * plan says the child is on (`nowOf` in rewards.ts), overrides that: today is the day of the one the
 * child stands at (`standingAt`) and holds all of them, so a lesson of any track the plan has on can
 * be today, whether or not it shares a day with a maths lesson.
 */
export function daysOf(
    year: Year,
    progress: Progress,
    keep: (lesson: string) => boolean = () => true,
    now?: readonly string[],
): { days: Day[]; next: Next | null } {
    const order = pathOrder(year);
    const groups = dayGroups(year);
    const standing = now ? standingAt(year, now) : progress.current;
    const upto =
        standing === undefined ? -1 : groups.findIndex((g) => g.lessons.includes(standing));
    const days: Day[] = [];
    const seen = new Map<number, number>();
    groups.forEach((g, i) => {
        if (upto >= 0 && i > upto) return;
        const today = i === upto;
        // a day behind the child holds what was done on it; today holds what is planned for it, in the tracks the plan has on
        const lessons = today
            ? (now ? order.map((l) => l.id).filter((id) => now.includes(id)) : g.lessons).filter(
                  keep,
              )
            : g.lessons.filter((id) => progress.done[id] && !now?.includes(id));
        if (!lessons.length) return;
        const k = seen.get(g.week) ?? 0;
        seen.set(g.week, k + 1);
        days.push({
            id: `day-${g.lessons[0]}`,
            n: days.length + 1,
            term: termOf(year, g.unit),
            lessons,
            state: today ? "today" : "done",
            date: addDays(year.started, (g.week - 1) * 7 + Math.min(4, k)),
        });
    });
    // the closed sheet for next time is the next lesson still to do in the tracks kept
    const ahead = (g: { lessons: string[] }) =>
        g.lessons.find((id) => keep(id) && !progress.done[id] && !now?.includes(id));
    const after = upto >= 0 ? groups.slice(upto + 1).find((g) => ahead(g)) : undefined;
    const aheadId = after && ahead(after);
    const nextDef = aheadId && year.lessons.find((l) => l.id === aheadId);
    return {
        days,
        next:
            nextDef && after
                ? { id: nextDef.id, title: nextDef.title, term: termOf(year, after.unit) }
                : null,
    };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

type P = [number, number];

/**
 * The path, kept twice: as SVG path data for the plain band under it, and as the cubic curves it is
 * made of, so it can be walked a stride at a time without asking the browser. Asking the browser for
 * a point along a long path is slow enough, a few thousand times a stretch, that it was most of the
 * time the journal took to open.
 */
export class Trail {
    d = "";
    private segs: [P, P, P, P][] = [];
    private sections = new Set<number>();
    section(): void {
        this.sections.add(this.segs.length);
    }
    private at: P = [0, 0];
    private c2: P = [0, 0];
    move(x: number, y: number): void {
        this.d = `M${r1(x)} ${r1(y)}`;
        this.at = [x, y];
        this.c2 = [x, y];
    }
    curve(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
        this.d += `C${r1(x1)} ${r1(y1)} ${r1(x2)} ${r1(y2)} ${r1(x)} ${r1(y)}`;
        this.segs.push([this.at, [x1, y1], [x2, y2], [x, y]]);
        this.c2 = [x2, y2];
        this.at = [x, y];
    }
    /** A curve whose first control point is the last one's second, reflected: SVG's S. */
    smooth(x2: number, y2: number, x: number, y: number): void {
        const x1 = 2 * this.at[0] - this.c2[0],
            y1 = 2 * this.at[1] - this.c2[1];
        this.d += `S${r1(x2)} ${r1(y2)} ${r1(x)} ${r1(y)}`;
        this.segs.push([this.at, [x1, y1], [x2, y2], [x, y]]);
        this.c2 = [x2, y2];
        this.at = [x, y];
    }
    /** Points a stride apart along the whole path. */
    samples(step: number): Sample[] {
        const pts: { x: number; y: number; s: number }[] = [];
        let s = 0,
            next = 0;
        for (const [index, [a, b, c, d]] of this.segs.entries()) {
            if (this.sections.has(index)) {
                s = 0;
                next = 0;
            }
            let px = a[0],
                py = a[1];
            for (let i = 1; i <= 32; i++) {
                const t = i / 32,
                    u = 1 - t;
                const x =
                    u * u * u * a[0] +
                    3 * u * u * t * b[0] +
                    3 * u * t * t * c[0] +
                    t * t * t * d[0];
                const y =
                    u * u * u * a[1] +
                    3 * u * u * t * b[1] +
                    3 * u * t * t * c[1] +
                    t * t * t * d[1];
                const len = Math.hypot(x - px, y - py);
                while (next <= s + len && len > 0) {
                    const f = (next - s) / len;
                    pts.push({ x: px + (x - px) * f, y: py + (y - py) * f, s: next });
                    next += step;
                }
                s += len;
                px = x;
                py = y;
            }
        }
        return pts.map((q, i) => {
            const a = at(pts, Math.max(0, i - 1)),
                b = at(pts, Math.min(pts.length - 1, i + 1));
            const dx = b.x - a.x,
                dy = b.y - a.y,
                L = Math.hypot(dx, dy) || 1;
            return { ...q, nx: -dy / L, ny: dx / L };
        });
    }
}

/** A stretch's sky: from the top of its horizon down to the horizon line, as wide as the washes run. */
export const skyOf = (l: RollLayout, s: Stretch): Rect => ({
    x: l.x0 - BLEED,
    y: s.horizon.y,
    w: l.x1 - l.x0 + BLEED * 2,
    h: s.line - s.horizon.y,
});

/**
 * Where a stretch's name is written, and the most room it takes: the size journal.css draws it at,
 * at the largest it grows to as the child steps back, at each width. A long name grows less, so it
 * never reaches the fade at the sky's edge, where light ink would be on paper. The page places the
 * name here and the test holds it inside the part of the sky whose colours its ink was checked on.
 */
export function nameBox(
    l: RollLayout,
    s: Pick<Stretch, "horizon">,
    name = "The laboratory",
): Rect & { k: number } {
    const wide = l.o.sheet >= 600,
        size = wide ? 172 : 96,
        grow = wide ? 1.6 : 1.3;
    const x = l.x0 + 120,
        est = Math.max(6, name.length) * size * 0.56 + 30;
    // it stays inside the world's own width, which is all a phone shows at a world's arrival, and short of the sky's fade
    const X0 = l.x0 - BLEED,
        X1 = l.x1 + BLEED,
        right = Math.min(X1 - (X1 - X0) * FADE - 40, l.x1 - 40);
    // a long name on a narrow roll is written a little smaller rather than past the edge
    const k = Math.max(0.6, Math.min(grow, (right - x) / est));
    return { x, y: s.horizon.y + 170, w: est * k, h: (size * 0.95 + (wide ? 44 : 36) + 10) * k, k };
}

/**
 * Where the drawings up in a world's sky hang, as boxes in world units at the size they are drawn.
 * A moon that would sit behind the world's name waits below it instead: on a deep sky the name is in
 * light ink, and light ink over a yellow moon is the one place it could not be read.
 */
export function skyPlaces(
    world: {
        name: string;
        horizon: { sky?: { art: string; at: number; k?: number; down?: number }[] };
    },
    l: RollLayout,
    s: Pick<Stretch, "horizon" | "line">,
    size: (art: string) => { w: number; h: number },
): { art: string; k: number; box: Rect }[] {
    const H = s.horizon,
        nb = nameBox(l, s, world.name);
    return (world.horizon.sky ?? []).map((f) => {
        const sz = size(f.art),
            k = f.k ?? 1;
        // scaled from the middle of its top edge, as the page draws it
        const w = sz.w * k,
            h = sz.h * k,
            cx = H.x + H.w * f.at;
        let y = H.y + (s.line - H.y) * (f.down ?? 0.1);
        if (cx - w / 2 < nb.x + nb.w + 60 && y < nb.y + nb.h + 20) y = nb.y + nb.h + 20;
        return { art: f.art, k, box: { x: cx - w / 2, y, w, h } };
    });
}

/** Where the guide stands at the gate saying the arrival line, which is read, so it is on the ground and never on a sky. */
export const greetAt = (s: Stretch): Pt => ({ x: s.start.x + 120, y: s.start.y - 230 });

/** The row a world point belongs to: the day whose band or sheets it is in, or the last one above it. */
export function rowAt(l: RollLayout, p: Pt): Row | undefined {
    let found: Row | undefined;
    for (const r of l.rows) if (p.y >= r.rect.y - l.o.band * 0.5) found = r;
    return found;
}

/** Scenery never sits on paper: every drawing keeps `clear` from every sheet. For the test and for the page's own guard. */
export function overlapsPaper(
    l: RollLayout,
    sizeOf: (art: string) => { w: number; h: number },
    clear: number,
): Scenery[] {
    const hits: Scenery[] = [];
    for (const s of l.scenery) {
        const sz = sizeOf(s.art),
            k = s.k ?? 1,
            a = {
                x: s.at.x - clear,
                y: s.at.y - clear,
                w: sz.w * k + clear * 2,
                h: sz.h * k + clear * 2,
            };
        for (const r of l.rows)
            for (const b of r.sheets) {
                if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)
                    hits.push(s);
            }
    }
    return hits;
}
