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

/** Where each bird of the flock flies, in squares, and how far through its wingbeat it is: the first ones lowest. */
const FLOCK: [number, number, number][] = [
    [2, 4.4, 0],
    [4.3, 2.3, 1],
    [4.8, 5, 2],
    [6.9, 3.5, 0],
    [8.4, 1.6, 2],
    [9.3, 4.8, 1],
    [10.8, 2.9, 0],
    [2.2, 1.6, 2],
];

/** One parakeet heading up and to the right, its wings up, swept back, or down. */
function parakeet<G>(c: Ctx<G>, x: number, y: number, beat: number): void {
    const { pen, g } = c,
        a = -0.42,
        ca = Math.cos(a),
        sa = Math.sin(a),
        k = 0.78;
    const P = (u: number, v: number): Pt => [
        x + (u * ca - v * sa) * k * U,
        y + (u * sa + v * ca) * k * U,
    ];
    const BEATS: readonly [number, number][] = [
        [-2.05, -1.75],
        [2.7, 2.45],
        [-2.6, -2.35],
    ];
    const [far, near] = BEATS[beat] ?? [-2.05, -1.75];
    const wing = (at: Pt, len: number, ang: number, hatch: boolean): void => {
        const w = blade(at[0], at[1], len * k * U, 0.42 * k * U, a + ang);
        pen.polygon(
            g,
            w,
            "pencil",
            hatch ? pen.fill("mint", "hachure", { hachureGap: 2.5 }) : pen.fill("mint"),
            calm(c, hatch ? 1 : 1.3),
        );
        const tip = w[5] ?? at;
        pen.polygon(
            g,
            blade(tip[0], tip[1], 0.62 * len * k * U, 0.2 * k * U, a + ang),
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 2 }),
            calm(c, 0.8),
        );
    };
    wing(P(0.15, -0.02), 1.35, far, true);
    // the tail: two long thin feathers
    pen.polygon(
        g,
        blade(...P(-0.5, 0.02), 2.2 * k * U, 0.22 * k * U, a + Math.PI + 0.05),
        "pencil",
        pen.fill("mint"),
        calm(c, 1.1),
    );
    pen.polygon(
        g,
        blade(...P(-0.5, 0.06), 1.7 * k * U, 0.18 * k * U, a + Math.PI - 0.1),
        "pencil",
        pen.fill("mint", "hachure", { hachureGap: 2.5 }),
        calm(c, 0.9),
    );
    const body: Pt[] = [];
    for (let n = 0; n < 14; n++) {
        const t = (n / 14) * Math.PI * 2;
        body.push(P(Math.cos(t) * 0.66, Math.sin(t) * (Math.cos(t) > 0 ? 0.32 : 0.24)));
    }
    pen.polygon(g, body, "pencil", pen.fill("mint"), calm(c, 1.4));
    const [hx, hy] = P(0.8, -0.08);
    pen.circle(g, hx, hy, 0.6 * k * U, "pencil", pen.fill("mint"), calm(c, 1.3));
    const B = (u: number, v: number): Pt => [
        hx + (u * ca - v * sa) * k * U,
        hy + (u * sa + v * ca) * k * U,
    ];
    pen.path(
        g,
        `M${B(0.18, -0.14).join(" ")}Q${B(0.46, -0.12).join(" ")} ${B(0.4, 0.14).join(" ")}L${B(0.18, 0.1).join(" ")}Z`,
        "pencil",
        pen.fill("berry"),
        calm(c, 0.9),
    );
    pen.circle(
        g,
        ...B(0.04, -0.07),
        3.2,
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 0.6 },
    );
    wing(P(0.1, 0.03), 1.5, near, false);
}

export const parakeets = defineDrawing({
    id: "parakeets",
    family: "animals",
    title: "Parakeets",
    group: "Characters",
    about: "A flock of green parakeets flying up and away to the right, each with long pointed tail feathers, a small red hooked beak and darker ends to its wings, their wings up, swept back or down at different moments of a beat.",
    params: { count: 6 },
    settings: { count: { kind: "whole", min: 1, max: 8 } },
    takes: [
        { label: "Six", params: { count: 6 } },
        { label: "Four", params: { count: 4 } },
    ],
    box: () => ({ w: 12, h: 6 }),
    draw: (c, p) => {
        const n = clamp(p.count, 1, 8),
            a: RawAnchors = {};
        FLOCK.slice(0, n).forEach(([x, y, beat], i) => {
            parakeet(c, x * U, y * U, beat);
            a[`bird(${i})`] = [x * U, (y - 0.4) * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        clamp(p.count, 1, 8) > 1
            ? "A flock of green parakeets flying up and away to the right, each with long pointed tail feathers, a small red hooked beak and darker ends to its wings."
            : "A green parakeet flying up and away to the right, with long pointed tail feathers, a small red hooked beak and darker ends to its wings.",
    motion: {
        body: { is: "float", lift: 8, dx: 12, deg: 3, pivot: [0.5, 0.5], period: 7.2, units: true },
    },
});
