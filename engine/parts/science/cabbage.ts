import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch, penned, soft } from "../lettering";
import { glassPath, liquid, gleam, lettered, paint } from "./apparatus";
import { INDICATOR, bandOf, LIQUIDS } from "./substances";

/** The cup a liquid is tested in, with its colour after the juice goes in, or the liquid alone with a question mark. */
function testCup<G>(
    c: Ctx<G>,
    x: number,
    base: number,
    liq: string,
    show: boolean,
    colours: boolean,
): void {
    const { pen, g } = c,
        w = 2.8 * U,
        h = 3.4 * U,
        lx = x - w / 2,
        rx = x + w / 2,
        top = base - h,
        level = top + 1.1 * U;
    const facts = LIQUIDS[liq],
        band = facts ? bandOf(facts.ph) : null;
    if (show && band) liquid(c, lx, rx, level, base, paint(c, band.paint), 10);
    else
        liquid(
            c,
            lx,
            rx,
            level,
            base,
            facts && facts.look !== "card"
                ? pen.fill(facts.look, "hachure", { hachureGap: 6 })
                : pen.fill("card"),
            10,
        );
    pen.path(g, glassPath(lx, rx, top, base, 10), "ruler", null, { strokeWidth: 2.2 });
    pen.line(g, lx - 3, top, rx + 3, top, "ruler", { strokeWidth: 1.4 });
    gleam(c, lx + 5, level + 4, base - 8, 2.4);
    if (!show) penned(c, x, level + 1.4 * U, "?", 26);
    if (show && band && (c.paper || colours)) {
        patch(c, x, base - 0.75 * U - 4, 2.4 * U, 16);
        cap(c, x, base - 0.75 * U, band.colour, 10, "middle", c.t.ink);
    }
}

export const cabbage = defineDrawing({
    id: "cabbage",
    family: "science",
    title: "Red cabbage indicator",
    group: "Structures",
    about: "Cups of kitchen liquids with a little red cabbage juice stirred into each, and the colour chart the colours are read against. The juice turns red in lemon juice and vinegar, purple in milk, blue in water and baking soda and green in washing soda, so red says acid and green says alkali, and the chart shows why blue can only say \"not an acid\". Every colour comes from the paint box and each liquid's pH is one table, which the checker marks from. On paper, where colour cannot be seen, each cup and each band of the chart carries its colour's name; on screen `colours` does the same, and `names` writes each liquid's name under its cup. With `show` at 0 the cups wait under a question mark, for a prediction.",
    params: {
        liquids: ["lemon", "water", "bakingsoda"],
        chart: 1,
        show: 1,
        names: 1,
        colours: 0,
        letters: 1,
    },
    settings: {
        liquids: { kind: "words", most: 6, of: Object.keys(LIQUIDS) },
        chart: { kind: "whole", min: 0, max: 1 },
        show: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
        colours: { kind: "whole", min: 0, max: 1 },
        letters: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Acid, neutral, alkali",
            params: {
                liquids: ["lemon", "water", "bakingsoda"],
                chart: 1,
                show: 1,
                names: 1,
                colours: 1,
                letters: 1,
            },
        },
        {
            label: "Before the juice goes in",
            params: {
                liquids: ["vinegar", "milk", "washingsoda"],
                chart: 1,
                show: 0,
                names: 1,
                colours: 0,
                letters: 1,
            },
        },
        {
            label: "Four cups, no names",
            params: {
                liquids: ["milk", "washingsoda", "vinegar", "water"],
                chart: 1,
                show: 1,
                names: 0,
                colours: 0,
                letters: 1,
            },
        },
    ],
    box: (p) => ({
        w: Math.max(Math.max(1, Math.min(6, p.liquids.length)) * 4 + 1, p.chart > 0 ? 17 : 0),
        h: 6 + (p.names > 0 ? 1 : 0) + (p.chart > 0 ? 5 : 0),
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = c.t,
            n = Math.max(1, Math.min(6, p.liquids.length));
        const w = Math.max(n * 4 + 1, p.chart > 0 ? 17 : 0) * U,
            x0 = (w - (n * 4 + 1) * U) / 2;
        p.liquids.slice(0, n).forEach((liq, i) => {
            const x = x0 + (2.5 + i * 4) * U;
            testCup(c, x, 4.2 * U, liq, p.show > 0, p.colours > 0);
            if (p.letters > 0) lettered(c, x, 5.4 * U, i);
            if (p.names > 0)
                soft(c, x, (p.letters > 0 ? 6.5 : 5.4) * U, LIQUIDS[liq]?.name ?? liq, 12);
            a[`cup(${i})`] = [x, 0.6 * U, "up"];
        });
        if (p.chart > 0) {
            const y0 = (p.names > 0 ? 7.4 : 6.4) * U,
                cell = 1.1 * U,
                left = (w - 14 * cell) / 2;
            for (let ph = 1; ph <= 14; ph++) {
                const band = bandOf(ph),
                    x = left + (ph - 1) * cell;
                pen.rect(g, x, y0 + 0.9 * U, cell, 1.3 * U, "ruler", paint(c, band.paint), {
                    strokeWidth: 1.2,
                });
                if (ph === 1 || ph === 7 || ph === 14) num(c, x + cell / 2, y0 + 3 * U, ph, 12);
            }
            for (const band of INDICATOR) {
                const mid = left + ((band.from + band.to) / 2 - 0.5) * cell;
                cap(c, mid, y0 + 0.65 * U, band.colour, 9, "middle", t.ink);
            }
            const kinds: [string, number, number][] = [
                ["acid", 1, 6],
                ["neutral", 7, 7],
                ["alkali", 8, 14],
            ];
            for (const [word, from, to] of kinds) {
                const xa = left + (from - 1) * cell + 3,
                    xb = left + to * cell - 3;
                pen.line(g, xa, y0 + 3.4 * U, xb, y0 + 3.4 * U, "pencil", {
                    strokeWidth: 1.2,
                    stroke: t["ink-soft"],
                });
                for (const xe of [xa, xb])
                    pen.line(g, xe, y0 + 3.2 * U, xe, y0 + 3.6 * U, "pencil", {
                        strokeWidth: 1.2,
                        stroke: t["ink-soft"],
                    });
                soft(c, (xa + xb) / 2, y0 + 4.25 * U, word, 12);
            }
            a.chart = [w / 2, y0 + 0.9 * U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `Lettered cups of kitchen liquids standing in a row${p.show > 0 ? ", each coloured by a little red cabbage juice" : ", a question mark drawn on each cup"}${p.chart > 0 ? ", a colour chart from 1 to 14 underneath" : ""}${p.names > 0 ? ", each named" : ""}.`,
    reads: true,
});
