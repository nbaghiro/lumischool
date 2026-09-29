import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch, penned, say, soft } from "../lettering";

const within = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, Math.round(v)));

/**
 * The angle in degrees between the sun's rays and the upright of a panel tipped `slope` degrees from
 * flat towards a sun `sun` degrees above the horizon: 0 when the panel faces the sun square on.
 */
export const offSquare = (sun: number, slope: number): number =>
    Math.abs(90 - within(slope, 0, 90) - within(sun, 5, 90));

/**
 * What the panel gives, in watts: what it gives square on in full sun, times the share of the light
 * that gets through the cloud, times the cosine of `offSquare`, to the nearest watt.
 */
export const panelWatts = (rated: number, light: number, sun: number, slope: number): number => {
    const off = offSquare(sun, slope);
    return off >= 90
        ? 0
        : Math.round(
              ((within(rated, 10, 500) * within(light, 0, 100)) / 100) *
                  Math.cos((off * Math.PI) / 180),
          );
};

const GROUND = 11.6 * U;
const PIVOT: [number, number] = [13.5 * U, 8.6 * U];
const HALF = 2.6 * U;

export const solarpanel = defineDrawing({
    id: "solarpanel",
    family: "science",
    title: "A solar panel on the hut",
    group: "Structures",
    about: "A solar panel on a stand beside the research hut, wired to a meter on the hut's wall. The panel is tipped `slope` degrees from flat towards a sun `sun` degrees above the horizon, and gives `rated` watts when the sun's rays meet it square on in full sun. A cloud lets through `light` per cent of the light. What the meter reads is the rated watts, times the share of light, times the cosine of the angle between the rays and the panel's upright, to the nearest watt, so a panel square to the sun gives the most and one edge on gives none. `marks` writes both angles, and with `show` 0 the meter waits under a question mark.",
    params: { sun: 40, slope: 50, rated: 200, light: 100, marks: 1, show: 1 },
    settings: {
        sun: { kind: "whole", min: 5, max: 90 },
        slope: { kind: "whole", min: 0, max: 90 },
        rated: { kind: "whole", min: 10, max: 500 },
        light: { kind: "whole", min: 0, max: 100 },
        marks: { kind: "whole", min: 0, max: 1 },
        show: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Square on to the sun",
            params: { sun: 40, slope: 50, rated: 200, light: 100, marks: 1, show: 1 },
        },
        {
            label: "Lying flat under a low sun",
            params: { sun: 30, slope: 0, rated: 200, light: 100, marks: 1, show: 1 },
        },
        {
            label: "Half the light through a cloud",
            params: { sun: 60, slope: 30, rated: 300, light: 50, marks: 1, show: 1 },
        },
        {
            label: "What will the meter read?",
            params: { sun: 20, slope: 40, rated: 250, light: 80, marks: 1, show: 0 },
        },
    ],
    box: () => ({ w: 21, h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            sun = within(p.sun, 5, 90),
            slope = within(p.slope, 0, 90),
            light = within(p.light, 0, 100),
            rated = within(p.rated, 10, 500),
            rad = (d: number) => (d * Math.PI) / 180;
        // the ground, the hut with its sloping roof, and the meter on its wall
        pen.line(g, 0.2 * U, GROUND, 20.8 * U, GROUND, "pencil", { strokeWidth: 2 });
        pen.rect(g, 0.8 * U, 6.4 * U, 6.4 * U, GROUND - 6.4 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.8,
        });
        for (let y = 7.2 * U; y < GROUND - 0.3 * U; y += 0.8 * U)
            pen.line(g, 0.9 * U, y, 7.1 * U, y, "pencil", {
                strokeWidth: 0.8,
                stroke: c.t["ink-soft"],
            });
        pen.polygon(
            g,
            [
                [0.3 * U, 6.6 * U],
                [4 * U, 3.8 * U],
                [7.7 * U, 6.6 * U],
            ],
            "pencil",
            pen.fill("mint", "hachure", { hachureGap: c.paper ? 10 : 5 }),
            { strokeWidth: 1.8 },
        );
        pen.rect(g, 1.4 * U, GROUND - 3 * U, 1.4 * U, 3 * U, "pencil", pen.fill("sky"), {
            strokeWidth: 1.5,
        });
        const mx = 3.3 * U,
            my = 7.3 * U,
            mw = 3.5 * U,
            mh = 2 * U;
        pen.rect(g, mx, my, mw, mh, "ruler", pen.fill("card"), { strokeWidth: 1.8 });
        cap(c, mx + mw / 2, my + 0.55 * U, "meter", 11);
        if (p.show > 0)
            num(c, mx + mw / 2, my + 1.65 * U, `${panelWatts(rated, light, sun, slope)} W`, 17);
        else penned(c, mx + mw / 2, my + 1.75 * U, "?", 20);
        a.meter = [mx + mw / 2, my, "up"];
        // the wire from the panel's stand along the ground to the meter
        pen.linear(
            g,
            [
                [PIVOT[0], GROUND - 0.3 * U],
                [7.6 * U, GROUND - 0.3 * U],
                [7.6 * U, my + mh / 2],
                [mx + mw, my + mh / 2],
            ],
            "ruler",
            { strokeWidth: 1.2, stroke: c.t["ink-soft"] },
        );
        // the stand and the panel, its high edge away from the sun so it faces up towards it
        pen.line(g, PIVOT[0], PIVOT[1], PIVOT[0], GROUND, "ruler", { strokeWidth: 2.4 });
        const ux = Math.cos(rad(slope)),
            uy = Math.sin(rad(slope)),
            lo: [number, number] = [PIVOT[0] + HALF * ux, PIVOT[1] + HALF * uy],
            hi: [number, number] = [PIVOT[0] - HALF * ux, PIVOT[1] - HALF * uy],
            th = 0.3 * U,
            nx = uy * th,
            ny = -ux * th;
        pen.polygon(
            g,
            [hi, lo, [lo[0] + nx, lo[1] + ny], [hi[0] + nx, hi[1] + ny]],
            "ruler",
            pen.fill("sky"),
            {
                strokeWidth: 1.8,
            },
        );
        for (let k = 1; k < 4; k++) {
            const t = -1 + k * 0.5,
                x = PIVOT[0] + t * HALF * ux,
                y = PIVOT[1] + t * HALF * uy;
            pen.line(g, x, y, x + nx, y + ny, "ruler", { strokeWidth: 1 });
        }
        a.panel = [PIVOT[0] + nx, PIVOT[1] + ny, "up"];
        // the plate under the panel saying what it gives square on in full sun
        const plate = `${rated} W panel`;
        patch(c, 17.2 * U, GROUND + 0.7 * U - 5, plate.length * 7.5 + 8, 17);
        soft(c, 17.2 * U, GROUND + 0.75 * U, plate, 13);
        // the sun, and its rays arriving parallel, the middle one aimed at the stand's pivot
        const far = 6.2 * U,
            sunX = PIVOT[0] + far * Math.cos(rad(sun)),
            sunY = PIVOT[1] - far * Math.sin(rad(sun));
        pen.circle(g, sunX, sunY, 1.3 * U, "ruler", pen.fill("glow"), { strokeWidth: 1.6 });
        a.sun = [sunX, sunY, "up"];
        const dx = -Math.cos(rad(sun)),
            dy = Math.sin(rad(sun)),
            // how far along a ray from a point on the pivot's line it meets the panel's top face
            toFace = (ox: number, oy: number): number => {
                const den = (dx * nx + dy * ny) / th;
                return Math.abs(den) < 1e-6
                    ? 0
                    : ((PIVOT[0] + nx - ox) * nx + (PIVOT[1] + ny - oy) * ny) / th / den;
            };
        for (const t of [-0.7, 0, 0.7]) {
            const ox = PIVOT[0] + t * HALF * ux,
                oy = PIVOT[1] + t * HALF * uy,
                back = far - 1 * U,
                start: [number, number] = [ox - dx * back, oy - dy * back],
                k = toFace(start[0], start[1]);
            pen.line(g, start[0], start[1], start[0] + dx * k, start[1] + dy * k, "ruler", {
                strokeWidth: 1.4,
                stroke: c.t.tang,
                strokeLineDash: [7, 4],
            });
        }
        if (light < 100) {
            const cx = Math.min(18.4 * U, sunX - 0.3 * U),
                cy = sunY + 0.5 * U;
            pen.path(
                g,
                `M${cx - 1.4 * U} ${cy + 0.5 * U}q-0.1 ${-0.9 * U} ${0.7 * U} ${-0.8 * U}q${0.3 * U} ${-0.9 * U} ${1.2 * U} ${-0.6 * U}q${0.8 * U} ${-0.4 * U} ${1.2 * U} ${0.5 * U}q${0.6 * U} ${0.2 * U} ${0.3 * U} ${0.9 * U}z`,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.6 },
            );
            soft(c, 0.4 * U, 1.3 * U, `The cloud lets through ${light}% of the light`, 13, "start");
        }
        if (p.marks > 0) {
            const dashed = { strokeWidth: 1.1, stroke: c.t["ink-soft"], strokeLineDash: [5, 4] };
            pen.line(
                g,
                PIVOT[0] - 3.2 * U,
                PIVOT[1],
                PIVOT[0] + 3.4 * U,
                PIVOT[1],
                "ruler",
                dashed,
            );
            const r = 1.8 * U;
            pen.arc(g, PIVOT[0], PIVOT[1], 2 * r, 2 * r, -rad(sun), 0, "pencil", {
                strokeWidth: 1.2,
            });
            const sl = `${sun}°`,
                ang = rad(sun / 2);
            patch(
                c,
                PIVOT[0] + (r + 0.6 * U) * Math.cos(ang),
                PIVOT[1] - (r + 0.3 * U) * Math.sin(ang) - 5,
                34,
                17,
            );
            num(
                c,
                PIVOT[0] + (r + 0.6 * U) * Math.cos(ang),
                PIVOT[1] - (r + 0.3 * U) * Math.sin(ang),
                sl,
                13,
            );
            if (slope > 0) {
                pen.arc(
                    g,
                    PIVOT[0],
                    PIVOT[1],
                    2 * r,
                    2 * r,
                    Math.PI,
                    Math.PI + rad(slope),
                    "pencil",
                    { strokeWidth: 1.2 },
                );
                const mid = Math.PI + rad(slope / 2),
                    lx = PIVOT[0] + (r + 0.7 * U) * Math.cos(mid),
                    ly = PIVOT[1] + (r + 0.5 * U) * Math.sin(mid) + 10;
                patch(c, lx, ly - 5, 34, 17);
                num(c, lx, ly, `${slope}°`, 13);
            }
        }
        say(c, 4 * U, GROUND + 0.9 * U, "hut", 13);
        return a;
    },
    describe: (p) =>
        `A solar panel on a stand beside a hut, wired to a meter on its wall, with the sun's rays falling on the panel${within(p.light, 0, 100) < 100 ? " past a cloud" : ""}.`,
    reads: true,
    motion: {
        still: "A meter's reading and two angles are read off it, so it holds still while they are taken.",
    },
});
