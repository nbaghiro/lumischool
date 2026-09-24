import {
    at,
    hash,
    type RollOptions,
    type Day,
    type Next,
    type Row,
    type Stretch,
    type Scenery,
    type RollLayout,
    type Rect,
} from "../../engine/space";
import { SQ, WIDE, Trail, inMargin, MARGIN_WIDE, BESIDE } from "./roll";
const snap = (v: number) => Math.round(v / SQ) * SQ;

export interface RollInput {
    days: Day[];
    next: Next | null;
    terms: number;
    onlyTerm?: number;
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

    for (let term = input.onlyTerm ?? 1; term <= (input.onlyTerm ?? input.terms); term++) {
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
        mine.forEach((day, k) => {
            let li = hash(`${world}-${day.id}-landmarks`);
            const ci = hash(`${world}-${day.id}-creature`);
            trail.section();
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
                const art = at(own.creatures, ci % own.creatures.length);
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
    for (let term = input.onlyTerm ?? 1; term <= (input.onlyTerm ?? input.terms); term++) {
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
