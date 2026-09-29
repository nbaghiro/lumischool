import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, say, soft } from "../lettering";
import { paint } from "./apparatus";
import { LIQUIDS } from "./substances";

const CELL = 1.6 * U;
const LEFT = 1 * U;
const STRIP = 3.9 * U;

/**
 * Universal indicator's colours from pH 0 to 14, as paint-box mixes: red through green to purple. They
 * are the indicator's own colours, which the style guide allows as paint; in ink the numbers carry it.
 */
const UNIVERSAL = [
    "red",
    "red",
    "red",
    "red+orange",
    "orange",
    "orange+yellow",
    "yellow",
    "green",
    "green+sky",
    "sky+blue",
    "blue",
    "blue+pink",
    "blue+red",
    "blue+red",
    "blue+red",
];

const xOf = (ph: number): number => LEFT + (Math.max(0, Math.min(14, ph)) + 0.5) * CELL;

/** Which of two heights each pointer sits at, so pointers at nearly the same pH never overlap. */
function tiers(phs: number[]): number[] {
    const out: number[] = [];
    phs.forEach((ph, i) => {
        const clash = phs.slice(0, i).some((q, j) => out[j] === 0 && Math.abs(q - ph) < 0.9);
        out.push(clash ? 1 : 0);
    });
    return out;
}

export const phscale = defineDrawing({
    id: "phscale",
    family: "science",
    title: "The pH scale",
    group: "Structures",
    about: "The pH scale from 0 to 14 in universal indicator's colours, red for a strong acid through green at 7 to purple for a strong alkali, with lettered pointers above it at the pH of each liquid. Every pH comes from the table of liquids the red cabbage cups use, so the scale and the cups can never disagree, and a checker marks from the same table. The further a pointer sits from 7, the stronger the acid or the alkali; `names` writes a key of the liquids underneath.",
    params: { liquids: ["lemon", "water", "washingsoda"], letters: 1, names: 1 },
    settings: {
        liquids: { kind: "words", most: 6, of: Object.keys(LIQUIDS) },
        letters: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Acid, neutral, alkali",
            params: { liquids: ["lemon", "water", "washingsoda"], letters: 1, names: 1 },
        },
        {
            label: "Five liquids from the kitchen and the sea",
            params: {
                liquids: ["vinegar", "rain", "milk", "seawater", "magnesia"],
                letters: 1,
                names: 1,
            },
        },
        {
            label: "No key",
            params: { liquids: ["orange", "bakingsoda", "limewater"], letters: 1, names: 0 },
        },
    ],
    box: (p) => ({
        w: 26,
        h:
            p.names > 0
                ? Math.ceil(9.2 + (Math.ceil(Math.min(6, p.liquids.length) / 2) - 1) * 1.4)
                : 8,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            t = c.t,
            a: RawAnchors = {},
            list = p.liquids.slice(0, 6),
            phs = list.map((k) => LIQUIDS[k]?.ph ?? 7),
            tier = tiers(phs);
        UNIVERSAL.forEach((recipe, ph) => {
            const x = LEFT + ph * CELL;
            pen.rect(g, x, STRIP, CELL, 1.5 * U, "ruler", paint(c, recipe), { strokeWidth: 1.2 });
            // in ink the fifteen hatches cannot be told apart, so the number sits on a patch filling the cell
            patch(c, x + CELL / 2, STRIP + 0.75 * U + 1, CELL - 6, 20);
            num(c, x + CELL / 2, STRIP + 0.75 * U + 5.5, ph, 13);
            a[`ph(${ph})`] = [x + CELL / 2, STRIP, "up"];
        });
        const below = STRIP + 1.5 * U;
        const spans: [string, number, number][] = [
            ["acid: stronger to the left", 0, 7],
            ["alkali: stronger to the right", 8, 15],
        ];
        for (const [word, from, to] of spans) {
            const xa = LEFT + from * CELL + 3,
                xb = LEFT + to * CELL - 3,
                y = below + 0.5 * U;
            pen.line(g, xa, y, xb, y, "pencil", { strokeWidth: 1.2, stroke: t["ink-soft"] });
            for (const xe of [xa, xb])
                pen.line(g, xe, y - 0.2 * U, xe, y + 0.2 * U, "pencil", {
                    strokeWidth: 1.2,
                    stroke: t["ink-soft"],
                });
            soft(c, (xa + xb) / 2, y + 0.95 * U, word, 12);
        }
        soft(c, xOf(7), below + 1.75 * U, "neutral", 12);
        phs.forEach((ph, i) => {
            const x = xOf(ph),
                top = (tier[i] ?? 0) === 1 ? 0.2 * U : 1.5 * U;
            pen.line(g, x, top + 1.1 * U, x, STRIP - 3, "ruler", { strokeWidth: 1.6 });
            pen.line(g, x, STRIP - 3, x - 5, STRIP - 11, "ruler", { strokeWidth: 1.6 });
            pen.line(g, x, STRIP - 3, x + 5, STRIP - 11, "ruler", { strokeWidth: 1.6 });
            if (p.letters > 0) {
                patch(c, x, top + 0.55 * U - 5, 20, 18);
                say(c, x, top + 0.55 * U + 1, "ABCDEF"[i] ?? "?", 16);
            }
            a[`liquid(${i})`] = [x, top, "up"];
        });
        if (p.names > 0) {
            const y0 = below + 3.2 * U;
            list.forEach((k, i) => {
                const x = LEFT + (i % 2 ? 12.5 : 0.3) * U,
                    y = y0 + Math.floor(i / 2) * 1.4 * U;
                if (p.letters > 0) say(c, x, y, "ABCDEF"[i] ?? "?", 14, "start");
                soft(c, x + (p.letters > 0 ? 1.1 : 0) * U, y, LIQUIDS[k]?.name ?? k, 13, "start");
            });
        }
        a.scale = [xOf(7), STRIP + 1.5 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A pH scale from 0 to 14 in coloured bands, red for acid, green at 7, purple for alkali, with ${Math.min(6, p.liquids.length)} lettered pointers${p.names > 0 ? " and a key naming each liquid" : ""}.`,
    reads: true,
});
