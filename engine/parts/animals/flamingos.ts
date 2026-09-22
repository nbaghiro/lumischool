import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** A pointed blade from (x, y) along an angle: a wing, a tail. */
function blade(x: number, y: number, len: number, wid: number, angle: number): Pt[] {
    const ca = Math.cos(angle),
        sa = Math.sin(angle),
        at = (t: number, o: number): Pt => [x + t * ca - o * sa, y + t * sa + o * ca],
        out: Pt[] = [];
    for (let i = 0; i <= 8; i++)
        out.push(at((i / 8) * len, (wid / 2) * Math.sin(Math.PI * Math.pow(i / 8, 0.75))));
    for (let i = 7; i >= 1; i--)
        out.push(at((i / 8) * len, -(wid / 2) * Math.sin(Math.PI * Math.pow(i / 8, 0.75))));
    return out;
}

/** The bent beak, pale with a dark tip, hanging from the head at (x, y) on the side `s` faces. */
function beak<G>(c: Ctx<G>, x: number, y: number, s: number, down = 1): void {
    const X = (d: number) => x + s * d * U,
        Y = (d: number) => y + down * d * U;
    c.pen.polygon(
        c.g,
        [
            [X(0.18), Y(-0.16)],
            [X(0.62), Y(-0.02)],
            [X(0.72), Y(0.28)],
            [X(0.52), Y(0.2)],
            [X(0.2), Y(0.14)],
        ],
        "pencil",
        c.pen.fill("card"),
        calm(c, 1.1),
    );
    c.pen.polygon(
        c.g,
        [
            [X(0.56), Y(0)],
            [X(0.72), Y(0.28)],
            [X(0.52), Y(0.2)],
        ],
        "pencil",
        c.pen.fill("ink"),
        calm(c, 0.8),
    );
}

/** A flamingo wading, its feet at (x, feet), facing `s`; `oneLeg` folds the far leg up under it. */
function standing<G>(c: Ctx<G>, x: number, feet: number, s: number, oneLeg: boolean): void {
    const { pen, g } = c,
        X = (d: number) => x + s * d * U,
        body = feet - 4.1 * U;
    const legs: [number, number][] = oneLeg
        ? [[0.05, 0]]
        : [
              [-0.2, -0.1],
              [0.2, 0.15],
          ];
    for (const [dx, lean] of legs)
        pen.linear(
            g,
            [
                [X(dx), body + 0.4 * U],
                [X(dx + lean * 0.5), body + 2.1 * U],
                [X(dx + lean), feet],
            ],
            "pencil",
            { ...calm(c, 1.7), stroke: c.t.berry },
        );
    for (const [dx, lean] of legs)
        pen.linear(
            g,
            [
                [X(dx), body + 0.4 * U],
                [X(dx + lean * 0.5), body + 2.1 * U],
                [X(dx + lean), feet],
            ],
            "pencil",
            calm(c, 0.8),
        );
    if (oneLeg)
        pen.linear(
            g,
            [
                [X(0.1), body + 0.45 * U],
                [X(0.75), body + 1.5 * U],
                [X(0.15), body + 1.7 * U],
            ],
            "pencil",
            calm(c, 1.1),
        );
    // the body, its tail feathers dark at the back
    pen.path(
        g,
        `M${X(-0.95)} ${body - 0.05 * U}Q${X(-0.6)} ${body - 0.62 * U} ${X(0.25)} ${body - 0.55 * U}Q${X(0.95)} ${body - 0.45 * U} ${X(0.9)} ${body + 0.05 * U}Q${X(0.4)} ${body + 0.55 * U} ${X(-0.4)} ${body + 0.4 * U}Z`,
        "pencil",
        pen.fill("berry"),
        calm(c, 1.7),
    );
    pen.polygon(
        g,
        [
            [X(-0.95), body - 0.05 * U],
            [X(-0.55), body - 0.28 * U],
            [X(-0.5), body + 0.18 * U],
        ],
        "pencil",
        pen.fill("ink"),
        calm(c, 0.9),
    );
    pen.curve(
        g,
        [
            [X(-0.45), body - 0.3 * U],
            [X(0.1), body - 0.12 * U],
            [X(0.55), body - 0.3 * U],
        ],
        "pencil",
        calm(c, 1.1),
    );
    // the long neck in an S up to the head
    const neck: Pt[] = [
        [X(0.75), body - 0.25 * U],
        [X(1.05), body - 1.2 * U],
        [X(0.45), body - 2.2 * U],
        [X(0.55), body - 3.25 * U],
    ];
    pen.curve(g, neck, "pencil", { ...calm(c, 5.4), stroke: c.t.ink });
    pen.curve(g, neck, "pencil", { ...calm(c, 3.2), stroke: c.t.berry });
    const hx = X(0.62),
        hy = body - 3.4 * U;
    pen.circle(g, hx, hy, 0.62 * U, "pencil", pen.fill("berry"), calm(c, 1.4));
    beak(c, hx, hy + 0.05 * U, s);
    pen.circle(
        g,
        hx + s * 0.08 * U,
        hy - 0.08 * U,
        4,
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 0.6 },
    );
    // ripples round the legs
    pen.curve(
        g,
        [
            [X(-0.6), feet],
            [X(0), feet - 0.12 * U],
            [X(0.6), feet],
        ],
        "pencil",
        calm(c, 1.1),
    );
}

/** A flamingo in flight at (x, y), heading right and a little up, its wings `up` or pressed down. */
function flying<G>(c: Ctx<G>, x: number, y: number, up: boolean): void {
    const { pen, g } = c,
        a = -0.2,
        ca = Math.cos(a),
        sa = Math.sin(a),
        k = 0.8;
    const P = (u: number, v: number): Pt => [
        x + (u * ca - v * sa) * k * U,
        y + (u * sa + v * ca) * k * U,
    ];
    const farWing = up ? -1.95 : 2.05,
        nearWing = up ? -2.2 : 2.35;
    pen.polygon(
        g,
        blade(...P(0.1, -0.05), 1.5 * k * U, 0.5 * k * U, a + farWing),
        "pencil",
        pen.fill("berry", "hachure", { hachureGap: 3 }),
        calm(c, 1.1),
    );
    pen.linear(g, [P(-0.5, 0.05), P(-2.1, 0.15)], "pencil", { ...calm(c, 1.6), stroke: c.t.berry });
    pen.linear(g, [P(-0.5, 0.05), P(-2.1, 0.15)], "pencil", calm(c, 0.7));
    pen.polygon(
        g,
        blade(...P(-0.75, 0), 1.2 * k * U, 0.34 * k * U, a),
        "pencil",
        pen.fill("berry"),
        calm(c, 1.5),
    );
    pen.polygon(
        g,
        blade(...P(-0.75, 0), 0.45 * k * U, 0.24 * k * U, a + Math.PI),
        "pencil",
        pen.fill("ink"),
        calm(c, 0.8),
    );
    pen.linear(g, [P(0.4, -0.02), P(1.7, -0.12)], "pencil", { ...calm(c, 3.6), stroke: c.t.ink });
    pen.linear(g, [P(0.4, -0.02), P(1.7, -0.12)], "pencil", { ...calm(c, 1.8), stroke: c.t.berry });
    const [hx, hy] = P(1.85, -0.14);
    pen.circle(g, hx, hy, 0.46 * k * U, "pencil", pen.fill("berry"), calm(c, 1.2));
    beak(c, hx, hy, 1);
    const wing = blade(...P(0, 0), 1.75 * k * U, 0.62 * k * U, a + nearWing);
    pen.polygon(g, wing, "pencil", pen.fill("berry"), calm(c, 1.5));
    const tip = wing[8] ?? P(0, 0);
    pen.polygon(
        g,
        blade(tip[0], tip[1], 0.55 * k * U, 0.34 * k * U, a + nearWing + Math.PI),
        "pencil",
        pen.fill("ink"),
        calm(c, 0.9),
    );
}

export const flamingos = defineDrawing({
    id: "flamingos",
    family: "animals",
    title: "Flamingos",
    group: "Characters",
    about: "Pink flamingos with long thin legs, long necks in an S and pale bent beaks with black tips, wading in shallow water with one standing on one leg. Taking off, they fly in a rising line with their necks and legs stretched straight out and black edges to their wings.",
    params: { count: 3, flying: 0 },
    settings: {
        count: { kind: "whole", min: 1, max: 5 },
        flying: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Three standing", params: { count: 3, flying: 0 } },
        { label: "Five taking off", params: { count: 5, flying: 1 } },
    ],
    box: () => ({ w: 12, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.count, 1, 5),
            a: RawAnchors = {};
        if (p.flying > 0) {
            // a loose skein: the first three low with their wings up, the last two higher with their wings pressed down
            const SKEIN = [
                [2.1, 7.2],
                [5.4, 6.1],
                [8.7, 5],
                [3.8, 3.6],
                [7.2, 2.4],
            ] as const;
            for (let i = 0; i < n; i++) {
                const [sx, sy] = SKEIN[i] ?? [6, 5],
                    x = sx * U,
                    y = sy * U;
                flying(c, x, y, i < 3);
                a[`flamingo(${i})`] = [x, y - 0.6 * U, "up"];
            }
            pen.curve(
                g,
                [
                    [0.6 * U, 8.6 * U],
                    [1.6 * U, 8.45 * U],
                    [2.6 * U, 8.6 * U],
                ],
                "pencil",
                calm(c, 1.2),
            );
            return a;
        }
        const gap = n > 3 ? 2.3 : 2.9,
            start = 6 * U - ((n - 1) * gap * U) / 2;
        for (let i = 0; i < n; i++) {
            const x = start + i * gap * U,
                s = i % 2 === 1 ? -1 : 1;
            standing(c, x, 8.4 * U - (i % 2) * 0.3 * U, s, i === 1 || n === 1);
            a[`flamingo(${i})`] = [x, 0.8 * U, "up"];
        }
        for (let x = 0.4 * U; x < 11.4 * U; x += 1.9 * U)
            pen.curve(
                g,
                [
                    [x, 8.75 * U],
                    [x + 0.4 * U, 8.6 * U],
                    [x + 0.8 * U, 8.75 * U],
                ],
                "pencil",
                calm(c, 1),
            );
        return a;
    },
    describe: (p) => describeFlamingos(p),
    motion: {
        body: { is: "float", lift: 0, dx: 2, deg: 1.5, pivot: [0.5, 1], period: 8.2, units: true },
    },
});

/** One or several, wading or flying, in the words that fit each. */
function describeFlamingos(p: { count: number; flying: number }): string {
    const one = clamp(p.count, 1, 5) === 1;
    if (p.flying > 0)
        return one
            ? "A pink flamingo flying with its neck and legs stretched straight out, black edges to its wings and a pale bent beak with a black tip."
            : "Pink flamingos flying in a rising line with their necks and legs stretched straight out, black edges to their wings and pale bent beaks with black tips.";
    return one
        ? "A pink flamingo with long thin legs and a long neck in an S, wading in shallow water on one leg, with a pale bent beak with a black tip."
        : "Pink flamingos with long thin legs and long necks in an S, wading in shallow water, one standing on one leg, with pale bent beaks with black tips.";
}
