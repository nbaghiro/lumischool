import { group, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, paintFill, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { loop } from "../marks";
import { TOOL_KINDS } from "./kit";

/** One tool lying on the diagonal of a box `s` across, its business end at the bottom left. */
function tool<G>(c: Ctx<G>, kind: string, x: number, y: number, s: number, hex: string): void {
    const { pen } = c,
        k = s / 100;
    const g = group(c, {
        turn: [
            ["translate", x, y],
            ["scale", k],
        ],
    }).g;
    const w = 1.8 / k,
        ink = { strokeWidth: w },
        paint = paintFill(c, hex, k);
    const wood = c.pen.fill("tang", "solid");
    if (kind === "pencil") {
        pen.polygon(
            g,
            [
                [30, 70],
                [78, 22],
                [90, 34],
                [42, 82],
            ],
            "pencil",
            c.pen.fill("glow"),
            ink,
        );
        pen.polygon(
            g,
            [
                [30, 70],
                [42, 82],
                [16, 90],
                [10, 84],
            ],
            "pencil",
            { fill: "#F2D3A2", fillStyle: "solid" },
            ink,
        );
        pen.polygon(
            g,
            [
                [16, 90],
                [10, 84],
                [7, 94],
            ],
            "ruler",
            paint,
            { strokeWidth: w * 0.8 },
        );
        pen.polygon(
            g,
            [
                [78, 22],
                [90, 34],
                [96, 28],
                [84, 16],
            ],
            "ruler",
            c.pen.fill("berry"),
            ink,
        );
    } else if (kind === "crayon") {
        pen.polygon(
            g,
            [
                [28, 66],
                [72, 22],
                [88, 38],
                [44, 82],
            ],
            "pencil",
            paint,
            ink,
        );
        pen.polygon(
            g,
            [
                [40, 54],
                [60, 34],
                [76, 50],
                [56, 70],
            ],
            "ruler",
            c.pen.fill("card"),
            { strokeWidth: w * 0.8 },
        );
        pen.linear(
            g,
            [
                [44, 56],
                [50, 62],
                [52, 48],
                [58, 54],
                [60, 40],
                [66, 46],
            ],
            "ruler",
            { strokeWidth: w * 0.7, stroke: c.t["ink-soft"] },
        );
        pen.path(g, "M28 66L44 82C36 90 22 94 14 90C10 82 20 72 28 66Z", "pencil", paint, ink);
    } else if (kind === "marker") {
        pen.polygon(
            g,
            [
                [34, 62],
                [74, 22],
                [92, 40],
                [52, 80],
            ],
            "pencil",
            c.pen.fill("card"),
            ink,
        );
        pen.polygon(
            g,
            [
                [74, 22],
                [92, 40],
                [98, 34],
                [80, 16],
            ],
            "ruler",
            paint,
            ink,
        );
        pen.polygon(
            g,
            [
                [34, 62],
                [52, 80],
                [40, 88],
                [26, 74],
            ],
            "pencil",
            c.pen.fill("ink-soft"),
            ink,
        );
        pen.path(g, "M26 74L40 88C32 96 18 98 12 92C8 86 16 80 26 74Z", "pencil", paint, ink);
    } else if (kind === "brush") {
        pen.polygon(
            g,
            [
                [44, 58],
                [88, 14],
                [94, 20],
                [50, 64],
            ],
            "pencil",
            wood,
            ink,
        );
        pen.polygon(
            g,
            [
                [34, 60],
                [44, 52],
                [56, 64],
                [46, 74],
            ],
            "ruler",
            { fill: c.paper ? c.t.card : "#C9D1DA", fillStyle: "solid" },
            ink,
        );
        pen.path(g, "M34 60L46 74C38 84 22 94 8 94C8 80 20 66 34 60Z", "pencil", paint, ink);
    } else if (kind === "bucket") {
        pen.path(g, "M22 34L78 34L70 88L30 88Z", "pencil", c.pen.fill("card"), ink);
        pen.path(g, "M24 44L76 44L70 88L30 88Z", "ruler", paint, { strokeWidth: 0 });
        pen.ellipse(g, 50, 34, 56, 14, "pencil", paint, ink);
        pen.arc(g, 50, 34, 58, 50, Math.PI, Math.PI * 2, "pencil", ink);
        pen.path(g, "M78 36C88 44 92 56 90 66C86 60 82 50 78 36Z", "pencil", paint, ink);
    } else if (kind === "stamp") {
        pen.ellipse(g, 50, 20, 30, 22, "pencil", wood, ink);
        pen.rect(g, 44, 26, 12, 24, "pencil", wood, ink);
        pen.rect(g, 20, 50, 60, 18, "pencil", wood, ink);
        pen.rect(g, 24, 68, 52, 8, "ruler", paint, ink);
        pen.linear(
            g,
            [
                [18, 90],
                [82, 90],
            ],
            "pencil",
            { strokeWidth: w * 0.8, stroke: c.t["ink-soft"] },
        );
    } else if (kind === "blender") {
        // a paper stump, rolled to a point, which is what an artist blends pastel and pencil with
        pen.polygon(
            g,
            [
                [34, 60],
                [74, 20],
                [88, 34],
                [48, 74],
            ],
            "pencil",
            c.pen.fill("card"),
            ink,
        );
        for (const t of [0.3, 0.55, 0.8])
            pen.line(g, 34 + 40 * t, 60 - 40 * t, 48 + 40 * t, 74 - 40 * t, "ruler", {
                strokeWidth: w * 0.6,
                stroke: c.t["ink-soft"],
            });
        pen.path(
            g,
            "M34 60L48 74C38 86 22 94 10 94C10 82 20 68 34 60Z",
            "pencil",
            { fill: c.paper ? c.t.card : "#C9CFD6", fillStyle: "solid" },
            ink,
        );
        pen.path(g, "M16 88C20 82 26 78 32 76", "pencil", paint, { strokeWidth: w * 2.2 });
    } else if (kind === "stencil") {
        pen.path(
            g,
            "M10 20L84 12L92 80L18 90Z",
            "pencil",
            { fill: c.paper ? c.t.card : "#EFE3C8", fillStyle: "solid" },
            ink,
        );
        pen.path(
            g,
            "M52 26L60 44L80 46L65 58L70 78L52 67L34 78L39 58L24 46L44 44Z",
            "pencil",
            paint,
            ink,
        );
    } else if (kind === "dropper") {
        pen.polygon(
            g,
            [
                [26, 66],
                [66, 26],
                [74, 34],
                [34, 74],
            ],
            "pencil",
            c.pen.fill("card"),
            ink,
        );
        pen.ellipse(g, 76, 24, 26, 22, "pencil", c.pen.fill("berry"), ink);
        pen.polygon(
            g,
            [
                [26, 66],
                [34, 74],
                [16, 88],
                [12, 84],
            ],
            "ruler",
            paint,
            ink,
        );
        pen.circle(g, 12, 94, 8, "ruler", paint, { strokeWidth: w * 0.8 });
    } else {
        pen.polygon(
            g,
            [
                [22, 62],
                [62, 22],
                [86, 46],
                [46, 86],
            ],
            "pencil",
            c.pen.fill("berry"),
            ink,
        );
        pen.polygon(
            g,
            [
                [42, 42],
                [62, 22],
                [86, 46],
                [66, 66],
            ],
            "pencil",
            c.pen.fill("sky"),
            ink,
        );
    }
}

/** Each tool as a screen reader hears it. */
const TOOL_WORDS: Record<string, string> = {
    pencil: "a pencil",
    crayon: "a wax crayon",
    marker: "a felt pen",
    brush: "a round brush",
    blender: "a paper blending stump",
    bucket: "a pot of paint to pour",
    stamp: "a wooden stamp",
    stencil: "a stencil card",
    dropper: "a dropper",
    eraser: "an eraser",
};

export const artTools = defineDrawing({
    id: "arttools",
    family: "art",
    title: "Drawing and painting tools",
    group: "Props",
    about: "The things a picture is made with: a pencil, a wax crayon in its paper wrapper, a felt pen, a round brush, a pot to pour paint from, a stamp and an eraser, each with its colour at the working end. Laid in a row, standing in a jar, or one on its own as the easel's button for it.",
    params: {
        tools: ["pencil", "crayon", "marker", "brush"],
        colours: ["blue", "red", "green", "yellow"],
        layout: "row",
        ring: -1,
    },
    settings: {
        tools: { kind: "words", of: TOOL_KINDS, most: 8 },
        colours: { kind: "words", most: 8 },
        layout: { kind: "one of", of: ["row", "jar", "one"] },
        ring: { kind: "whole", min: -1, max: 7 },
    },
    takes: [
        {
            label: "Four tools in a row",
            params: {
                tools: ["pencil", "crayon", "marker", "brush"],
                colours: ["blue", "red", "green", "yellow"],
                layout: "row",
                ring: -1,
            },
        },
        {
            label: "Standing in a jar",
            params: {
                tools: ["brush", "pencil", "marker", "crayon"],
                colours: ["sky", "yellow", "pink", "orange"],
                layout: "jar",
                ring: -1,
            },
        },
        {
            label: "The easel's buttons",
            params: {
                tools: ["bucket", "stamp", "eraser"],
                colours: ["blue", "red", "white"],
                layout: "row",
                ring: 0,
            },
        },
        {
            label: "Blender, stencil and dropper",
            params: {
                tools: ["blender", "stencil", "dropper"],
                colours: ["sky", "red", "green"],
                layout: "row",
                ring: -1,
            },
        },
    ],
    box: (p) =>
        p.layout === "one"
            ? { w: 3, h: 3 }
            : p.layout === "jar"
              ? { w: 9, h: 11 }
              : { w: Math.max(1, p.tools.length) * 4 + 1, h: 5 },
    draw: (c, p) => {
        const a: RawAnchors = {},
            hexAt = (i: number) => colourOf(p.colours[i] ?? "") ?? panColour("blue");
        const tools = p.tools.filter((t) => (TOOL_KINDS as readonly string[]).includes(t));
        if (p.layout === "one") {
            tool(c, tools[0] ?? "pencil", 2, 2, 3 * U - 4, hexAt(0));
            a.tool = [1.5 * U, 0, "up"];
            return a;
        }
        if (p.layout === "jar") {
            const { pen, g } = c;
            tools.forEach((t, i) => {
                const x = (1.6 + i * (5.6 / Math.max(1, tools.length))) * U;
                tool(
                    group(c, { turn: [["rotate", -30 + i * 14, x + 1.5 * U, 7 * U]] }),
                    t,
                    x,
                    0.5 * U,
                    4.6 * U,
                    hexAt(i),
                );
            });
            pen.path(
                g,
                `M${1 * U} ${5 * U}L${8 * U} ${5 * U}L${7.4 * U} ${10.6 * U}L${1.6 * U} ${10.6 * U}Z`,
                "pencil",
                c.paper ? null : { fill: "#E6F0F8CC", fillStyle: "solid" },
                { strokeWidth: 2.2 },
            );
            pen.line(g, 1.3 * U, 6 * U, 7.7 * U, 6 * U, "pencil", {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
            });
            a.jar = [4.5 * U, 5 * U, "up"];
            return a;
        }
        tools.forEach((t, i) => {
            const x = (0.5 + i * 4) * U;
            tool(c, t, x, 0.5 * U, 4 * U, hexAt(i));
            if (i === p.ring) loop(c, x + 2 * U, 2.5 * U, 4 * U, 4.6 * U);
            a[`tool(${i})`] = [x + 2 * U, 0.5 * U, "up"];
        });
        return a;
    },
    describe: (p) => {
        const tools = p.tools.filter((t) => (TOOL_KINDS as readonly string[]).includes(t));
        const names = tools.map((t) => TOOL_WORDS[t] ?? `a ${t}`);
        const first = names[0] ?? "a pencil";
        const list =
            names.length > 4
                ? `${names.length} drawing tools`
                : names.length > 1
                  ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
                  : first;
        const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
        if (p.layout === "one")
            return `${cap(first)} on its own, lying on a slant with its colour at the working end, as a button on the easel.`;
        if (p.layout === "jar")
            return `${cap(list)} standing in a glass jar, leaning apart, each with its colour at the working end.`;
        return `${cap(list)} laid in a row, each with its colour at the working end${p.ring >= 0 && p.ring < tools.length ? ", one ringed in pen" : ""}.`;
    },
});
