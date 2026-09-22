import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { patch, say, wide } from "../lettering";
import { writeLine, wrapTo } from "./lines";

type Pt = [number, number];

const ASK_W = 10;

const askCols = (n: number) => (n === 4 ? 2 : Math.max(1, Math.min(3, n)));

export const expander = defineDrawing({
    id: "expander",
    family: "writing",
    title: "Growing a sentence",
    group: "Structures",
    about: "A short sentence in the middle and the questions that grow it round it: when, where, why, how, who. Under each question a line to write the answer on, or the answer written in. It is the sentence expansion routine drawn, so a child sees that a longer sentence is a short one with its questions answered.",
    params: { kernel: "The whale sang.", asks: ["when", "where", "why"], answers: ["", "", ""] },
    settings: {
        kernel: { kind: "text", most: 40 },
        asks: { kind: "words", most: 5 },
        answers: { kind: "words", most: 5 },
    },
    takes: [
        {
            label: "Three questions",
            params: {
                kernel: "The whale sang.",
                asks: ["when", "where", "why"],
                answers: ["", "", ""],
            },
        },
        {
            label: "Four, one answered",
            params: {
                kernel: "The fox ran.",
                asks: ["who", "when", "where", "why"],
                answers: ["", "at night", "", ""],
            },
        },
    ],
    box: (p) => ({
        w: askCols(p.asks.length) * (ASK_W + 1) + 1,
        h: 5 + Math.ceil(p.asks.length / askCols(p.asks.length)) * 5,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            cols = askCols(p.asks.length),
            W = (cols * (ASK_W + 1) + 1) * U;
        const kw = Math.min(W - U, wide(p.kernel, 22) + 2 * U);
        pen.path(
            g,
            roundedRect(W / 2 - kw / 2, 0.4 * U, kw, 2.6 * U, 10),
            "ruler",
            pen.fill("glow"),
            { strokeWidth: 2.2 },
        );
        patch(c, W / 2, 1.7 * U, kw - 16, 30);
        say(c, W / 2, 2.2 * U, p.kernel, 22);
        a.kernel = [W / 2, 0.4 * U, "up"];
        const at = (i: number): Pt => {
            const row = Math.floor(i / cols),
                inRow = Math.min(cols, p.asks.length - row * cols);
            const shift = ((cols - inRow) * (ASK_W + 1)) / 2;
            return [(0.5 + shift + (i % cols) * (ASK_W + 1)) * U, (4.6 + row * 5) * U];
        };
        p.asks.forEach((_, i) => {
            const [x, y] = at(i);
            pen.line(g, W / 2, 3 * U, x + (ASK_W / 2) * U, y, "pencil", {
                strokeWidth: 1.2,
                strokeLineDash: [4, 5],
                stroke: c.t["ink-soft"],
            });
        });
        p.asks.forEach((q, i) => {
            const [x, y] = at(i);
            pen.path(
                g,
                roundedRect(x + 3, y, (ASK_W - 0.3) * U, 4 * U, 8),
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.8 },
            );
            pen.path(
                g,
                roundedRect(x + (ASK_W / 2 - 2) * U, y - 0.5 * U, 4 * U, 1.3 * U, 6),
                "ruler",
                pen.fill("sky"),
                { strokeWidth: 1.4 },
            );
            patch(c, x + (ASK_W / 2) * U, y + 0.15 * U, 3.6 * U, 18);
            say(c, x + (ASK_W / 2) * U, y + 0.55 * U, `${q}?`, 16);
            const ans = p.answers[i] ?? "";
            if (ans)
                wrapTo(ans, (ASK_W - 1) * U, 15)
                    .slice(0, 2)
                    .forEach((l, k) => say(c, x + (ASK_W / 2) * U, y + (2.3 + k * 1.2) * U, l, 15));
            else writeLine(c, x + 0.6 * U, y + 3.2 * U, (ASK_W - 1.4) * U);
            a[`ask(${i})`] = [x + (ASK_W / 2) * U, y, "up"];
        });
        return a;
    },
    describe: () =>
        "A short sentence in a box in the middle with question words round it, each with a ruled line under it for the answer that grows the sentence.",
});
