import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";

/** The planets out from the sun, and how big each is drawn: sizes in order, not to scale, and never distances. */
interface Planet {
    name: string;
    d: number;
    fill: "tang" | "glow" | "sky" | "berry" | "mint" | "ink-soft";
    rings?: boolean;
}
const MERCURY: Planet = { name: "Mercury", d: 0.5, fill: "ink-soft" };
const PLANETS: Planet[] = [
    MERCURY,
    { name: "Venus", d: 0.8, fill: "glow" },
    { name: "Earth", d: 0.85, fill: "sky" },
    { name: "Mars", d: 0.6, fill: "berry" },
    { name: "Jupiter", d: 2.2, fill: "tang" },
    { name: "Saturn", d: 1.8, fill: "glow", rings: true },
    { name: "Uranus", d: 1.2, fill: "mint" },
    { name: "Neptune", d: 1.15, fill: "sky" },
];

/** How far out the last planet reaches, in user units: the walk the drawing takes, so the box cannot disagree with it. */
const spanOf = (n: number): number => {
    let x = 3 * U;
    for (let i = 0; i < n; i++) {
        const pl = PLANETS[i] ?? MERCURY,
            r = ((pl.d * U) / 2) * 1.15;
        x += r + 0.3 * U;
        x += r + (pl.rings ? r * 0.8 : 0) + 0.3 * U;
    }
    return x;
};

export const planets = defineDrawing({
    id: "planets",
    family: "science",
    title: "The planets in order",
    group: "Props",
    about: "The edge of the sun and the planets in a line going out from it, Mercury first and Neptune last, each drawn bigger or smaller than its neighbours as it really is, though never at its real distance. The order and the sizes are the questions; the gaps are not. Fewer planets take less room, so a few of them can stand where all eight would not fit.",
    params: { count: 8, names: 0 },
    settings: {
        count: { kind: "whole", min: 1, max: 8 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "All eight", params: { count: 8, names: 0 } },
        { label: "All eight, named", params: { count: 8, names: 1 } },
        { label: "The first four", params: { count: 4, names: 1 } },
        { label: "The first three, for a margin", params: { count: 3, names: 0 } },
    ],
    box: (p) => ({ w: Math.ceil(spanOf(Math.max(1, Math.min(8, Math.round(p.count)))) / U), h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(1, Math.min(8, Math.round(p.count))),
            mid = 2.8 * U,
            a: RawAnchors = {};
        pen.path(g, `M0 ${0.2 * U}Q${2.2 * U} ${mid} 0 ${5.4 * U}Z`, "pencil", pen.fill("glow"), {
            strokeWidth: 1.8,
        });
        for (let k = 0; k < 5; k++) {
            const y = (0.8 + k * 1.05) * U;
            pen.line(
                g,
                1.25 * U + Math.sin((k / 4) * Math.PI) * 0.6 * U,
                y,
                1.85 * U + Math.sin((k / 4) * Math.PI) * 0.7 * U,
                y,
                "pencil",
                { strokeWidth: 1.4, stroke: c.t.tang },
            );
        }
        let x = 3 * U;
        for (let i = 0; i < n; i++) {
            const pl = PLANETS[i] ?? MERCURY,
                r = ((pl.d * U) / 2) * 1.15;
            x += r + 0.3 * U;
            if (pl.rings)
                pen.ellipse(g, x, mid, r * 3.4, r * 0.9, "pencil", null, { strokeWidth: 1.6 });
            pen.circle(
                g,
                x,
                mid,
                r * 2,
                "pencil",
                pen.fill(pl.fill, pl.fill === "ink-soft" ? "hachure" : "solid", { hachureGap: 3 }),
                { strokeWidth: 1.4 },
            );
            if (pl.name === "Jupiter")
                for (const dy of [-0.3, 0.2])
                    pen.arc(g, x, mid + dy * r, r * 1.9, r * 0.5, 0.1, Math.PI - 0.1, "pencil", {
                        strokeWidth: 1,
                        stroke: c.t.berry,
                    });
            // the small inner planets sit close together, so their names take turns below and above the line
            if (p.names > 0)
                soft(
                    c,
                    x,
                    i % 2 === 0
                        ? mid + Math.max(r, 0.6 * U) + 0.95 * U
                        : mid - Math.max(r, 0.6 * U) - 0.45 * U,
                    pl.name,
                    12,
                );
            a[`planet(${i})`] = [x, mid - r, "up"];
            x += r + (pl.rings ? r * 0.8 : 0) + 0.3 * U;
        }
        return a;
    },
    describe: (p) =>
        `The sun's edge at the left and the planets in a line out from it, each bigger or smaller than its neighbours as it really is${p.names > 0 ? ", each named underneath" : ""}.`,
    motion: { still: "The planets are read in order along the line, and hold still to be read." },
});
