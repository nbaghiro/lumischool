import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch, soft } from "../lettering";

/** A star by its J2000 right ascension in hours and declination in degrees, and its brightness as a magnitude. */
interface Star {
    name: string;
    ra: number;
    dec: number;
    mag: number;
}

const hms = (h: number, m: number, s: number): number => h + m / 60 + s / 3600;
const dms = (d: number, m: number, s: number): number => d + m / 60 + s / 3600;

export const POLARIS: Star = {
    name: "Polaris",
    ra: hms(2, 31, 49.1),
    dec: dms(89, 15, 51),
    mag: 2.0,
};

/** The Plough's seven stars in the order they are joined, from the pointers round to the end of the handle. */
export const PLOUGH: readonly Star[] = [
    { name: "Dubhe", ra: hms(11, 3, 43.7), dec: dms(61, 45, 3), mag: 1.8 },
    { name: "Merak", ra: hms(11, 1, 50.5), dec: dms(56, 22, 57), mag: 2.4 },
    { name: "Phecda", ra: hms(11, 53, 49.8), dec: dms(53, 41, 41), mag: 2.4 },
    { name: "Megrez", ra: hms(12, 15, 25.6), dec: dms(57, 1, 57), mag: 3.3 },
    { name: "Alioth", ra: hms(12, 54, 1.7), dec: dms(55, 57, 35), mag: 1.8 },
    { name: "Mizar", ra: hms(13, 23, 55.5), dec: dms(54, 55, 31), mag: 2.2 },
    { name: "Alkaid", ra: hms(13, 47, 32.4), dec: dms(49, 18, 48), mag: 1.9 },
];

/** How far the sky turns round the pole star in so many hours, in degrees: 15 an hour. */
export const turnIn = (hours: number): number => 15 * hours;

/** How high the pole star stands above the northern horizon, in degrees: the latitude it is seen from. */
export const poleHeight = (lat: number): number => lat;

/**
 * Where a star stands looking north, in degrees from the pole: right, and up towards the zenith.
 * `sky` is the sidereal time in hours; a star whose right ascension it is stands straight above the
 * pole, and the sky turns anticlockwise by `turnIn` each hour.
 */
export const starAt = (s: Star, sky: number): [number, number] => {
    const angle = (turnIn(s.ra - sky) * Math.PI) / 180,
        far = 90 - s.dec;
    return [far * Math.sin(angle), far * Math.cos(angle)];
};

const within = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, Math.round(v)));
/** Units a degree of sky takes on the chart. */
const PER = 0.2 * U;
const HALF = 9.5 * U;
const clockWord = (h: number): string => {
    const k = ((Math.round(h) % 24) + 24) % 24;
    return k === 0 ? "midnight" : k === 12 ? "noon" : `${k % 12 || 12} ${k < 12 ? "am" : "pm"}`;
};

export const starmap = defineDrawing({
    id: "starmap",
    family: "science",
    title: "The Plough and the pole star",
    group: "Structures",
    about: "The northern sky looking north: the pole star, and the seven stars of the Plough drawn from their real places, joined as the Plough is. The sky turns anticlockwise round the pole star, 15 degrees an hour, and `looks` draws the Plough that many times, `every` hours apart, from the sidereal time `sky` in hours (at 13 the Plough stands straight above the pole star, at 7 to its right); each look is labelled with its clock time from `clock`, an hour of the day. With `show` 0 the last look is left out for a prediction. `pointers` draws the dashed line from Merak through Dubhe to the pole star, `names` names them, and `turn` adds an arrow for the way the sky turns. `horizon` draws the northern horizon, with the pole star as high above it as the latitude `lat`.",
    params: {
        sky: 13,
        clock: 21,
        looks: 1,
        every: 3,
        show: 1,
        pointers: 1,
        names: 1,
        turn: 0,
        horizon: 0,
        lat: 52,
    },
    settings: {
        sky: { kind: "whole", min: 0, max: 23 },
        clock: { kind: "whole", min: 0, max: 23 },
        looks: { kind: "whole", min: 1, max: 4 },
        every: { kind: "whole", min: 1, max: 6 },
        show: { kind: "whole", min: 0, max: 1 },
        pointers: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
        turn: { kind: "whole", min: 0, max: 1 },
        horizon: { kind: "whole", min: 0, max: 1 },
        lat: { kind: "whole", min: 45, max: 70 },
    },
    takes: [
        {
            label: "The pointers to the pole star",
            params: {
                sky: 13,
                clock: 21,
                looks: 1,
                every: 3,
                show: 1,
                pointers: 1,
                names: 1,
                turn: 0,
                horizon: 0,
                lat: 52,
            },
        },
        {
            label: "Through a night, three hours apart",
            params: {
                sky: 10,
                clock: 21,
                looks: 3,
                every: 3,
                show: 1,
                pointers: 0,
                names: 0,
                turn: 1,
                horizon: 0,
                lat: 52,
            },
        },
        {
            label: "Where will it be at 3 am?",
            params: {
                sky: 16,
                clock: 21,
                looks: 2,
                every: 6,
                show: 0,
                pointers: 0,
                names: 0,
                turn: 0,
                horizon: 0,
                lat: 52,
            },
        },
        {
            label: "Over the northern horizon at 60° north",
            params: {
                sky: 19,
                clock: 22,
                looks: 1,
                every: 3,
                show: 1,
                pointers: 1,
                names: 0,
                turn: 0,
                horizon: 1,
                lat: 60,
            },
        },
    ],
    box: (p) =>
        p.horizon > 0
            ? { w: 19, h: Math.ceil((HALF + poleHeight(within(p.lat, 45, 70)) * PER) / U + 1.6) }
            : { w: 19, h: 19 },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            cx = HALF,
            cy = HALF,
            looks = within(p.looks, 1, 4),
            every = within(p.every, 1, 6),
            sky = within(p.sky, 0, 23),
            drawn = p.show > 0 ? looks : Math.max(1, looks - 1),
            place = (s: Star, t: number): [number, number] => {
                const [x, y] = starAt(s, t);
                return [cx + x * PER, cy - y * PER];
            };
        if (p.horizon > 0) {
            const lat = within(p.lat, 45, 70),
                hy = cy + poleHeight(lat) * PER;
            pen.rect(
                g,
                0.2 * U,
                hy,
                17.6 * U,
                1.2 * U,
                "pencil",
                pen.fill("mint", "hachure", { hachureGap: 6 }),
                {
                    stroke: "none",
                },
            );
            pen.line(g, 0.2 * U, hy, 17.8 * U, hy, "pencil", { strokeWidth: 2 });
            pen.line(g, cx, cy + 0.6 * U, cx, hy, "ruler", {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
                strokeLineDash: [6, 5],
            });
            patch(c, cx + 1.1 * U, hy - 1.2 * U - 5, 36, 17);
            num(c, cx + 0.4 * U, hy - 1.2 * U, `${lat}°`, 13, "start");
            patch(c, cx, hy + 0.9 * U - 4, 56, 15);
            cap(c, cx, hy + 0.9 * U, "north", 11);
            a.horizon = [cx, hy, "down"];
        }
        const dot = (x: number, y: number, mag: number) => {
            const r = mag < 2 ? 0.27 * U : mag < 2.5 ? 0.22 * U : 0.17 * U;
            if (!c.paper)
                pen.circle(
                    g,
                    x,
                    y,
                    2 * r + 5,
                    "ruler",
                    { fill: c.t.glow, fillStyle: "solid" },
                    { stroke: "none" },
                );
            pen.circle(
                g,
                x,
                y,
                2 * r,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 1 },
            );
        };
        for (let k = 0; k < drawn; k++) {
            const t = sky + k * every,
                pts = PLOUGH.map((s) => place(s, t)),
                soft1 = k > 0;
            const line = { strokeWidth: soft1 ? 1.1 : 1.4, stroke: c.t["ink-soft"] },
                at = (i: number): [number, number] => pts[i] ?? [cx, cy];
            pen.linear(g, [at(3), at(0), at(1), at(2), at(3), at(4), at(5), at(6)], "ruler", line);
            pts.forEach(([x, y], i) => dot(x, y, PLOUGH[i]?.mag ?? 2));
            const end = pts[6] ?? [cx, cy],
                out = Math.hypot(end[0] - cx, end[1] - cy) || 1,
                lx = end[0] + ((end[0] - cx) / out) * 1.4 * U,
                ly = end[1] + ((end[1] - cy) / out) * 1.2 * U + 5;
            if (looks > 1 || p.show === 0) {
                const s = clockWord(within(p.clock, 0, 23) + k * every);
                patch(c, lx, ly - 5, s.length * 7.5 + 8, 17);
                soft(c, lx, ly, s, 13);
            }
            a[`look(${k})`] = [pts[3]?.[0] ?? cx, pts[3]?.[1] ?? cy, "up"];
        }
        if (p.pointers > 0) {
            const [dx, dy] = place(PLOUGH[0] ?? POLARIS, sky),
                [mx, my] = place(PLOUGH[1] ?? POLARIS, sky),
                [px, py] = place(POLARIS, sky),
                L = Math.hypot(px - dx, py - dy) || 1;
            pen.line(
                g,
                mx,
                my,
                px - ((px - dx) / L) * 0.5 * U,
                py - ((py - dy) / L) * 0.5 * U,
                "ruler",
                {
                    strokeWidth: 1.2,
                    stroke: c.t.pen,
                    strokeLineDash: [5, 5],
                },
            );
            if (p.names > 0) {
                const [fx, fy] = place(PLOUGH[2] ?? POLARIS, sky),
                    ux = (dx - mx) / (Math.hypot(dx - mx, dy - my) || 1),
                    uy = (dy - my) / (Math.hypot(dx - mx, dy - my) || 1),
                    away = (fx - mx) * -uy + (fy - my) * ux > 0 ? -1 : 1,
                    nx = -uy * away,
                    ny = ux * away;
                for (const [x, y, s] of [
                    [dx, dy, "Dubhe"],
                    [mx, my, "Merak"],
                ] as const)
                    soft(
                        c,
                        x + nx * 0.8 * U,
                        y + ny * 0.8 * U + 4,
                        s,
                        13,
                        nx < 0 ? "end" : "start",
                    );
            }
        }
        const [px, py] = place(POLARIS, sky);
        dot(px, py, POLARIS.mag);
        if (p.names > 0 || p.horizon > 0) {
            patch(c, px + 0.6 * U + 34, py + 1.1 * U - 5, 76, 17);
            soft(c, px + 0.6 * U, py + 1.1 * U, "pole star", 13, "start");
        }
        if (p.turn > 0) {
            const r = 2.6 * U;
            pen.arc(g, cx, cy, 2 * r, 2 * r, -Math.PI * 0.95, -Math.PI * 0.55, "pencil", {
                strokeWidth: 1.6,
                stroke: c.t.pen,
            });
            const ex = cx + r * Math.cos(-Math.PI * 0.95),
                ey = cy + r * Math.sin(-Math.PI * 0.95);
            pen.linear(
                g,
                [
                    [ex - 7, ey - 8],
                    [ex, ey],
                    [ex + 8, ey - 6],
                ],
                "ruler",
                { strokeWidth: 1.6, stroke: c.t.pen },
            );
        }
        a.pole = [px, py, "down"];
        return a;
    },
    describe: (p) =>
        `The night sky looking north: the pole star and the seven stars of the Plough${within(p.looks, 1, 4) > 1 ? ", drawn at more than one time of night" : ""}${p.pointers > 0 ? ", with a dashed line from the pointers" : ""}${p.horizon > 0 ? " over the horizon" : ""}.`,
    reads: true,
    motion: {
        still: "Where the stars stand is read off it, so it holds still while the sky's turn is measured.",
    },
});
