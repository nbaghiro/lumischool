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

/** Where each swallow flies in the group, in squares: its middle, the way it heads in degrees (0 is right), its size, and how far its wings are spread (1 wide open, 0 swept back). */
const SLOTS: { x: number; y: number; heading: number; k: number; spread: number }[] = [
    { x: 2.3, y: 2.4, heading: -14, k: 0.95, spread: 1 },
    { x: 7.5, y: 2.0, heading: 10, k: 0.9, spread: 0.3 },
    { x: 5.0, y: 3.35, heading: -4, k: 0.8, spread: 0.7 },
    { x: 8.7, y: 3.9, heading: -24, k: 0.7, spread: 0.9 },
    { x: 4.2, y: 1.2, heading: 18, k: 0.66, spread: 0.2 },
    { x: 1.2, y: 4.1, heading: 8, k: 0.62, spread: 0.6 },
    { x: 6.3, y: 4.3, heading: 26, k: 0.58, spread: 0.1 },
];

/** One swallow seen from below as it flies, heading right: two long swept wings, a forked tail, a pale front and a red throat. */
function swallow<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    heading: number,
    k: number,
    spread: number,
): void {
    const { pen, g } = c,
        t = (heading * Math.PI) / 180,
        cos = Math.cos(t),
        sin = Math.sin(t);
    const P = (u: number, v: number): Pt => [
        x + (u * cos - v * sin) * k * U,
        y + (u * sin + v * cos) * k * U,
    ];
    const at = (u: number, v: number) =>
        P(u, v)
            .map((n) => n.toFixed(1))
            .join(" ");
    const dark = pen.fill("ink-soft");
    // the tail's two streamers
    for (const s of [-1, 1])
        pen.path(
            g,
            `M${at(-0.35, s * 0.08)}Q${at(-0.8, s * 0.2)} ${at(-1.3, s * 0.42)}Q${at(-0.8, s * 0.1)} ${at(-0.4, 0)}Z`,
            "pencil",
            dark,
            calm(c, 1.2 * k + 0.3),
        );
    // the wings, each a long crescent swept back to its tip
    const tipU = -0.25 - 0.55 * (1 - spread),
        tipV = 0.85 + 0.55 * spread;
    for (const s of [-1, 1])
        pen.path(
            g,
            `M${at(0.28, s * 0.1)}Q${at(0.3, s * (tipV * 0.6))} ${at(tipU, s * tipV)}Q${at(-0.15, s * tipV * 0.45)} ${at(-0.18, s * 0.12)}Z`,
            "pencil",
            dark,
            calm(c, 1.5 * k + 0.2),
        );
    // the body, pale underneath, with the dark head in front and the red throat under it
    pen.path(
        g,
        `M${at(0.62, 0)}Q${at(0.45, -0.22)} ${at(0, -0.2)}Q${at(-0.35, -0.14)} ${at(-0.45, 0)}Q${at(-0.35, 0.14)} ${at(0, 0.2)}Q${at(0.45, 0.22)} ${at(0.62, 0)}Z`,
        "pencil",
        pen.fill("card"),
        calm(c, 1.5 * k + 0.2),
    );
    pen.path(
        g,
        `M${at(0.64, 0)}Q${at(0.58, -0.17)} ${at(0.42, -0.17)}Q${at(0.3, 0)} ${at(0.42, 0.17)}Q${at(0.58, 0.17)} ${at(0.64, 0)}Z`,
        "pencil",
        dark,
        calm(c, 1.1 * k + 0.2),
    );
    pen.path(
        g,
        `M${at(0.42, -0.14)}Q${at(0.26, 0)} ${at(0.42, 0.14)}Q${at(0.2, 0.12)} ${at(0.16, 0)}Q${at(0.2, -0.12)} ${at(0.42, -0.14)}Z`,
        "pencil",
        pen.fill("berry"),
        calm(c, 0.9 * k + 0.2),
    );
}

export const swallows = defineDrawing({
    id: "swallows",
    family: "animals",
    title: "Swallows",
    group: "Characters",
    about: "A loose group of swallows seen from below as they swoop past, each with long dark swept-back wings, a dark head, a red throat, a pale front and a long forked tail, some with their wings spread wide and some swept back.",
    params: { count: 5 },
    settings: { count: { kind: "whole", min: 2, max: 7 } },
    takes: [
        { label: "Five", params: { count: 5 } },
        { label: "Three", params: { count: 3 } },
        { label: "Seven", params: { count: 7 } },
    ],
    box: () => ({ w: 10, h: 5 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            n = Math.max(2, Math.min(SLOTS.length, Math.round(p.count)));
        SLOTS.slice(0, n).forEach((s, i) => {
            swallow(c, s.x * U, s.y * U, s.heading, s.k, s.spread);
            a[`bird(${i})`] = [s.x * U, s.y * U, "up"];
        });
        return a;
    },
    describe: () =>
        "A group of swallows seen from below as they swoop past, each with long dark swept-back wings, a dark head, a red throat, a pale front and a forked tail.",
    motion: {
        body: { is: "float", lift: 8, dx: 12, deg: 3, pivot: [0.5, 0.5], period: 7.8, units: true },
    },
});
