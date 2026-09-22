import { roundedRect } from "../../ink/pen";
import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";

/** The same tick as the sticker's, small enough for the corner of the box. */
function bigTick<G>(c: Ctx<G>, x: number, y: number, r: number): void {
    c.pen.circle(c.g, x, y, r * 2, "doodle", c.pen.fill("mint"), { strokeWidth: 1.8 });
    c.pen.linear(
        c.g,
        [
            [x - r * 0.5, y],
            [x - r * 0.12, y + r * 0.42],
            [x + r * 0.55, y - r * 0.45],
        ],
        "pencil",
        { strokeWidth: 3, stroke: c.paper ? c.t.ink : c.t.ok },
    );
}

export const callout = defineDrawing({
    id: "callout",
    family: "page",
    title: "Callout",
    group: "Marks",
    about: "A boxed aside: a hint, a reminder, or the thing to watch out for. The kind is carried by a mark in the corner rather than a colour, so it still says which it is in black ink.",
    params: { kind: "tip", lines: ["Start from the bigger number", "and count on."], width: 18 },
    settings: {
        kind: { kind: "one of", of: ["tip", "careful", "try"] },
        lines: { kind: "words", most: 4 },
        width: { kind: "whole", min: 8, max: 30 },
    },
    takes: [
        {
            label: "A hint",
            params: {
                kind: "tip",
                lines: ["Start from the bigger number", "and count on."],
                width: 18,
            },
        },
        {
            label: "Watch out",
            params: { kind: "careful", lines: ["The units are not the same."], width: 16 },
        },
        {
            label: "Have a go",
            params: {
                kind: "try",
                lines: ["Try it with a number line", "before you write anything."],
                width: 19,
            },
        },
    ],
    box: (p) => ({ w: p.width, h: p.lines.length * 2 + 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = (p.width - 1) * U,
            h = (p.lines.length * 2 + 2) * U,
            x = U / 2,
            y = U / 2;
        const tint: Marker = p.kind === "careful" ? "tang" : p.kind === "try" ? "mint" : "glow";
        pen.path(
            g,
            roundedRect(x, y, w, h, 10),
            "pencil",
            pen.fill(tint, "solid", { hachureGap: 11, fillWeight: 0.5 }),
            { strokeWidth: 2 },
        );
        pen.line(g, x + 0.2 * U, y + 8, x + 0.2 * U, y + h - 8, "pencil", { strokeWidth: 4 });
        const cx = x + 1.6 * U,
            cy = y + 1.3 * U;
        if (p.kind === "careful") {
            pen.polygon(
                g,
                [
                    [cx, cy - 0.75 * U],
                    [cx + 0.8 * U, cy + 0.65 * U],
                    [cx - 0.8 * U, cy + 0.65 * U],
                ],
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.8 },
            );
            num(c, cx, cy + 0.5 * U, "!", 19);
        } else if (p.kind === "try") {
            bigTick(c, cx, cy, 0.8 * U);
        } else {
            pen.circle(g, cx, cy, 1.5 * U, "pencil", pen.fill("card"), { strokeWidth: 1.8 });
            num(c, cx, cy + 7, "?", 20);
        }
        p.lines.forEach((line, i) => say(c, x + 3 * U, y + (1.5 + i * 1.7) * U, line, 16, "start"));
        const a: RawAnchors = { icon: [cx, cy, "left"], box: [x + w / 2, y, "up"] };
        return a;
    },
    describe: (p) => {
        const mark =
            p.kind === "careful"
                ? "a triangle with an exclamation mark"
                : p.kind === "try"
                  ? "a tick in a circle"
                  : "a circled question mark";
        return `A boxed aside with a thick line down its left edge and ${mark} in the corner, with ${p.lines.length === 1 ? "one line" : "lines"} of text beside it.`;
    },
});
