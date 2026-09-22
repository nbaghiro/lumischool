import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

type Pt = [number, number];

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});
const HULLS: Marker[] = ["sky", "berry", "tang"];
/** How far the boats lean in the wind, in radians. */
const HEEL = 0.2;

export const yachts = defineDrawing({
    id: "yachts",
    family: "travel",
    title: "Sailing boats racing",
    group: "Structures",
    about: "A row of small sailing boats racing on the sea, each leaning over in the wind with a wake behind it and its number on its sail, from one along the row.",
    params: { count: 3 },
    settings: { count: { kind: "whole", min: 1, max: 5 } },
    takes: [
        { label: "Three racing", params: { count: 3 } },
        { label: "Five racing", params: { count: 5 } },
    ],
    box: () => ({ w: 16, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(1, Math.min(5, Math.round(p.count))),
            a: RawAnchors = {},
            water = 5.75 * U;
        const cell = Math.min(3.2 * U, (15.6 * U) / n),
            x0 = (16 * U - n * cell) / 2;
        for (let k = 0; k < n; k++) {
            const cx = x0 + (k + 0.5) * cell + 0.15 * U,
                base = water - 0.05 * U;
            // points in the boat's own frame, heeled over about the middle of its hull
            const R = (u: number, v: number): Pt => [
                cx + u * U * Math.cos(HEEL) + v * U * Math.sin(HEEL),
                base + u * U * Math.sin(HEEL) - v * U * Math.cos(HEEL),
            ];
            // the wake behind it
            for (const [y, x, w] of [
                [0.3, -1.25, 0.8],
                [0.55, -1.5, 0.6],
            ] as const)
                pen.line(
                    g,
                    cx + x * U,
                    water + y * U,
                    cx + (x + w) * U,
                    water + (y - 0.08) * U,
                    "pencil",
                    calm(c, 1.1),
                );
            // the jib, the mast and the mainsail with its number
            pen.polygon(
                g,
                [R(0.35, 4.3), R(0.4, 0.75), R(1.25, 0.75)],
                "pencil",
                pen.fill("card"),
                calm(c, 1.3),
            );
            pen.line(g, ...R(0.2, 0.5), ...R(0.2, 4.7), "pencil", calm(c, 1.8));
            const sail: [Pt, Pt, Pt] = [R(0.05, 4.55), R(0.05, 0.85), R(-1.2, 0.85)];
            pen.path(
                g,
                `M${sail[0][0]} ${sail[0][1]}L${sail[1][0]} ${sail[1][1]}L${sail[2][0]} ${sail[2][1]}Q${R(-0.75, 2.8)[0]} ${R(-0.75, 2.8)[1]} ${sail[0][0]} ${sail[0][1]}Z`,
                "pencil",
                pen.fill("card"),
                calm(c, 1.7),
            );
            pen.line(g, ...R(-1.3, 0.8), ...R(0.2, 0.8), "pencil", calm(c, 1.6));
            const [nx, ny] = R(-0.33, 1.75);
            num(c, nx, ny + 6, String(k + 1), 17);
            // the hull, low in the water
            pen.polygon(
                g,
                [R(-1.35, 0.55), R(1.35, 0.55), R(1.05, -0.05), R(-1.1, -0.1)],
                "pencil",
                pen.fill(HULLS[k % HULLS.length] ?? "sky"),
                calm(c, 1.7),
            );
            a[`boat(${k})`] = [...R(0.2, 4.7), "up"];
        }
        // the sea they share
        const line: Pt[] = [];
        for (let x = 0.1 * U; x <= 15.9 * U; x += 0.5 * U)
            line.push([x, water + 0.1 * U * Math.sin(x / (0.55 * U))]);
        pen.polygon(
            g,
            [...line, [15.9 * U, 6.9 * U], [0.1 * U, 6.9 * U]],
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
            { stroke: "none" },
        );
        pen.curve(g, line, "pencil", calm(c, 1.5));
        a.sea = [8 * U, water, "down"];
        return a;
    },
    describe: (p) =>
        Math.round(p.count) > 1
            ? "Small sailing boats racing in a row on the sea, each leaning over in the wind with a wake behind it and a number on its sail."
            : "A small sailing boat racing on the sea, leaning over in the wind with a wake behind it and a number on its sail.",
    motion: {
        body: { is: "float", lift: 3, dx: 0, deg: 2, pivot: [0.5, 1], period: 6.2, units: true },
    },
});
