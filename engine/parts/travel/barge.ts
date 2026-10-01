import type { Ctx, RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

interface BargeParams {
    w: number;
    h: number;
    rails: number;
    load: number[];
    hook: number;
}

/** In squares: the rail posts at each end, a crate, and the room over the deck a hook and its crate hang in. */
export const BARGE = { rail: 1.5, crate: 2, hanging: 4.6 } as const;

const sizeOf = (p: BargeParams) => {
    const w = Math.max(6, Math.min(24, Math.round(p.w))),
        h = Math.max(2, Math.min(6, Math.round(p.h))),
        // whole squares, so the box sits on the page's grid
        above = Math.ceil(
            Math.max(
                p.rails >= 1 ? BARGE.rail : 0,
                p.load.length ? BARGE.crate : 0,
                p.hook >= 1 ? BARGE.crate + BARGE.hanging : 0,
            ),
        );
    return { w, h, above };
};

/** A crate with its number, its top left at `x`, `y` in pixels. */
function crate<G>(c: Ctx<G>, x: number, y: number, n: number): void {
    const { pen, g } = c,
        s = BARGE.crate * U;
    pen.rect(g, x, y, s, s, "pencil", pen.fill("glow"), { strokeWidth: 1.5 });
    pen.line(g, x + 3, y + 3, x + s - 3, y + s - 3, "ruler", { strokeWidth: 0.9, ...FIRM });
    pen.line(g, x + s - 3, y + 3, x + 3, y + s - 3, "ruler", { strokeWidth: 0.9, ...FIRM });
    pen.rect(g, x + s * 0.28, y + s * 0.28, s * 0.44, s * 0.44, "ruler", pen.fill("card"), {
        strokeWidth: 0.8,
        ...FIRM,
    });
    num(c, x + s / 2, y + s * 0.63, n, 15);
}

export const barge = defineDrawing<BargeParams>({
    id: "barge",
    family: "travel",
    title: "Cargo barge",
    group: "Props",
    about: "A flat cargo barge seen from the side: a blue hull with a white stripe and portholes, a wooden deck, a rail post at each end, and numbered crates on the deck, with a crane hook lowering one more.",
    params: { w: 18, h: 4, rails: 1, load: [], hook: 0 },
    settings: {
        w: { kind: "whole", min: 6, max: 24 },
        h: { kind: "whole", min: 2, max: 6 },
        rails: { kind: "whole", min: 0, max: 1 },
        load: { kind: "numbers", min: 1, max: 9, most: 4 },
        hook: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "An empty barge", params: { w: 18, h: 4, rails: 1, load: [], hook: 0 } },
        { label: "Loading crates", params: { w: 12, h: 3, rails: 1, load: [3, 5, 2], hook: 1 } },
    ],
    box: (p) => {
        const s = sizeOf(p);
        return { w: s.w, h: s.h + s.above };
    },
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            { w, h, above } = sizeOf(p),
            top = above * U,
            W = w * U,
            H = h * U,
            line = { strokeWidth: 1.8 };
        // the hull: square at the stern, a raked bow, a white stripe and a row of portholes
        pen.polygon(
            g,
            [
                [0.1 * U, top],
                [W - 0.1 * U, top],
                [W - 0.9 * U, top + H - 0.1 * U],
                [0.6 * U, top + H - 0.1 * U],
            ],
            "pencil",
            pen.fill("sky", "solid"),
            line,
        );
        pen.line(g, 0.35 * U, top + H * 0.42, W - 0.4 * U, top + H * 0.42, "ruler", {
            strokeWidth: 2.4,
            stroke: c.t.card,
            ...FIRM,
        });
        const holes = Math.max(2, Math.floor(w / 3));
        for (let i = 0; i < holes; i++)
            pen.circle(
                g,
                ((i + 0.5) / holes) * W,
                top + H * 0.68,
                0.45 * U,
                "ruler",
                pen.fill("card"),
                {
                    strokeWidth: 0.9,
                    ...FIRM,
                },
            );
        // the deck, planked
        pen.rect(
            g,
            0.1 * U,
            top - 0.25 * U,
            W - 0.2 * U,
            0.25 * U,
            "ruler",
            pen.fill("tang", "hachure"),
            {
                strokeWidth: 1.2,
                ...FIRM,
            },
        );
        if (p.rails >= 1)
            for (const x of [0.3, w - 0.3])
                pen.line(g, x * U, top - 0.25 * U, x * U, top - BARGE.rail * U, "ruler", {
                    strokeWidth: 2.4,
                    ...FIRM,
                });
        // the crates stand on the deck, spread evenly between the rails
        const n = p.load.length,
            gap = (w - 1 - n * BARGE.crate) / (n + 1);
        p.load.forEach((k, i) =>
            crate(
                c,
                (0.5 + gap + i * (BARGE.crate + gap)) * U,
                top - 0.25 * U - BARGE.crate * U,
                k,
            ),
        );
        if (p.hook >= 1) {
            const x = W / 2,
                crateTop = top - 0.25 * U - BARGE.crate * U - 1 * U - BARGE.crate * U;
            pen.line(g, x, 0, x, crateTop - 0.9 * U, "ruler", { strokeWidth: 1.2, ...FIRM });
            pen.path(
                g,
                `M ${x} ${crateTop - 0.9 * U} L ${x} ${crateTop - 0.35 * U} Q ${x + 0.45 * U} ${crateTop - 0.05 * U} ${x + 0.1 * U} ${crateTop + 0.05 * U}`,
                "ruler",
                undefined,
                { strokeWidth: 2.2 },
            );
            pen.line(g, x, crateTop - 0.35 * U, x - 0.8 * U, crateTop, "ruler", {
                strokeWidth: 1,
                ...FIRM,
            });
            pen.line(g, x, crateTop - 0.35 * U, x + 0.8 * U, crateTop, "ruler", {
                strokeWidth: 1,
                ...FIRM,
            });
            crate(c, x - U, crateTop, 4);
        }
        return { deck: [W / 2, top - 0.25 * U, "up"] };
    },
    describe: (p) =>
        `A flat blue cargo barge seen from the side, with a white stripe, portholes and a wooden deck${p.load.length ? `, carrying ${p.load.length === 1 ? "a numbered crate" : `${p.load.length} numbered crates`}` : ""}${p.hook >= 1 ? " while a crane hook lowers another" : ""}.`,
    motion: { still: "The barge moves only as the game floats it on the water." },
});
