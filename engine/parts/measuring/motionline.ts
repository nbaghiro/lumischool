import { plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, penned, say, soft, wide } from "../lettering";

/**
 * Two movers on a road `dist` km long heading towards each other, the second leaving the far end
 * `late` hours after the first: when (hours after the first set off) and where (km from the first's
 * start) they meet, or null when the first is already there before the second sets off.
 */
export function meetAt(
    dist: number,
    v1: number,
    v2: number,
    late: number,
): { t: number; x: number } | null {
    const ahead = v1 * late;
    if (v1 + v2 <= 0 || ahead >= dist) return null;
    const t = late + (dist - ahead) / (v1 + v2);
    return { t, x: v1 * t };
}

/**
 * Two movers leaving the same end the same way, the second `late` hours after the first and faster:
 * when (hours after the first set off) and where the second catches the first, or null when it never
 * does within `dist` km.
 */
export function catchAt(
    dist: number,
    v1: number,
    v2: number,
    late: number,
): { t: number; x: number } | null {
    if (v2 <= v1) return null;
    const after = (v1 * late) / (v2 - v1),
        x = v2 * after;
    return x > dist ? null : { t: late + after, x };
}

/** A boat's speed with the current and against it, from its speed in still water; null when it cannot go upstream. */
export function riverSpeeds(v: number, flow: number): { down: number; up: number } | null {
    return v - flow > 0 ? { down: v + flow, up: v - flow } : null;
}

/** Hours written as hours and minutes, with "about" when it is not a whole number of minutes. */
export function hoursWords(t: number): string {
    const minutes = t * 60,
        whole = Math.round(minutes),
        about = Math.abs(minutes - whole) > 1e-6 ? "about " : "",
        h = Math.floor(whole / 60),
        m = whole % 60;
    return `${about}${[h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ") || "0 min"}`;
}

const kmWords = (x: number): string => `${Math.round(x * 100) / 100} km`;

/** A small car from the side, facing `dir`, its wheels on `ground`. */
function car<G>(c: Ctx<G>, x: number, ground: number, dir: number, colour: "sky" | "tang"): void {
    const { pen, g } = c,
        w = 2 * U,
        l = x - w / 2,
        body = ground - 0.35 * U;
    pen.path(g, roundedRect(l, body - 0.6 * U, w, 0.6 * U, 5), "ruler", pen.fill(colour), {
        strokeWidth: 1.7,
    });
    const cab = dir > 0 ? l + 0.35 * U : l + 0.45 * U;
    pen.polygon(
        g,
        [
            [cab, body - 0.6 * U],
            [cab + 0.25 * U, body - 1.1 * U],
            [cab + 0.95 * U, body - 1.1 * U],
            [cab + 1.2 * U, body - 0.6 * U],
        ],
        "ruler",
        pen.fill("card"),
        { strokeWidth: 1.5 },
    );
    for (const k of [0.45, 1.55])
        pen.circle(g, l + k * U, ground - 0.3 * U, 0.6 * U, "ruler", pen.fill("ink"), {
            strokeWidth: 1.2,
        });
    const nose = dir > 0 ? l + w : l;
    pen.circle(g, nose - dir * 0.15 * U, body - 0.4 * U, 0.2 * U, "ruler", pen.fill("glow"), {
        strokeWidth: 0.9,
    });
}

/** A small motor boat on the water line, facing right. */
function boat<G>(c: Ctx<G>, x: number, water: number): void {
    const { pen, g } = c;
    pen.polygon(
        g,
        [
            [x - 1.5 * U, water - 0.6 * U],
            [x + 1.9 * U, water - 0.6 * U],
            [x + 1.1 * U, water + 0.3 * U],
            [x - 1.3 * U, water + 0.3 * U],
        ],
        "ruler",
        pen.fill("berry"),
        { strokeWidth: 1.7 },
    );
    pen.rect(g, x - 0.9 * U, water - 1.3 * U, 1.3 * U, 0.7 * U, "ruler", pen.fill("card"), {
        strokeWidth: 1.4,
    });
}

/** A town's end of the line: a post with its letter over it. */
function end<G>(c: Ctx<G>, x: number, y: number, name: string, above = false): void {
    if (above) {
        c.pen.line(c.g, x, y - 1.1 * U, x, y, "ruler", { strokeWidth: 2.2 });
        say(c, x, y - 1.4 * U, name, 16);
        return;
    }
    c.pen.line(c.g, x, y - 0.6 * U, x, y + 0.6 * U, "ruler", { strokeWidth: 2.2 });
    say(c, x, y + 1.5 * U, name, 16);
}

/** Words on a card patch, so the water's hatching never crosses them on screen or on paper. */
function onCard<G>(c: Ctx<G>, x: number, y: number, s: string, size: number): void {
    const w = wide(s, size) + 10;
    plain(c, {
        kind: "rect",
        x: x - w / 2,
        y: y - size * 1.05,
        w,
        h: size * 1.45,
        r: 4,
        fill: c.t.card,
    });
    say(c, x, y, s, size);
}

const W = 26,
    A = 3.5 * U,
    B = 23.5 * U;

export const motionLine = defineDrawing({
    id: "motionline",
    family: "measuring",
    title: "Motion diagram",
    group: "Structures",
    about: "A road or a river drawn as a line from A to B, `dist` km long, for problems on speed, distance and time. `mode` 0: two cars set off towards each other, the first from A at `v1` km/h and the second from B at `v2` km/h `late` hours later, and they meet where the first has gone v1 times the hours. `mode` 1: both leave A, the second `late` hours later and faster, and it catches the first after v1 × late ÷ (v2 − v1) hours. `mode` 2: a boat that goes `v1` km/h in still water on a river whose current runs from A to B at `flow` km/h, so it goes v1 + flow downstream and v1 − flow upstream. With `show` 1 the meeting point or the two speeds and times are written; with 0 they wait under a question mark.",
    params: { mode: 0, dist: 300, v1: 60, v2: 40, late: 0, flow: 2, show: 0 },
    settings: {
        mode: { kind: "whole", min: 0, max: 2 },
        dist: { kind: "number", min: 1, max: 1000, step: 0.5 },
        v1: { kind: "number", min: 1, max: 200, step: 0.5 },
        v2: { kind: "number", min: 0, max: 200, step: 0.5 },
        late: { kind: "number", min: 0, max: 10, step: 0.25 },
        flow: { kind: "number", min: 0, max: 20, step: 0.5 },
        show: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Towards each other, meeting point hidden",
            params: { mode: 0, dist: 300, v1: 60, v2: 40, late: 0, flow: 2, show: 0 },
        },
        {
            label: "Towards each other, the second an hour later, met",
            params: { mode: 0, dist: 270, v1: 50, v2: 60, late: 1, flow: 2, show: 1 },
        },
        {
            label: "Catching up, shown",
            params: { mode: 1, dist: 200, v1: 40, v2: 60, late: 1, flow: 2, show: 1 },
        },
        {
            label: "A boat on the current",
            params: { mode: 2, dist: 30, v1: 8, v2: 0, late: 0, flow: 2, show: 1 },
        },
        {
            label: "A boat on the current, speeds hidden",
            params: { mode: 2, dist: 24, v1: 10, v2: 0, late: 0, flow: 2, show: 0 },
        },
    ],
    box: (p) => ({ w: W, h: Math.round(p.mode) === 2 ? 11 : 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            mode = Math.max(0, Math.min(2, Math.round(p.mode))),
            show = Math.round(p.show) === 1,
            dist = Math.max(0.5, p.dist),
            along = (km: number): number => A + ((B - A) * km) / dist,
            a: RawAnchors = {};
        const span = (y: number): void => {
            const label = kmWords(dist),
                gap = wide(label, 14) / 2 + 8,
                mid = (A + B) / 2;
            pen.line(g, A, y, mid - gap, y, "ruler", { strokeWidth: 1.2, stroke: c.t["ink-soft"] });
            pen.line(g, mid + gap, y, B, y, "ruler", { strokeWidth: 1.2, stroke: c.t["ink-soft"] });
            for (const [x, d] of [
                [A, 1],
                [B, -1],
            ] as const) {
                pen.line(g, x, y, x + d * 0.4 * U, y - 0.25 * U, "ruler", { strokeWidth: 1.2 });
                pen.line(g, x, y, x + d * 0.4 * U, y + 0.25 * U, "ruler", { strokeWidth: 1.2 });
            }
            say(c, mid, y + 5, label, 14);
            a.dist = [(A + B) / 2, y, "down"];
        };
        if (mode === 2) {
            const top = 3.2 * U,
                bottom = 6.8 * U,
                water = (top + bottom) / 2;
            pen.rect(
                g,
                1 * U,
                top,
                (W - 2) * U,
                bottom - top,
                "pencil",
                pen.fill("sky", "hachure", { hachureGap: 9 }),
                {
                    stroke: "none",
                },
            );
            for (const y of [top, bottom])
                pen.line(g, 1 * U, y, (W - 1) * U, y, "pencil", { strokeWidth: 1.8 });
            end(c, A, top, "A", true);
            end(c, B, top, "B", true);
            boat(c, 6 * U, water);
            a.boat = [6 * U, water - 1.1 * U, "up"];
            onCard(
                c,
                6 * U,
                water + 1.45 * U,
                `${Math.round(p.v1 * 100) / 100} km/h in still water`,
                13,
            );
            pen.arrow(g, [15.5 * U, water], [21 * U, water], c.t.pen, 0.02);
            onCard(
                c,
                18.2 * U,
                water - 0.5 * U,
                `current ${Math.round(p.flow * 100) / 100} km/h`,
                13,
            );
            a.current = [18.2 * U, water, "up"];
            span(8.2 * U);
            const s = riverSpeeds(p.v1, p.flow);
            const line = (y: number, word: string, speed: number | null, hours: number | null) => {
                soft(c, A, y, word, 13, "start");
                if (show && speed !== null && hours !== null)
                    num(
                        c,
                        A + 4.8 * U,
                        y,
                        `${Math.round(speed * 100) / 100} km/h, ${hoursWords(hours)}`,
                        14,
                        "start",
                    );
                else penned(c, A + 5.4 * U, y + 2, "?", 18);
            };
            line(9.7 * U, "downstream", s?.down ?? null, s ? dist / s.down : null);
            line(10.7 * U, "upstream", s?.up ?? null, s ? dist / s.up : null);
            return a;
        }
        const road = 5 * U;
        pen.line(g, 1 * U, road, (W - 1) * U, road, "pencil", { strokeWidth: 2.4 });
        end(c, A, road, "A");
        end(c, B, road, "B");
        const late = Math.max(0, p.late),
            second = mode === 0 ? B : A - 2 * U,
            dir2 = mode === 0 ? -1 : 1;
        const firstAt = A + 1.1 * U,
            secondAt = second + (mode === 0 ? -1.1 * U : 0);
        car(c, firstAt, road, 1, "sky");
        car(c, secondAt, road, dir2, "tang");
        const tell = (x: number, v: number, d: number, name: string) => {
            num(c, x, road - 1.9 * U, `${Math.round(v * 100) / 100} km/h`, 14);
            pen.arrow(
                g,
                [x - d * 1.2 * U, road - 3 * U],
                [x + d * 1.2 * U, road - 3 * U],
                c.t.pen,
                0.02,
            );
            a[name] = [x, road - 1.4 * U, "up"];
        };
        tell(firstAt, p.v1, 1, "first");
        tell(secondAt, p.v2, dir2, "second");
        if (late > 0)
            soft(
                c,
                mode === 0 ? B - 0.4 * U : second - 0.8 * U,
                road - 3.8 * U,
                `sets off ${hoursWords(late)} later`,
                13,
                mode === 0 ? "end" : "start",
            );
        span(road + 2.6 * U);
        const met = mode === 0 ? meetAt(dist, p.v1, p.v2, late) : catchAt(dist, p.v1, p.v2, late);
        if (show && met) {
            const x = along(met.x);
            pen.line(g, x, road, x, road - 1.9 * U, "ruler", { strokeWidth: 1.6 });
            pen.polygon(
                g,
                [
                    [x, road - 1.9 * U],
                    [x + 0.9 * U, road - 1.6 * U],
                    [x, road - 1.3 * U],
                ],
                "ruler",
                pen.fill("berry"),
                { strokeWidth: 1.3 },
            );
            num(
                c,
                (A + B) / 2,
                road + 4.3 * U,
                `${mode === 0 ? "they meet" : "caught"} ${kmWords(met.x)} from A, ${hoursWords(met.t)} after the first sets off`,
                13,
            );
            a.meet = [x, road, "down"];
        } else if (!show) {
            penned(c, (A + B) / 2, road - 0.4 * U, "?", 22);
            a.meet = [(A + B) / 2, road, "down"];
        }
        return a;
    },
    describe: (p) =>
        Math.round(p.mode) === 2
            ? "A river from A to B with a boat on it, an arrow for the current, its speed in still water, and the length of the river under it."
            : Math.round(p.mode) === 1
              ? "A road from A to B drawn as a line, with two cars leaving A the same way, their speeds over arrows and the road's length under it."
              : "A road from A to B drawn as a line, with a car at each end heading towards the other, their speeds over arrows and the road's length under it.",
    reads: true,
    motion: {
        still: "Its movers stand where the problem starts them, so the diagram holds still.",
    },
});
