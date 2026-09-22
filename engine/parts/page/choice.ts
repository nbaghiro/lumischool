import { roundedRect } from "../../ink/pen";
import { letter, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { loop } from "../marks";
import { drawProp } from "../props";

/** One option as the child sees it: a word, a number, or a picture. */
export interface Card {
    kind: "text" | "num" | "prop";
    label: string;
    prop?: string;
}

export const cardW = (c: Card): number =>
    c.kind === "prop" ? 3 : Math.max(3, Math.ceil(c.label.length * 0.62) + 2);

function card<G>(c: Ctx<G>, o: Card, x: number, y: number, w: number): void {
    const h = 3 * U;
    c.pen.path(c.g, roundedRect(x + 2, y + 2, w * U - 4, h - 4, 8), "pencil", c.pen.fill("card"), {
        strokeWidth: 1.8,
    });
    if (o.kind === "prop") {
        drawProp(c, o.prop ?? "counter", x + (w * U) / 2, y + h / 2, 34);
        return;
    }
    const size = Math.min(24, Math.max(13, (w * U - 16) / (o.label.length * 0.56)));
    letter(c, {
        x: x + (w * U) / 2,
        y: y + h / 2 + size * 0.35,
        s: o.label,
        face: "read",
        weight: 700,
        size,
        fill: c.t.ink,
        anchor: "middle",
    });
}

export const choiceCards = defineDrawing({
    id: "choice",
    family: "page",
    title: "Choice",
    group: "Inputs",
    about: "Cards to pick one of: a word, a number or a picture. On the answer key the right card is looped.",
    params: {
        options: [
            { kind: "text", label: "Yes" },
            { kind: "text", label: "No" },
            { kind: "prop", label: "star", prop: "star" },
        ] as Card[],
        stack: "row",
        chosen: -1,
    },
    settings: {
        options: { kind: "fixed" },
        stack: { kind: "one of", of: ["row", "column"] },
        chosen: { kind: "whole", min: -1, max: 8 },
    },
    takes: [
        {
            label: "Words",
            params: {
                options: [
                    { kind: "text", label: "Yes" },
                    { kind: "text", label: "No" },
                ],
                stack: "row",
                chosen: -1,
            },
        },
        {
            label: "Numbers, one looped",
            params: {
                options: [
                    { kind: "num", label: "6" },
                    { kind: "num", label: "8" },
                    { kind: "num", label: "12" },
                ],
                stack: "row",
                chosen: 1,
            },
        },
        {
            label: "Pictures",
            params: {
                options: [
                    { kind: "prop", label: "star", prop: "star" },
                    { kind: "prop", label: "apple", prop: "apple" },
                    { kind: "prop", label: "hexagon", prop: "hexagon" },
                ],
                stack: "row",
                chosen: -1,
            },
        },
        {
            label: "Stacked",
            params: {
                options: [
                    { kind: "text", label: "Apples" },
                    { kind: "text", label: "Pears" },
                    { kind: "text", label: "Plums" },
                ],
                stack: "column",
                chosen: -1,
            },
        },
    ],
    box: (p) => {
        const w = Math.max(3, ...p.options.map(cardW));
        return p.stack === "column"
            ? { w, h: p.options.length * 4 - 1 }
            : { w: p.options.length * (w + 1) - 1, h: 3 };
    },
    draw: (c, p) => {
        const w = Math.max(3, ...p.options.map(cardW)),
            a: RawAnchors = {};
        p.options.forEach((o, i) => {
            const x = p.stack === "column" ? 0 : i * (w + 1) * U,
                y = p.stack === "column" ? i * 4 * U : 0;
            card(c, o, x, y, w);
            a[`option(${i})`] = [x + (w * U) / 2, y, "up"];
            if (i === p.chosen) loop(c, x + (w * U) / 2, y + 1.5 * U, w * U + 6, 3 * U + 2);
        });
        return a;
    },
    describe: (p) => {
        const kinds = new Set(p.options.map((o) => o.kind));
        const each =
            kinds.size > 1
                ? "with a word, a number or a small picture on each"
                : kinds.has("prop")
                  ? "each with a small picture drawn on it"
                  : kinds.has("num")
                    ? "each with a number written on it"
                    : "each with a word written on it";
        return `${p.stack === "column" ? "A column of cards stacked" : "A row of cards laid out"} to pick one from, ${each}${p.chosen >= 0 && p.chosen < p.options.length ? ", one of them looped in pen" : ""}.`;
    },
});
