// A world's term as a place: a trail through the world's own land with a stop for each day of the
// term, the guide at today and the moment at the trail's end (.docs/journal.md, "A world as a place").
// A stop is placed by the day's number in the term and never by the height of its sheets, and the
// whole term is laid out from its first day, so nothing in the place moves as sheets grow or days are
// done. Pure, like the roll: the view builders in view.ts read it, and engine/ui draws the view.
import {
    BLEED,
    clamp,
    grow,
    hash,
    intersects,
    TILE,
    type Day,
    type GroundKind,
    type Next,
    type Pt,
    type Rect,
    type RollLayout,
    type Sample,
    type Scenery,
    type Stop,
    type StopState,
    type TrailLayout,
} from "../../engine/space";
import type { Year } from "../year";
import { dayGroups, NARROW, SQ, termOf, Trail, WIDE } from "./roll";

const snap = (v: number): number => Math.round(v / SQ) * SQ;

/**
 * How tall a day's paper stands on the trail, and how far its foot is above its stop. A run of the
 * trail is a tile apart from the next, so the box and the gap together stay inside one tile, and the
 * paper of one run never reaches the stops of the run above.
 */
const PAPER_H = 1040;
const PAPER_UP = 90;

/** A day of the term as the trail knows it: done or today from the record, the next one closed, and the rest still ahead. */
export interface Slot {
    key: string;
    state: StopState;
    lessons: string[];
    date: string | null;
    day: Day | null;
}

/**
 * Every day of one term, in order. The days on the record come first as they are; when the child is
 * in this term, the next lesson is a closed day after them and the term's remaining days follow it,
 * so the trail is as long as the term from its first day. A skipped day has no stop, as it has no
 * paper on the roll, so a day still ahead can move up by one when a day is skipped.
 */
export function slotsOf(year: Year, term: number, days: readonly Day[], next: Next | null): Slot[] {
    const mine = days.filter((d) => d.term === term);
    const slots: Slot[] = mine.map((d) => ({
        key: d.id,
        state: d.state,
        lessons: [...d.lessons],
        date: d.date,
        day: d,
    }));
    const nextHere = next?.term === term ? next : null;
    if (!mine.some((d) => d.state === "today") && !nextHere) return slots;
    const inTerm = dayGroups(year).filter((g) => termOf(year, g.unit) === term);
    const last = mine.at(-1);
    const from = nextHere ? inTerm.findIndex((g) => g.lessons.includes(nextHere.id)) : -1;
    const after =
        from >= 0
            ? from
            : last
              ? inTerm.findIndex((g) => `day-${g.lessons[0]}` === last.id) + 1
              : 0;
    inTerm.slice(Math.max(0, after)).forEach((g, k) => {
        slots.push(
            k === 0 && nextHere && from >= 0
                ? {
                      key: `next-${nextHere.id}`,
                      state: "next",
                      lessons: [nextHere.id],
                      date: null,
                      day: null,
                  }
                : {
                      key: `ahead-${g.lessons[0] ?? after + k}`,
                      state: "ahead",
                      lessons: [],
                      date: null,
                      day: null,
                  },
        );
    });
    return slots;
}

/** How a world's place is shaped: how wide its land is, how far its trail runs across and how far apart the stops are. */
interface Shape {
    wide: boolean;
    /** Half the width the trail's runs span. */
    reach: number;
    /** The radius of a bend, half a tile, so a bend runs from one run's middle to the next. */
    bend: number;
    /** Half the width of the place, where its washes begin to fade; the camera is kept inside it. */
    half: number;
    /**
     * Half the width the painter is told the world is. The washes fade over a fifth of their width at
     * each side, and a shore's sand and water are shares of it, so it puts the fade at the place's edge.
     */
    paint: number;
    step: number;
    /** How far a run swings up and down, so the trail reads as walked rather than ruled. */
    swing: number;
    horizon: number;
}

/** A shore is sand down the middle with water either side, so its trail keeps to the sand; every other ground takes the whole width. */
function shapeOf(ground: GroundKind, wide: boolean): Shape {
    // the washes run BLEED past the painter's edges and fade from 0.6 of that half-width outward
    const X = wide ? 7700 : 4200;
    const half = snap(X * 0.6);
    const bend = TILE / 2;
    // a shore's full sand ends at 0.26 of X and its blend into the water at 0.4 (scenery.ts, SEA and SAND)
    const sand = ground === "shore" || ground === "reeds" || ground === "sea";
    const reach = snap(sand ? X * 0.34 - bend : half - bend - (wide ? 900 : 420));
    return {
        wide,
        reach,
        bend,
        half,
        paint: X - BLEED,
        step: wide ? 1500 : 1150,
        swing: wide ? 130 : 90,
        horizon: (wide ? WIDE : NARROW).horizon,
    };
}

export interface TrailInput {
    term: number;
    slots: Slot[];
    world: {
        id: string;
        name: string;
        ground: GroundKind;
        gate: string;
        moment: string;
        secret: string;
        landmarks: readonly string[];
        creatures: readonly string[];
    };
    wide: boolean;
    size(art: string): { w: number; h: number };
    /** The drawing that belongs beside a day's lessons, and the line it says. */
    reach?(slot: Slot): { art: string; says: string } | null;
    /** A grown-up's trail is drawn whole; a child's stops at the next day. */
    whole: boolean;
}

/** The trail from under the horizon through every run, as curves the painter and the stops both walk. */
function walk(sh: Shape, top: number, runs: number, seed: number): { trail: Trail; start: Pt } {
    const t = new Trail();
    const r = sh.bend,
        c = 0.5523;
    const start = { x: -sh.reach - (sh.wide ? 360 : 200), y: top + 520 };
    const y0 = top + TILE + r;
    t.move(start.x, start.y);
    t.curve(start.x, start.y + 300, -sh.reach - 200, y0, -sh.reach, y0);
    for (let k = 0; k < runs; k++) {
        const dir = k % 2 === 0 ? 1 : -1,
            y = y0 + k * TILE;
        // a run swings up and down three times on its way across, by a different amount each run
        const x0 = -dir * sh.reach,
            span = (2 * sh.reach) / 3;
        for (let j = 1; j <= 3; j++) {
            const sw = sh.swing * (j === 3 ? 0 : (((seed + k * 7 + j * 3) % 5) - 2) / 2 || 0.8);
            const x = x0 + dir * span * j;
            t.curve(
                x - dir * span * 0.66,
                y + (j === 1 ? 0 : -sw * 0.6),
                x - dir * span * 0.33,
                y + sw,
                x,
                y + (j === 3 ? 0 : sw * 0.5),
            );
        }
        // a half circle down to the next run on the outside, y always growing so a tile holds one run
        const ex = dir * sh.reach;
        t.curve(ex + dir * c * r, y, ex + dir * r, y + r - c * r, ex + dir * r, y + r);
        t.curve(ex + dir * r, y + r + c * r, ex + dir * c * r, y + 2 * r, ex, y + 2 * r);
    }
    return { trail: t, start };
}

/** Whether a box keeps `by` clear of the trail, tested against every fourth sample, a stride of 48. */
function offTrail(box: Rect, samples: readonly Sample[], by: number): boolean {
    for (let i = 0; i < samples.length; i += 4) {
        const q = samples[i];
        if (!q) continue;
        if (
            q.x > box.x - by &&
            q.x < box.x + box.w + by &&
            q.y > box.y - by &&
            q.y < box.y + box.h + by
        )
            return false;
    }
    return true;
}

/** A line through every `every`th sample, for the plain band the painter lays under the path. */
function polyline(samples: readonly Sample[], every: number): string {
    const kept = samples.flatMap((q, i) =>
        i % every === 0 || i === samples.length - 1 ? [q] : [],
    );
    return kept.map((q, i) => `${i ? "L" : "M"}${Math.round(q.x)} ${Math.round(q.y)}`).join("");
}

export function layoutTrail(input: TrailInput): TrailLayout {
    const sh = shapeOf(input.world.ground, input.wide),
        slots = input.slots,
        w = input.world;
    const top = 0,
        line = snap(sh.horizon * 0.62);
    const horizon: Rect = { x: -sh.half, y: top, w: sh.half * 2, h: sh.horizon };
    const runLength = 2 * sh.reach + Math.PI * sh.bend;
    // the first stop is a little way along the first run, and the moment a little past the last stop
    const lead = 0.62,
        tail = 1.1;
    const want = (Math.max(1, slots.length) - 1 + lead + tail) * sh.step + 1200;
    const runs = Math.max(1, Math.ceil(want / runLength));
    const { trail, start } = walk(sh, line, runs + 1, hash(w.name) % 97);
    const all = trail.samples(12);
    const y0 = line + TILE + sh.bend;
    const s0 = all.find((q) => q.y >= y0 - 1)?.s ?? 0;
    const sAt = (s: number): Sample =>
        all.find((q) => q.s >= s) ?? all.at(-1) ?? { x: 0, y: 0, nx: 0, ny: 0, s: 0 };
    // run k's band of the ground is from line + (k + 1) * TILE to line + (k + 2) * TILE
    const runOf = (p: Pt): number => clamp(Math.floor((p.y - line - TILE) / TILE), 0, runs);
    // A day's paper stands above its stop, in a box the day's number decides and its sheet never does,
    // so the postcard that waits there and the paper that lands in it take the same room. Where two
    // boxes would meet, on a bend where the trail doubles back, the later one steps aside and then up.
    const paper = { w: sh.wide ? WIDE.sheet : NARROW.sheet, h: PAPER_H };
    const boxes: Rect[] = [];
    const stops: Stop[] = slots.map((slot, i) => {
        const q = sAt(s0 + (lead + i) * sh.step);
        const at = { x: snap(q.x), y: snap(q.y) };
        const inside = (x: number): boolean => x >= -sh.half + 60 && x + paper.w <= sh.half - 60;
        let box: Rect = {
            x: snap(clamp(at.x - paper.w / 2, -sh.half + 60, sh.half - 60 - paper.w)),
            y: snap(at.y - PAPER_UP - paper.h),
            w: paper.w,
            h: paper.h,
        };
        for (let tries = 0; tries < 6; tries++) {
            const hit = boxes.find((b) => intersects(b, box));
            if (!hit) break;
            const left = hit.x - paper.w - 40,
                right = hit.x + hit.w + 40;
            const aside = Math.abs(left - box.x) <= Math.abs(right - box.x) ? left : right;
            box = inside(aside)
                ? { ...box, x: snap(aside) }
                : { ...box, y: snap(hit.y - paper.h - 40) };
        }
        boxes.push(box);
        return {
            key: slot.key,
            state: slot.state,
            lessons: slot.lessons,
            date: slot.date,
            at,
            s: q.s,
            paper: box,
        };
    });
    const length = (stops.at(-1)?.s ?? s0) + sh.step * tail;
    const samples = all.filter((q) => q.s <= length);
    const endQ = sAt(length);
    const end = { x: snap(endQ.x), y: snap(endQ.y) };
    const walkedTo = [...stops].reverse().find((s) => s.state === "today" || s.state === "done");
    const nextStop = stops.find((s) => s.state === "next");
    const finished = stops.length > 0 && stops.every((s) => s.state === "done");
    const walked = finished ? length : (walkedTo?.s ?? 0);
    const drawn = input.whole || finished ? length : (nextStop?.s ?? walked);
    const bottom = snap(Math.max(end.y + TILE, ...stops.map((s) => s.at.y + TILE * 0.6)));
    const frontier = nextStop ?? walkedTo;
    const known =
        input.whole || finished
            ? bottom
            : frontier
              ? line + (runOf(frontier.at) + 2) * TILE
              : line + TILE;

    // what stands in the place, placed so nothing sits on the trail, on a day's paper or on another drawing
    const taken: Rect[] = stops.flatMap((s) => [
        s.paper,
        { x: s.at.x - 120, y: s.at.y - 120, w: 240, h: 240 },
    ]);
    const scenery: Scenery[] = [],
        beside: number[] = [];
    const fit = (art: string, maxH: number, maxW: number): { k: number; w: number; h: number } => {
        const z = input.size(art);
        const k = Math.min(1, maxH / Math.max(1, z.h), maxW / Math.max(1, z.w));
        return { k, w: z.w * k, h: z.h * k };
    };
    const edgeX = sh.half - (sh.wide ? 160 : 80);
    const place = (
        art: string,
        kind: Scenery["kind"],
        box: Rect,
        k: number,
        stop: number,
        flip: boolean,
        says?: string,
    ): void => {
        taken.push(grow(box, 40));
        scenery.push({
            art,
            kind,
            at: { x: box.x, y: box.y },
            // sceneryPieces flips a creature standing on side 1, and anything else on side -1
            side: (kind === "creature") === flip ? 1 : -1,
            row: -1,
            k,
            world: w.id,
            along: clamp((box.y + box.h - line) / Math.max(1, bottom - line), 0, 1),
            ...(says ? { says } : {}),
        });
        beside.push(stop);
    };
    /** The free spot nearest `near` for a drawing of this size, in the bands under the runs and the margins beside the bends. */
    const spot = (w: number, h: number, near: Pt, from: number, to: number): Rect | null => {
        let best: Rect | null = null,
            bestD = Infinity;
        for (let k = Math.max(-1, from); k <= Math.min(runs, to); k++) {
            const foot = y0 + k * TILE + TILE / 2 + 40;
            for (let x = -edgeX + w / 2; x <= edgeX - w / 2; x += 80)
                for (const f of [foot, foot - 120, foot + 60]) {
                    const c = { x: snap(x - w / 2), y: snap(f - h), w, h };
                    const d = Math.hypot(c.x + c.w / 2 - near.x, c.y + c.h - near.y);
                    if (d >= bestD) continue;
                    if (c.x < -sh.half + 40 || c.x + c.w > sh.half - 40) continue;
                    if (c.y < line + TILE * 0.5) continue;
                    if (taken.some((t) => intersects(t, c))) continue;
                    if (!offTrail(c, samples, 70)) continue;
                    best = c;
                    bestD = d;
                }
        }
        return best;
    };

    // the moment stands just past the end of the trail, or the gate does when the gate is the moment
    const gateEnds = w.moment === w.gate;
    const gz = input.size(w.gate);
    // the painter stands the gate to the left of this point with its foot 40 below it
    const gateAt = gateEnds
        ? { x: snap(end.x + gz.w / 2 + 60), y: snap(end.y + 20) }
        : { x: start.x, y: start.y };
    taken.push({ x: gateAt.x - gz.w - 100, y: gateAt.y - gz.h, w: gz.w + 80, h: gz.h + 80 });
    if (!gateEnds) {
        const m = fit(w.moment, sh.wide ? 620 : 420, sh.wide ? 760 : 460);
        // on the side of the end away from the bend
        const dx = Math.sign(end.x || 1) * -(m.w / 2 + 140);
        const x = clamp(snap(end.x - m.w / 2) + dx, -sh.half + 60, sh.half - 60 - m.w);
        place(
            w.moment,
            "moment",
            { x: snap(x), y: snap(end.y + 90 - m.h), w: m.w, h: m.h },
            m.k,
            -1,
            false,
        );
    }

    // a drawing that belongs beside a day's lessons stands once, beside the first day it belongs to
    const reachMax = sh.wide ? 460 : 340,
        markMax = sh.wide ? 420 : 300;
    const reached = new Set<string>();
    slots.forEach((slot, i) => {
        const r = input.reach?.(slot),
            stop = stops[i];
        if (!r || !stop || reached.has(r.art) || r.art === w.gate) return;
        const m = fit(r.art, reachMax, reachMax * 1.4);
        const run = runOf(stop.at);
        const box = spot(m.w, m.h, { x: stop.at.x, y: stop.at.y + TILE / 2 }, run - 1, run + 1);
        if (!box) return;
        reached.add(r.art);
        place(r.art, "reach", box, m.k, i, box.x + box.w / 2 > stop.at.x, r.says);
    });

    // the world's own landmarks, spread down the term where nothing of a lesson stands already
    const marks = w.landmarks.filter((a) => !reached.has(a) && a !== w.gate && a !== w.moment);
    marks.forEach((art, j) => {
        const m = fit(art, markMax, markMax * 1.5);
        const k = Math.min(runs - 1, Math.floor(((j + 0.5) / Math.max(1, marks.length)) * runs));
        const side = j % 2 === 0 ? -1 : 1;
        const near = { x: side * (sh.reach * 0.7 + (j % 3) * 180), y: y0 + k * TILE + TILE / 2 };
        const box = spot(m.w, m.h, near, k - 1, k + 1);
        if (box) place(art, "landmark", box, m.k, -1, side > 0);
    });
    // who lives beside the trail, near the path
    w.creatures.forEach((art, j) => {
        const m = fit(art, sh.wide ? 200 : 150, sh.wide ? 320 : 220);
        const k = Math.min(
            runs - 1,
            Math.floor(((j + 0.3) / Math.max(1, w.creatures.length)) * runs),
        );
        const near = {
            x: (j % 2 === 0 ? 1 : -1) * sh.reach * 0.35,
            y: y0 + k * TILE + TILE / 2 - 200,
        };
        const box = spot(m.w, m.h, near, k, k);
        if (box) place(art, "creature", box, m.k, -1, j % 2 === 0);
    });
    // the secret, tucked at the far edge level with the third day, where only wandering finds it
    const third = stops[2];
    if (third) {
        const m = fit(w.secret, 150, 170);
        const far = third.at.x > 0 ? -1 : 1;
        const run = runOf(third.at);
        const box = spot(m.w, m.h, { x: far * sh.half, y: third.at.y + TILE / 2 }, run, run + 1);
        if (box) place(w.secret, "secret", box, m.k, 2, far > 0);
    }

    const bounds = { x: -sh.half, y: top, w: sh.half * 2, h: bottom - top };
    const inked = samples.filter((q) => q.s <= drawn + 30);
    const land: RollLayout = {
        o: sh.wide ? WIDE : NARROW,
        rows: [],
        stretches: [
            {
                term: input.term,
                world: w.id,
                horizon,
                line,
                ground: { x: -sh.half, y: line, w: sh.half * 2, h: bottom - line },
                ahead: false,
                start: gateAt,
            },
        ],
        path: [{ world: w.id, d: polyline(inked, 2), ahead: false, samples: inked }],
        next: null,
        scenery,
        bounds,
        x0: -sh.paint,
        x1: sh.paint,
        bare: true,
    };
    return {
        land,
        stops,
        beside,
        samples,
        start,
        end,
        length,
        walked,
        drawn,
        known,
        step: sh.step,
    };
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * A day within the week as a child says it rather than as a date: Today, Yesterday, Last Thursday,
 * Before the weekend. It counts nothing: it is the same day said in the words a five year old
 * already uses for it. Past the week it is nothing, and the caller says the day as the sheet's own
 * stamp does, since a whole term of days said in words reads as one phrase repeated. Both days are
 * ISO dates, and a day that cannot be read is nothing too.
 */
export function dayInWords(iso: string, today: string): string {
    const a = Date.parse(`${iso}T00:00:00Z`),
        b = Date.parse(`${today}T00:00:00Z`);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return "";
    const days = Math.round((b - a) / 864e5);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days >= 7) return "";
    const was = new Date(a).getUTCDay(),
        now = new Date(b).getUTCDay();
    // a Friday looked back on from early in the next week is the day before the weekend
    if (was === 5 && now >= 1 && now <= 3) return "Before the weekend";
    return `Last ${WEEKDAYS[was] ?? ""}`;
}
