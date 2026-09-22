import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { PIGMENTS, paintFill, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { loop } from "../marks";
import { pigmentsIn, shine } from "./kit";

export const paintBox = defineDrawing({
    id: "paintbox",
    family: "art",
    title: "Paint box",
    group: "Props",
    about: "A tin of paints, a pan of each colour in rows. It is what the easel's paints are drawn with, and a question can ring the pan a child should reach for. On paper each pan is hatched by its colour and named.",
    params: {
        pans: [
            "yellow",
            "orange",
            "red",
            "pink",
            "blue",
            "sky",
            "green",
            "brown",
            "black",
            "white",
        ],
        per: 5,
        ring: -1,
        labels: false,
    },
    settings: {
        pans: { kind: "words", of: PIGMENTS, most: 10 },
        per: { kind: "whole", min: 1, max: 10 },
        ring: { kind: "whole", min: -1, max: 9 },
        labels: { kind: "flag" },
    },
    takes: [
        {
            label: "Ten pans",
            params: {
                pans: [
                    "yellow",
                    "orange",
                    "red",
                    "pink",
                    "blue",
                    "sky",
                    "green",
                    "brown",
                    "black",
                    "white",
                ],
                per: 5,
                ring: -1,
                labels: false,
            },
        },
        {
            label: "Three primaries and white, named",
            params: { pans: ["red", "yellow", "blue", "white"], per: 4, ring: 2, labels: true },
        },
    ],
    box: (p) => {
        const n = Math.max(1, pigmentsIn(p.pans).length),
            per = Math.max(1, Math.min(n, Math.round(p.per)));
        return { w: per * 3 + 2, h: Math.ceil(n / per) * (p.labels ? 4 : 3) + 2 };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            pans = pigmentsIn(p.pans),
            per = Math.max(1, Math.min(pans.length || 1, Math.round(p.per)));
        const rows = Math.ceil(pans.length / per),
            row = p.labels ? 4 : 3,
            a: RawAnchors = {};
        const W = (per * 3 + 2) * U,
            H = (rows * row + 2) * U;
        pen.path(
            g,
            roundedRect(4, 4, W - 8, H - 8, 16),
            "pencil",
            c.pen.fill("sky", "hachure", { hachureGap: 8 }),
            { strokeWidth: 2.4 },
        );
        pen.path(
            g,
            roundedRect(0.6 * U, 0.6 * U, W - 1.2 * U, H - 1.2 * U, 11),
            "ruler",
            c.pen.fill("card"),
            { strokeWidth: 1.4 },
        );
        pans.forEach((pig, i) => {
            const x = (1 + (i % per) * 3) * U,
                y = (1 + Math.floor(i / per) * row) * U,
                hex = panColour(pig);
            pen.path(
                g,
                roundedRect(x + 4, y + 4, 3 * U - 8, 3 * U - 8, 7),
                "ruler",
                c.pen.fill("card"),
                { strokeWidth: 1.6 },
            );
            pen.path(
                g,
                roundedRect(x + 9, y + 9, 3 * U - 18, 3 * U - 18, 5),
                "ruler",
                paintFill(c, hex),
                { strokeWidth: 0.8, stroke: c.t["ink-soft"] },
            );
            shine(c, x + 1.5 * U, y + 1.5 * U, 0.85 * U);
            if (p.labels) say(c, x + 1.5 * U, y + 3.7 * U, pig, 12);
            if (i === p.ring) loop(c, x + 1.5 * U, y + 1.5 * U, 3 * U + 6, 3 * U + 6);
            a[`pan(${i})`] = [x + 1.5 * U, y + 1.5 * U, "up"];
        });
        return a;
    },
    describe: (p) => {
        const n = pigmentsIn(p.pans).length;
        return `A tin of paints open flat, with ${n} square pans of paint set in rows inside its lid${p.labels ? ", each named underneath" : ""}${p.ring >= 0 && p.ring < n ? ", one ringed in pen" : ""}.`;
    },
});
