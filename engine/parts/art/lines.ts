import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, nameOf, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { type Pt } from "./kit";

const LINE_KINDS = ["straight", "wavy", "zigzag", "dotted", "spiral", "loopy", "dashed"] as const;

/** One line of a kind, from x0 to x1 about the height y. */
function lineOf<G>(
    c: Ctx<G>,
    kind: string,
    x0: number,
    x1: number,
    y: number,
    stroke: string,
): void {
    const { pen, g } = c,
        w = { strokeWidth: 3, stroke },
        pts: Pt[] = [];
    if (kind === "wavy") {
        for (let x = x0; x <= x1; x += 4) pts.push([x, y + 8 * Math.sin((x - x0) / 12)]);
        pen.curve(g, pts, "pencil", w);
        return;
    }
    if (kind === "zigzag") {
        for (let x = x0, k = 0; x <= x1; x += 12, k++) pts.push([x, y + (k % 2 ? 9 : -9)]);
        pen.linear(g, pts, "pencil", w);
        return;
    }
    if (kind === "dotted") {
        for (let x = x0; x <= x1; x += 11)
            pen.circle(
                g,
                x,
                y,
                5,
                "ruler",
                { fill: stroke, fillStyle: "solid" },
                { strokeWidth: 0 },
            );
        return;
    }
    if (kind === "dashed") {
        for (let x = x0; x + 10 <= x1; x += 18) pen.line(g, x, y, x + 10, y, "pencil", w);
        return;
    }
    if (kind === "spiral") {
        const cx = (x0 + x1) / 2;
        for (let t = 0; t < Math.PI * 6; t += 0.25)
            pts.push([cx + Math.cos(t) * (2 + t * 2.6), y + Math.sin(t) * (2 + t * 2.2) * 0.62]);
        pen.curve(g, pts, "pencil", w);
        return;
    }
    if (kind === "loopy") {
        for (let t = 0; t <= Math.PI * 8; t += 0.3)
            pts.push([
                x0 + ((x1 - x0) * t) / (Math.PI * 8) + 7 * Math.cos(t + Math.PI),
                y + 9 * Math.sin(t),
            ]);
        pen.curve(g, pts, "pencil", w);
        return;
    }
    pen.line(g, x0, y, x1, y, "pencil", w);
}

export const lines = defineDrawing({
    id: "lines",
    family: "art",
    title: "Kinds of line",
    group: "Structures",
    about: "Lines of different kinds, one to a row and lettered: straight, wavy, zigzag, dotted, spiral, loopy and dashed. A line is the first thing a child draws with, and naming its kinds is how talking about a drawing starts.",
    params: { kinds: ["wavy", "zigzag", "dotted", "spiral"], colour: "blue" },
    settings: {
        kinds: { kind: "words", of: LINE_KINDS, most: 7 },
        colour: { kind: "text", most: 24 },
    },
    takes: [
        {
            label: "Wavy, zigzag, dotted, spiral",
            params: { kinds: ["wavy", "zigzag", "dotted", "spiral"], colour: "blue" },
        },
        {
            label: "Straight, loopy, dashed",
            params: { kinds: ["straight", "loopy", "dashed"], colour: "red" },
        },
    ],
    box: (p) => ({ w: 14, h: Math.max(1, p.kinds.length) * 3 + 1 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            stroke = c.paper ? c.t.ink : (colourOf(p.colour) ?? panColour("blue"));
        p.kinds.forEach((kind, i) => {
            const y = (2 + i * 3) * U;
            num(c, 0.9 * U, y + 6, "ABCDEFG"[i] ?? "", 16);
            lineOf(
                c,
                (LINE_KINDS as readonly string[]).includes(kind) ? kind : "straight",
                2.4 * U,
                13.2 * U,
                y,
                stroke,
            );
            a[`line(${i})`] = [7.8 * U, y - U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `${Math.max(1, p.kinds.length)} lines of different kinds one to a row, each lettered at the left, drawn in ${nameOf(colourOf(p.colour) ?? panColour("blue")).name} across the page.`,
});
