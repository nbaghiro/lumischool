import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

// Each lit lamp flashes a pattern of its own, drawn above it: a fan of long rays, short dashes stacked, or dots.
function flash<G>(c: Ctx<G>, x: number, top: number, kind: number): void {
    const { pen, g } = c,
        o = calm(c, 1.6);
    if (kind === 0) {
        for (const a of [-0.45, 0, 0.45])
            pen.line(
                g,
                x + Math.sin(a) * 0.15 * U,
                top - 0.1 * U,
                x + Math.sin(a) * 0.75 * U,
                top - Math.cos(a) * 0.95 * U,
                "pencil",
                o,
            );
    } else if (kind === 1) {
        for (const dy of [0.25, 0.6, 0.95])
            pen.line(g, x - 0.22 * U, top - dy * U, x + 0.22 * U, top - dy * U, "pencil", o);
    } else {
        for (const dy of [0.2, 0.6, 1])
            pen.circle(g, x, top - dy * U, 5, "ruler", pen.fill("ink"), { stroke: "none" });
    }
}

export const lampStation = defineDrawing({
    id: "lampstation",
    family: "places",
    title: "Lamp station",
    group: "Structures",
    about: "A short round tower of pale stone blocks on a pink granite rock in the sea, with a gallery at the top holding a row of small lamps, dark or lit, each lit one flashing its own pattern.",
    params: { lamps: 4, lit: 0 },
    settings: { lamps: { kind: "whole", min: 3, max: 5 }, lit: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Four lamps, dark", params: { lamps: 4, lit: 0 } },
        { label: "Five lamps flashing", params: { lamps: 5, lit: 1 } },
        { label: "Three lamps flashing", params: { lamps: 3, lit: 1 } },
    ],
    box: () => ({ w: 8, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(3, Math.min(5, Math.round(p.lamps))),
            lit = p.lit > 0,
            a: RawAnchors = {};
        const cx = 4 * U,
            top = 3.9 * U,
            foot = 9.9 * U;
        const half = (y: number) => 1.35 * U + 0.5 * U * ((y - top) / (foot - top));

        // the sea at the foot of the rock
        const sea: Pt[] = [];
        for (let x = 0.1 * U; x <= 7.9 * U; x += 0.4 * U)
            sea.push([x, 11.3 * U + 0.1 * U * Math.sin(x / (0.5 * U))]);
        pen.polygon(
            g,
            [...sea, [7.9 * U, 11.9 * U], [0.1 * U, 11.9 * U]],
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
            { stroke: "none" },
        );
        pen.curve(g, sea, "pencil", calm(c, 1.5));

        // the rock, pink granite, with its cracks
        pen.path(
            g,
            `M${0.4 * U} ${11.4 * U}Q${0.5 * U} ${10.2 * U} ${1.6 * U} ${9.8 * U}Q${2.8 * U} ${9.2 * U} ${4.3 * U} ${9.4 * U}Q${6.2 * U} ${9.3 * U} ${6.9 * U} ${10.1 * U}Q${7.6 * U} ${10.6 * U} ${7.6 * U} ${11.4 * U}Z`,
            "pencil",
            pen.fill("berry", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
            calm(c, 1.8),
        );
        for (const [x0, y0, x1, y1] of [
            [1.2, 10.3, 1.7, 11],
            [6.3, 10.2, 6.7, 10.9],
            [5.3, 10.7, 5.6, 11.3],
        ] as const)
            pen.line(g, x0 * U, y0 * U, x1 * U, y1 * U, "pencil", calm(c, 1.1));
        // a cushion of thrift in a crack
        pen.ellipse(
            g,
            1.5 * U,
            10.1 * U,
            0.9 * U,
            0.35 * U,
            "pencil",
            pen.fill("mint"),
            calm(c, 1.1),
        );
        for (const dx of [-0.25, 0.05, 0.3])
            pen.circle(g, (1.5 + dx) * U, 9.75 * U, 7, "pencil", pen.fill("berry"), calm(c, 0.9));

        // the tower, round, of pale stone laid in courses
        pen.path(
            g,
            `M${cx - half(top)} ${top}L${cx + half(top)} ${top}L${cx + half(foot)} ${foot}Q${cx} ${foot + 0.45 * U} ${cx - half(foot)} ${foot}Z`,
            "pencil",
            pen.fill("card"),
            calm(c, 1.8),
        );
        for (let y = top + 0.75 * U, row = 0; y < foot - 0.2 * U; y += 0.75 * U, row++) {
            const w = half(y) - 0.05 * U;
            pen.path(
                g,
                `M${cx - w} ${y}Q${cx} ${y + 0.22 * U} ${cx + w} ${y}`,
                "pencil",
                null,
                calm(c, 1.1),
            );
            for (const u of row % 2 ? [-0.9, 0, 0.9] : [-0.45, 0.45]) {
                const x = cx + u * U * (half(y) / (1.6 * U));
                pen.line(
                    g,
                    x,
                    y - 0.72 * U + 0.2 * U * (1 - (u * u) / 1.2),
                    x,
                    y + 0.16 * U * (1 - (u * u) / 1.2),
                    "pencil",
                    calm(c, 1),
                );
            }
        }
        // an arched door, and a small window above it
        pen.path(
            g,
            `M${cx - 0.45 * U} ${foot + 0.2 * U}V${foot - 1 * U}Q${cx} ${foot - 1.75 * U} ${cx + 0.45 * U} ${foot - 1 * U}V${foot + 0.2 * U}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
            calm(c, 1.5),
        );
        pen.path(
            g,
            `M${cx - 0.3 * U} ${6.6 * U}V${6.1 * U}Q${cx} ${5.65 * U} ${cx + 0.3 * U} ${6.1 * U}V${6.6 * U}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            calm(c, 1.3),
        );

        // the gallery on its corbels, with a rail behind the lamps
        const L = 1 * U,
            R = 7 * U;
        for (let x = cx - half(top) + 0.2 * U; x < cx + half(top); x += 0.55 * U)
            pen.polygon(
                g,
                [
                    [x, top],
                    [x + 0.35 * U, top],
                    [x + 0.175 * U, top + 0.35 * U],
                ],
                "pencil",
                null,
                calm(c, 1),
            );
        for (let k = 0; k <= 8; k++)
            pen.line(
                g,
                L + 0.1 * U + (k * (R - L - 0.2 * U)) / 8,
                top - 0.25 * U,
                L + 0.1 * U + (k * (R - L - 0.2 * U)) / 8,
                top - 1.55 * U,
                "pencil",
                calm(c, 1.1),
            );
        pen.line(g, L, top - 1.55 * U, R, top - 1.55 * U, "pencil", calm(c, 1.4));
        pen.rect(
            g,
            L - 0.1 * U,
            top - 0.3 * U,
            R - L + 0.2 * U,
            0.34 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            calm(c, 1.7),
        );

        // the lamps along the gallery
        const step = (R - L) / n;
        for (let k = 0; k < n; k++) {
            const x = L + (k + 0.5) * step,
                gy = top - 1 * U,
                gw = 0.72 * U,
                gh = 1 * U;
            if (lit) {
                pen.circle(
                    g,
                    x,
                    gy,
                    Math.min(1.5 * U, step * 1.1),
                    "pencil",
                    pen.fill("glow", "hachure", { hachureGap: 2.5, fillWeight: 1.2 }),
                    { stroke: "none" },
                );
                flash(c, x, gy - gh / 2 - 0.45 * U, k % 3);
            }
            pen.rect(
                g,
                x - 0.22 * U,
                top - 0.45 * U,
                0.44 * U,
                0.15 * U,
                "pencil",
                pen.fill("ink-soft"),
                calm(c, 1),
            );
            pen.path(
                g,
                `M${x - gw / 2} ${gy + gh / 2}V${gy - gh / 2 + 0.12 * U}Q${x} ${gy - gh / 2 - 0.12 * U} ${x + gw / 2} ${gy - gh / 2 + 0.12 * U}V${gy + gh / 2}Z`,
                "pencil",
                lit
                    ? pen.fill("glow")
                    : pen.fill("ink-soft", "hachure", { hachureGap: 2.5, fillWeight: 0.8 }),
                calm(c, 1.6),
            );
            pen.polygon(
                g,
                [
                    [x - 0.4 * U, gy - gh / 2 + 0.05 * U],
                    [x, gy - gh / 2 - 0.35 * U],
                    [x + 0.4 * U, gy - gh / 2 + 0.05 * U],
                ],
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                calm(c, 1.3),
            );
            a[`lamp(${k})`] = [x, gy - gh / 2 - 0.35 * U, "up"];
        }
        a.door = [cx, foot - 1.75 * U, "up"];
        a.rock = [6.9 * U, 10.1 * U, "right"];
        return a;
    },
    describe: (p) =>
        `A short round stone tower on a pink granite rock in the sea, with a gallery at the top holding a row of small lamps, ${p.lit > 0 ? "all lit and flashing" : "all dark"}.`,
    motion: { still: "Its lamps are read as a pattern of on and off, so they hold still." },
});
