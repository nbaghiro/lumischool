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
const snap = (v: number) => Math.round(v / SQ) * SQ;

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

export interface RollInput {
    days: Day[];
    next: Next | null;
    terms: number;
    /** The world each term is in. */
    worldOf(term: number): string;
    /** A sheet's measured height, in world units. */
    height(lesson: string): number;
    /** What a world places beside the path, in order. */
    scenery(world: string): { landmarks: string[]; creatures: string[] };
    /** A drawing's size in the world, for placing it clear of the paper. */
    size(art: string): { w: number; h: number };
    /**
     * The landmark or creature that belongs beside this day's lessons, if the world has one, and which
     * of the day's sheets it belongs beside.
     */
    reach?(day: Day, world: string): { art: string; says: string; sheet: number } | null;
    /** The drawing a world's moment is, and the one tucked away in it, by art id. */
    story?(world: string): { moment: string; secret: string } | null;
    /**
     * Lay every term out as a world with no lessons yet, walked from its gate to its moment past its
     * landmarks and creatures, with nothing on the path: a year the corpus has not written. `days` is
     * then ignored.
     */
    bare?: boolean;
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
        for (const [a, b, c, d] of this.segs) {
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

export function layoutRoll(input: RollInput, o: RollOptions = WIDE): RollLayout {
    if (input.bare) return layoutBare(input, o);
    const half = o.sheet / 2,
        x0 = -half - o.margin,
        x1 = half + o.margin;
    const laneX = (s: -1 | 1) => s * (half + o.lane);
    const rows: Row[] = [],
        stretches: Stretch[] = [],
        scenery: Scenery[] = [];
    const path: RollLayout["path"] = [];
    let y = 0;
    let next: Rect | null = null;

    for (let term = 1; term <= input.terms; term++) {
        const world = input.worldOf(term);
        const mine = input.days.filter((d) => d.term === term);
        const ahead = !mine.length;
        // a stretch the child has not reached gets its horizon only when it is the next one along, so
        // the roll ends where the year is going next rather than trailing every term still to come
        if (ahead && stretches.at(-1)?.ahead) break;
        if (ahead && !input.days.length) break;
        const hTop = y,
            line = snap(hTop + o.horizon * 0.62);
        const horizon = { x: x0, y: hTop, w: x1 - x0, h: o.horizon };
        const start = { x: laneX(-1), y: snap(hTop + o.horizon - o.band * 0.2) };
        y = hTop + o.horizon;
        const trail = new Trail();
        trail.move(start.x, start.y);
        let last: { x: number; y: number } = start;
        const own = input.scenery(world);
        let li = 0,
            ci = 0;
        mine.forEach((day, k) => {
            const side: -1 | 1 = k % 2 === 0 ? -1 : 1;
            const top = y,
                sheetsTop = snap(top + o.band);
            const sheets: Rect[] = [];
            let sy = sheetsTop;
            for (const id of day.lessons) {
                const h = snap(Math.max(400, input.height(id)));
                sheets.push({ x: -half, y: sy, w: o.sheet, h });
                sy += h + o.gap;
            }
            const bottom = sy - o.gap;
            const flag = { x: 0, y: snap(top + o.band * 0.6) };
            const row: Row = {
                day,
                world,
                rect: { x: x0, y: top, w: x1 - x0, h: bottom - top },
                sheets,
                side,
                flag,
            };
            rows.push(row);
            // into this day: from wherever the path was, through the date, to this day's margin
            const lx = laneX(side);
            if (k === 0) trail.curve(last.x, flag.y - 60, flag.x - 260, flag.y, flag.x, flag.y);
            else
                trail.curve(
                    last.x,
                    (last.y + flag.y) / 2,
                    flag.x - 300 * side,
                    flag.y,
                    flag.x,
                    flag.y,
                );
            trail.curve(
                flag.x + 300 * side,
                flag.y,
                lx,
                (flag.y + sheetsTop) / 2,
                lx,
                sheetsTop + 40,
            );
            // down the margin beside the sheets, swinging a little so it reads as walked rather than ruled
            const n = Math.max(1, Math.round((bottom - sheetsTop) / 700));
            for (let i = 1; i <= n; i++) {
                const yy = sheetsTop + 40 + ((bottom - sheetsTop - 40) * i) / n;
                const swing = side * (i % 2 ? 46 : 12);
                trail.smooth(lx + swing, yy - 180, lx, yy);
            }
            last = { x: lx, y: bottom };
            // scenery: something to pass on the far side and someone beside the path, spread down the row
            const far = -side as -1 | 1;
            // A drawing that belongs to this day's lesson stands first, level with the top of the sheet,
            // where a child starting the day sees it; the rest of the far margin follows below it.
            const reach = input.reach?.(day, world);
            let clearTop = 80;
            if (reach) {
                const sz = input.size(reach.art),
                    beside = at(sheets, Math.min(reach.sheet, sheets.length - 1));
                // a day's own drawing stands even when the margin cannot hold it at a size that
                // reads, since the day would otherwise lose the drawing its lesson reaches into
                const k = inMargin(reach.art, sz.w) ?? MARGIN_WIDE / Math.max(sz.w, 1);
                const w = sz.w * k;
                const cx = far * (half + BESIDE + w / 2);
                scenery.push({
                    art: reach.art,
                    kind: "reach",
                    side: far,
                    row: rows.length - 1,
                    at: { x: cx - w / 2, y: beside.y + 40 },
                    says: reach.says,
                    ...(k === 1 ? {} : { k }),
                });
                // the rest of the far margin starts below it, or below the first sheet's top when it is further down
                clearTop = reach.sheet > 0 ? 80 : 40 + sz.h * k + 260;
            }
            const run = Math.max(200, bottom - sheetsTop - clearTop);
            const slots = Math.max(1, Math.floor(run / 1000));
            for (let s = 0; s < slots && own.landmarks.length; s++) {
                // a drawing that is already standing beside this day for its lesson is not drawn twice
                let art = at(own.landmarks, li++ % own.landmarks.length);
                if (reach && art === reach.art && own.landmarks.length > 1)
                    art = at(own.landmarks, li++ % own.landmarks.length);
                if (reach && reach.sheet > 0) {
                    // keep clear of the drawing that stands beside the second sheet
                    const sz = input.size(art),
                        by = snap(sheetsTop + clearTop + ((s + 0.3) * run) / slots);
                    const r = sheets[reach.sheet],
                        rs = input.size(reach.art);
                    const rk = inMargin(reach.art, rs.w) ?? MARGIN_WIDE / Math.max(rs.w, 1);
                    if (r && by > r.y - 120 && by - sz.h < r.y + 40 + rs.h * rk + 300) continue;
                }
                const sz = input.size(art);
                // a drawing the margin cannot hold at a size that reads still stands, since
                // skipping every one of them empties the margins of most worlds; which drawings
                // want a narrower take is being measured
                const k = inMargin(art, sz.w) ?? MARGIN_WIDE / Math.max(sz.w, 1);
                const w = sz.w * k;
                // beside the paper, where a child reading sees it whole, and never on it
                const cx = far * (half + BESIDE + w / 2);
                const by = snap(sheetsTop + clearTop + ((s + 0.3) * run) / slots);
                scenery.push({
                    art,
                    kind: "landmark",
                    side: far,
                    row: rows.length - 1,
                    at: { x: cx - w / 2, y: by - sz.h * k },
                    ...(k === 1 ? {} : { k }),
                });
            }
            if (own.creatures.length && (k % 2 === 0 || bottom - sheetsTop > 1600)) {
                const art = at(own.creatures, ci++ % own.creatures.length);
                const sz = input.size(art);
                const cx = lx + side * (o.lane * 0.2 + sz.w / 2 + 40);
                const by = snap(sheetsTop + (bottom - sheetsTop) * 0.46);
                scenery.push({
                    art,
                    kind: "creature",
                    side,
                    row: rows.length - 1,
                    at: { x: cx - sz.w / 2, y: by - sz.h },
                });
            }
            y = bottom;
        });

        if (!ahead && input.next && input.next.term === term) {
            // what comes next is a closed sheet under today, in the same column: a title and nothing to
            // open yet, because the journal holds what has been done and the map holds what is planned
            const top = snap(y + o.band * 0.9);
            next = { x: -half + o.sheet * 0.14, y: top, w: o.sheet * 0.72, h: snap(o.band * 0.62) };
            trail.curve(
                last.x,
                top - 120,
                next.x - 120,
                top + next.h / 2,
                next.x,
                top + next.h / 2,
            );
            last = { x: next.x + next.w, y: top + next.h / 2 };
            y = top + next.h;
        }
        const groundTop = line;
        const end = ahead ? y + o.band * 1.2 : y + o.band;
        const story = !ahead ? input.story?.(world) : null;
        if (story) {
            // the moment, in the band between the last thing on the stretch and the next world's sky,
            // outside the path's lane on the right, with room under it for its line
            // the drawing's box leaves room under it for its line, which stays three squares above the next sky
            const x = half + o.lane + (o.sheet >= 600 ? 100 : 60),
                box = { x, y: y + 40, w: x1 - 30 - x, h: end - 60 - (y + 40) - 100 };
            const sz = input.size(story.moment),
                k = Math.min(1, box.w / Math.max(1, sz.w), box.h / Math.max(1, sz.h));
            scenery.push({
                art: story.moment,
                kind: "moment",
                side: 1,
                row: rows.length - 1,
                k,
                at: { x: box.x + (box.w - sz.w * k) / 2, y: box.y + box.h - sz.h * k },
            });
            // the secret, at the far edge of the world above its third day, well off the path
            const third = rows.filter((r) => r.day.term === term)[2];
            if (third) {
                const ss = input.size(story.secret),
                    sk = Math.min(0.8, 150 / Math.max(1, ss.w), 130 / Math.max(1, ss.h)),
                    far = -third.side;
                const sx = far > 0 ? x1 - 50 - ss.w * sk : x0 + 50;
                scenery.push({
                    art: story.secret,
                    kind: "secret",
                    side: far as -1 | 1,
                    row: rows.indexOf(third),
                    k: sk,
                    at: { x: sx, y: third.rect.y + 30 },
                });
            }
        }
        if (ahead) {
            // a stub of path into a world not reached yet, and no further
            trail.curve(start.x, start.y + 200, start.x * 0.3, end - 200, 0, end - 80);
        } else if (stretches.length || rows.length) {
            // on to the edge of this world, where the next one's horizon begins
            trail.curve(last.x, end - 120, laneX(-1) * 0.4, end - 40, laneX(-1), end + 10);
        }
        stretches.push({
            term,
            world,
            horizon,
            line,
            ground: { x: x0, y: groundTop, w: x1 - x0, h: end - groundTop },
            ahead,
            start,
        });
        path.push({ world, d: trail.d, ahead, samples: trail.samples(12) });
        y = snap(end);
    }

    const bounds = { x: x0, y: 0, w: x1 - x0, h: Math.max(1, y) };
    return { o, rows, stretches, path, next, scenery, bounds, x0, x1 };
}

/**
 * A roll whose worlds have no lessons yet. Each is walked as a real world would be, from its gate
 * down past its landmarks and creatures to its moment at the foot, drawn in pencil until lessons
 * exist to ink it, and a card at the top of the column says the lessons are still to come. Nothing
 * is made up to fill it: the path is simply empty.
 */
function layoutBare(input: RollInput, o: RollOptions): RollLayout {
    const half = o.sheet / 2,
        x0 = -half - o.margin,
        x1 = half + o.margin,
        laneX = (s: -1 | 1) => s * (half + o.lane);
    const stretches: Stretch[] = [],
        scenery: Scenery[] = [],
        path: RollLayout["path"] = [];
    const run = o.sheet >= 600 ? 3600 : 3000,
        swing = o.sheet >= 600 ? 240 : 110;
    let y = 0;
    for (let term = 1; term <= input.terms; term++) {
        const world = input.worldOf(term),
            own = input.scenery(world);
        const hTop = y,
            line = snap(hTop + o.horizon * 0.62);
        const horizon = { x: x0, y: hTop, w: x1 - x0, h: o.horizon };
        const start = { x: laneX(-1), y: snap(hTop + o.horizon - o.band * 0.2) };
        const top = hTop + o.horizon,
            card = {
                x: -half + o.sheet * 0.14,
                y: snap(top + o.band * 0.35),
                w: o.sheet * 0.72,
                h: snap(o.band * 0.7),
            };
        const bottom = top + run,
            end = bottom + o.band;
        const trail = new Trail();
        trail.move(start.x, start.y);
        // round the card, then down the middle of the world, swinging from side to side as a path does
        trail.curve(
            start.x,
            card.y + card.h / 2,
            card.x - 140,
            card.y + card.h + 60,
            0,
            card.y + card.h + 120,
        );
        const legs = Math.max(2, Math.round((bottom - card.y - card.h - 120) / 560));
        for (let i = 1; i <= legs; i++) {
            const yy = card.y + card.h + 120 + ((bottom - card.y - card.h - 120) * i) / legs;
            trail.smooth(
                (i % 2 ? swing : -swing) * 1.4,
                yy - 280,
                i === legs ? 0 : i % 2 ? swing : -swing,
                yy,
            );
        }
        trail.curve(0, end - 160, laneX(-1) * 0.4, end - 40, laneX(-1), end + 10);
        // what stands beside the path: landmarks down alternate margins, creatures beside the path between
        const along = (at: number) => Math.max(0, Math.min(1, (at - top) / run));
        own.landmarks.forEach((art, k) => {
            const sz = input.size(art),
                side: -1 | 1 = k % 2 ? 1 : -1,
                by = snap(
                    card.y + card.h + 520 + k * ((run - 900) / Math.max(1, own.landmarks.length)),
                );
            const cx = side * (half + Math.max(o.margin * 0.4, sz.w / 2 + 70));
            scenery.push({
                art,
                kind: "landmark",
                side,
                row: -1,
                world,
                along: along(by),
                at: { x: cx - sz.w / 2, y: by - sz.h },
            });
        });
        own.creatures.forEach((art, k) => {
            const sz = input.size(art),
                side: -1 | 1 = k % 2 ? -1 : 1,
                by = snap(
                    card.y + card.h + 820 + k * ((run - 1100) / Math.max(1, own.creatures.length)),
                );
            const cx = side * (swing + sz.w / 2 + 60);
            scenery.push({
                art,
                kind: "creature",
                side,
                row: -1,
                world,
                along: along(by),
                at: { x: cx - sz.w / 2, y: by - sz.h },
            });
        });
        const story = input.story?.(world);
        if (story) {
            const x = half + o.lane + (o.sheet >= 600 ? 100 : 60),
                box = { x, y: bottom - 400, w: x1 - 30 - x, h: end - 60 - (bottom - 400) - 100 };
            const sz = input.size(story.moment),
                k = Math.min(1, box.w / Math.max(1, sz.w), box.h / Math.max(1, sz.h));
            scenery.push({
                art: story.moment,
                kind: "moment",
                side: 1,
                row: -1,
                world,
                along: 1,
                k,
                at: { x: box.x + (box.w - sz.w * k) / 2, y: box.y + box.h - sz.h * k },
            });
        }
        stretches.push({
            term,
            world,
            horizon,
            line,
            ground: { x: x0, y: line, w: x1 - x0, h: end - line },
            ahead: false,
            start,
            card,
        });
        path.push({ world, d: trail.d, ahead: false, samples: trail.samples(12) });
        y = snap(end);
    }
    return {
        o,
        rows: [],
        stretches,
        path,
        next: null,
        scenery,
        bounds: { x: x0, y: 0, w: x1 - x0, h: Math.max(1, y) },
        x0,
        x1,
        bare: true,
    };
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
