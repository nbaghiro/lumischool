import { type Ctx } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { MARKERS, U, type Marker } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { say, wide } from "../lettering";

const SIGN_SIZE: Record<string, number> = { post: 20, board: 16, hanging: 18, door: 17 };

/** A sign's plate is as wide as its longest line, in squares. */
const plateW = (lines: string[], size: number): number =>
    Math.max(5, Math.ceil(Math.max(0, ...lines.map((l) => wide(l, size))) / U) + 2);

const pip = <G>(c: Ctx<G>, x: number, y: number, d = 5) =>
    c.pen.circle(
        c.g,
        x,
        y,
        d,
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 0.6 },
    );

interface SignParams {
    lines: string[];
    kind: string;
    color: Marker;
}

export const sign = defineDrawing<SignParams>({
    id: "sign",
    family: "stories",
    title: "A sign",
    group: "Props",
    about: "The writing a child meets outside a book: a plate on a post at the bus stop, a notice board on legs, a shop's hanging sign and a card on a door. Short, set large and centred, and read for what it tells you to do or where it tells you to go.",
    params: { lines: ["BUS STOP"], kind: "post", color: "sky" },
    settings: {
        lines: { kind: "words", most: 4 },
        kind: { kind: "one of", of: ["post", "board", "hanging", "door"] },
        color: { kind: "one of", of: MARKERS },
    },
    takes: [
        {
            label: "Bus stop",
            params: { lines: ["BUS STOP", "Number 12"], kind: "post", color: "sky" },
        },
        {
            label: "A notice",
            params: {
                lines: ["Fair on the green", "Saturday at 10", "Bring a cake"],
                kind: "board",
                color: "tang",
            },
        },
        {
            label: "A shop sign",
            params: { lines: ["Fresh Bread"], kind: "hanging", color: "berry" },
        },
        { label: "On the door", params: { lines: ["OPEN"], kind: "door", color: "mint" } },
    ],
    box: (p) => {
        const size = SIGN_SIZE[p.kind] ?? 18,
            w = plateW(p.lines, size),
            ph = Math.max(1, p.lines.length) * 1.6 + 1.2;
        const extra = p.kind === "post" ? 5 : p.kind === "board" ? 2.6 : 2;
        return {
            w: w + (p.kind === "board" || p.kind === "hanging" ? 2 : 1),
            h: Math.ceil(ph + extra),
        };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            size = SIGN_SIZE[p.kind] ?? 18,
            pw = plateW(p.lines, size) * U,
            ph = (Math.max(1, p.lines.length) * 1.6 + 1.2) * U;
        const W = pw + (p.kind === "board" || p.kind === "hanging" ? 2 : 1) * U;
        let px = 0.5 * U,
            py = 0.4 * U;
        if (p.kind === "hanging") {
            pen.line(g, 0.3 * U, 0.2 * U, 0.3 * U, 1.8 * U, "pencil", { strokeWidth: 2.4 });
            pen.line(g, 0.3 * U, 0.6 * U, W - 0.4 * U, 0.6 * U, "pencil", { strokeWidth: 2.4 });
            px = 1.3 * U;
            py = 1.8 * U;
            for (const x of [px + 0.8 * U, px + pw - 0.8 * U])
                pen.line(g, x, 0.6 * U, x, py, "ruler", {
                    strokeWidth: 1.2,
                    strokeLineDash: [3, 3],
                });
        } else if (p.kind === "board") {
            px = 1 * U;
            py = 0.6 * U;
            for (const [x0, x1] of [
                [px + 0.8 * U, px + 0.2 * U],
                [px + pw - 0.8 * U, px + pw - 0.2 * U],
            ] as const)
                pen.line(g, x0, py + ph, x1, py + ph + 1.8 * U, "pencil", { strokeWidth: 2.6 });
            pen.path(
                g,
                roundedRect(px - 0.4 * U, py - 0.4 * U, pw + 0.8 * U, ph + 0.8 * U, 6),
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 4 }),
                { strokeWidth: 2 },
            );
        } else if (p.kind === "door") {
            px = 0.5 * U;
            py = 1.4 * U;
            pen.path(
                g,
                `M${px + pw * 0.3} ${py}L${px + pw / 2} ${0.3 * U}L${px + pw * 0.7} ${py}`,
                "pencil",
                null,
                { strokeWidth: 1.3 },
            );
            pip(c, px + pw / 2, 0.35 * U);
        } else {
            pen.rect(
                g,
                px + pw / 2 - 0.25 * U,
                py + ph - 0.2 * U,
                0.5 * U,
                4.6 * U,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                { strokeWidth: 1.6 },
            );
            pen.line(
                g,
                px + pw / 2 - 1.4 * U,
                py + ph + 4.4 * U,
                px + pw / 2 + 1.4 * U,
                py + ph + 4.4 * U,
                "pencil",
                { strokeWidth: 2 },
            );
        }
        pen.path(g, roundedRect(px, py, pw, ph, 8), "ruler", pen.fill(p.color), { strokeWidth: 2 });
        pen.path(
            g,
            roundedRect(px + 0.35 * U, py + 0.35 * U, pw - 0.7 * U, ph - 0.7 * U, 5),
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.2 },
        );
        p.lines.forEach((line, i) => {
            if (line) say(c, px + pw / 2, py + (1.75 + i * 1.6) * U, line, size);
            else
                pen.line(
                    g,
                    px + 0.9 * U,
                    py + (1.85 + i * 1.6) * U,
                    px + pw - 0.9 * U,
                    py + (1.85 + i * 1.6) * U,
                    "ruler",
                    { strokeWidth: 1.6 },
                );
        });
        return { sign: [px + pw / 2, py, "up"] };
    },
    describe: (p) =>
        p.kind === "board"
            ? "A notice board on two legs with short lines of writing set large and centred on it, the way a notice is read."
            : p.kind === "hanging"
              ? "A sign hanging from a bracket on chains with short words set large and centred on it, the way a shop's sign is read."
              : p.kind === "door"
                ? "A card on a door with short words set large and centred on it, the way a notice on a door is read."
                : "A plate on a post with short words set large and centred on it, the way a sign at a bus stop is read.",
    motion: { still: STILL.text },
});
