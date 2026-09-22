import { type RawAnchors } from "../../ink/surface";
import { colourOf, paintFill, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { blob, shine, type Pt } from "./kit";

export const palette = defineDrawing({
    id: "palette",
    family: "art",
    title: "Painter's palette",
    group: "Props",
    about: "A wooden palette with a hole for the thumb and a blob of each paint round its edge, and a brush laid across it. The blobs can be pans or mixes.",
    params: { blobs: ["red", "yellow", "blue", "white", "yellow+blue"], brush: true },
    settings: {
        blobs: { kind: "words", most: 7 },
        brush: { kind: "flag" },
    },
    takes: [
        {
            label: "Primaries, white and a green",
            params: { blobs: ["red", "yellow", "blue", "white", "yellow+blue"], brush: true },
        },
        {
            label: "Warm colours, no brush",
            params: {
                blobs: ["red", "red+yellow", "yellow", "pink", "yellow 2+red"],
                brush: false,
            },
        },
    ],
    box: () => ({ w: 13, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const d =
            "M40 30C70 6 170 4 226 26C258 40 262 86 240 118C220 150 170 168 110 160C70 156 70 132 50 128C24 124 12 110 12 88C12 64 22 44 40 30Z";
        pen.path(
            g,
            d,
            "pencil",
            c.pen.fill("tang", "hachure", { hachureGap: 7, hachureAngle: 20 }),
            { strokeWidth: 2.4 },
        );
        pen.ellipse(g, 58, 104, 30, 24, "pencil", c.pen.fill("card"), { strokeWidth: 2 });
        const spots: Pt[] = [
            [62, 50],
            [104, 34],
            [150, 32],
            [196, 44],
            [226, 78],
            [214, 118],
            [170, 138],
        ];
        const a: RawAnchors = {};
        p.blobs.slice(0, spots.length).forEach((b, i) => {
            const hex = colourOf(b);
            if (!hex) return;
            const [x, y] = spots[i] ?? [0, 0];
            pen.path(g, blob(x, y, 15, 17 + i * 5, 0.85), "pencil", paintFill(c, hex), {
                strokeWidth: 1.2,
            });
            shine(c, x, y, 13);
            a[`blob(${i})`] = [x, y, "up"];
        });
        if (p.brush) {
            pen.polygon(
                g,
                [
                    [94, 150],
                    [230, 70],
                    [236, 80],
                    [100, 158],
                ],
                "pencil",
                c.pen.fill("tang"),
                { strokeWidth: 1.6 },
            );
            pen.polygon(
                g,
                [
                    [80, 158],
                    [96, 148],
                    [102, 160],
                    [86, 168],
                ],
                "ruler",
                c.pen.fill("card"),
                { strokeWidth: 1.4 },
            );
            pen.path(
                g,
                "M80 158C70 166 62 172 56 176C64 176 76 172 86 168Z",
                "pencil",
                paintFill(c, colourOf(p.blobs[0] ?? "red") ?? panColour("red")),
                { strokeWidth: 1.4 },
            );
            a.brush = [236, 76, "up"];
        }
        return a;
    },
    describe: (p) => {
        const n = p.blobs.slice(0, 7).filter((b) => colourOf(b) !== null).length;
        return `A wooden painter's palette with a thumb hole and ${n} blobs of wet paint round its edge${p.brush ? ", and a brush with a coloured tip laid across it" : ", and nothing laid across it"}.`;
    },
});
