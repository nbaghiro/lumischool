import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, penned, say, soft } from "../lettering";
import { cellsWide, cellPlates, switchUp, bulbGlass, bulbRays, croc } from "./wiring";

/** What is in a series loop, read off a drawing's settings, as the checker in src/physics/prove.ts reads it too. */
export interface Loop {
    cells: number;
    bulbs: number;
    buzzer: boolean;
    motor: boolean;
    closed: boolean;
    loose: boolean;
}

const whole = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, Math.round(v)));

export const loopOf = (p: {
    cells: number;
    bulbs: number;
    buzzer: number;
    motor: number;
    closed: number;
    loose: number;
}): Loop => ({
    cells: whole(p.cells, 0, 4),
    bulbs: whole(p.bulbs, 0, 3),
    buzzer: p.buzzer > 0,
    motor: p.motor > 0,
    closed: p.closed > 0,
    loose: p.loose > 0,
});

/** A loop works when there is a cell in it, the switch is closed and every wire is clipped on. */
export const loopWorks = (l: Loop): boolean => l.cells > 0 && l.closed && !l.loose;

/**
 * How bright each bulb is, with one cell and one bulb as 1: the cells' push shared among the parts
 * it has to push through. Identical bulbs in one series loop share it equally, so this is exact for
 * cells and bulbs; a buzzer or a motor is counted as one more part, which is only roughly true, and
 * the checker will not compare brightness in a loop that has one.
 */
export const loopGlow = (l: Loop): number =>
    loopWorks(l) ? l.cells / Math.max(1, l.bulbs + (l.buzzer ? 1 : 0) + (l.motor ? 1 : 0)) : 0;

/** How a bulb at a brightness is drawn: more rays and longer ones for brighter, a hatched glass for dim. */
const glowLook = (level: number): { n: number; to: number; dim: boolean } =>
    level >= 3
        ? { n: 9, to: 3.2, dim: false }
        : level >= 2
          ? { n: 8, to: 3, dim: false }
          : level > 1
            ? { n: 7, to: 2.7, dim: false }
            : level === 1
              ? { n: 6, to: 2.4, dim: false }
              : level >= 0.5
                ? { n: 4, to: 2.1, dim: true }
                : { n: 2, to: 2, dim: true };

/** How wide the loop is, in squares: room for every part on the top run, and never narrower than the circuit's. */
function seriesInner(l: Loop, show: boolean): number {
    const top = l.bulbs + (l.buzzer ? 1 : 0);
    return Math.max(12, Math.ceil(partStep(l, show) * top + 4));
}

/**
 * How far apart the parts on the top run stand, in squares. Bulbs brighter than one cell's worth
 * throw longer rays and stand further apart so the rays stay clear of each other; a loop drawn for
 * a prediction keeps the narrow spacing, so its width cannot give the answer away.
 */
const partStep = (l: Loop, show: boolean): number =>
    show && loopGlow(l) > 1 && l.bulbs > 1 ? 4.6 : 3.6;

export const series = defineDrawing({
    id: "series",
    family: "science",
    title: "Series circuit",
    group: "Structures",
    about: "One loop of wire with cells, bulbs, a buzzer, a motor and a switch in it, one after another. Whether it works is worked out from what is in the loop: there has to be a cell, the switch has to be closed and no wire can be loose. How bright each bulb is follows the cells shared among the parts, so a second cell makes a bulb brighter and a second bulb makes both dimmer, and a brighter bulb is drawn with more rays and longer ones. With `show` at 0 the bulbs wait under a question mark, for a prediction.",
    params: { cells: 1, bulbs: 1, buzzer: 0, motor: 0, closed: 1, loose: 0, show: 1, tag: "" },
    settings: {
        cells: { kind: "whole", min: 0, max: 4 },
        bulbs: { kind: "whole", min: 0, max: 3 },
        buzzer: { kind: "whole", min: 0, max: 1 },
        motor: { kind: "whole", min: 0, max: 1 },
        closed: { kind: "whole", min: 0, max: 1 },
        loose: { kind: "whole", min: 0, max: 1 },
        show: { kind: "whole", min: 0, max: 1 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        {
            label: "One cell, one bulb",
            params: {
                cells: 1,
                bulbs: 1,
                buzzer: 0,
                motor: 0,
                closed: 1,
                loose: 0,
                show: 1,
                tag: "",
            },
        },
        {
            label: "Two cells, brighter",
            params: {
                cells: 2,
                bulbs: 1,
                buzzer: 0,
                motor: 0,
                closed: 1,
                loose: 0,
                show: 1,
                tag: "",
            },
        },
        {
            label: "Two bulbs, dimmer",
            params: {
                cells: 1,
                bulbs: 2,
                buzzer: 0,
                motor: 0,
                closed: 1,
                loose: 0,
                show: 1,
                tag: "",
            },
        },
        {
            label: "A loose wire",
            params: {
                cells: 2,
                bulbs: 1,
                buzzer: 0,
                motor: 0,
                closed: 1,
                loose: 1,
                show: 1,
                tag: "",
            },
        },
        {
            label: "A motor and a buzzer",
            params: {
                cells: 2,
                bulbs: 1,
                buzzer: 1,
                motor: 1,
                closed: 1,
                loose: 0,
                show: 1,
                tag: "",
            },
        },
        {
            label: "Will they light?",
            params: {
                cells: 2,
                bulbs: 2,
                buzzer: 0,
                motor: 0,
                closed: 1,
                loose: 0,
                show: 0,
                tag: "A",
            },
        },
    ],
    box: (p) => {
        const l = loopOf(p);
        return { w: (l.motor ? 3.5 : 1.5) + seriesInner(l, p.show > 0) + 2.5, h: 13 };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            l = loopOf(p),
            show = p.show > 0,
            works = loopWorks(l),
            look = glowLook(loopGlow(l));
        const L = (l.motor ? 3.5 : 1.5) * U,
            R = L + seriesInner(l, show) * U,
            T = 3.4 * U,
            B = 10 * U,
            mid = (L + R) / 2,
            my = (T + B) / 2;
        if (p.tag) num(c, 0.9 * U, 1.4 * U, p.tag, 22);
        const wire = (x1: number, y1: number, x2: number, y2: number) =>
            pen.line(g, x1, y1, x2, y2, "ruler", { strokeWidth: 2.2 });
        // the top run: the bulbs, then the buzzer, each breaking the wire where it sits
        const parts = [
            ...Array.from({ length: l.bulbs }, () => "bulb"),
            ...(l.buzzer ? ["buzzer"] : []),
        ];
        const xs = parts.map((_, i) => mid + (i - (parts.length - 1) / 2) * partStep(l, show) * U);
        const half = (k: string) => (k === "bulb" ? 1.2 * U : 0.9 * U);
        let from = L;
        parts.forEach((k, i) => {
            wire(from, T, (xs[i] ?? 0) - half(k), T);
            from = (xs[i] ?? 0) + half(k);
        });
        wire(from, T, R, T);
        parts.forEach((k, i) => {
            const x = xs[i] ?? 0;
            if (k === "bulb") {
                const lit = show && works;
                // a dim bulb is a thinner glow: sparser hatching on screen and sparser dots on paper
                bulbGlass(
                    c,
                    x,
                    T,
                    pen.fill(lit ? "glow" : "card", lit && look.dim ? "hachure" : "solid", {
                        hachureGap: lit && look.dim ? 8 : 4.5,
                    }),
                );
                if (lit)
                    bulbRays(
                        c,
                        x,
                        T,
                        look.n,
                        1.7,
                        look.to,
                        parts.length > 1 ? (look.to > 2.4 ? 0.85 : 0.75) : 1.05,
                    );
                if (!show) penned(c, x, T - 1.7 * U, "?", 24);
                a[`bulb(${i})`] = [x, T - 2.6 * U, "up"];
                return;
            }
            pen.circle(g, x, T, 1.8 * U, "ruler", pen.fill("card"), { strokeWidth: 2 });
            say(c, x, T + 6, "♪", 18);
            if (show && works)
                for (const r of [1.5, 2.1])
                    pen.arc(
                        g,
                        x,
                        T,
                        r * 2 * U,
                        r * 2 * U,
                        -Math.PI * 0.78,
                        -Math.PI * 0.22,
                        "pencil",
                        { strokeWidth: 1.5 },
                    );
            if (!show) penned(c, x, T - 1.5 * U, "?", 22);
            a.buzzer = [x, T - 1.2 * U, "up"];
        });
        // the left run, with the motor on it and its fan outside the loop
        if (l.motor) {
            wire(L, T, L, my - 1.1 * U);
            wire(L, my + 1.1 * U, L, B);
            pen.circle(g, L, my, 2.2 * U, "ruler", pen.fill("mint"), { strokeWidth: 2 });
            patch(c, L, my, 18, 18);
            num(c, L, my + 6, "M", 16);
            pen.line(g, L - 1.1 * U, my, L - 2 * U, my, "ruler", { strokeWidth: 2.4 });
            pen.ellipse(g, L - 2.15 * U, my, 0.55 * U, 2.8 * U, "ruler", pen.fill("tang"), {
                strokeWidth: 1.6,
            });
            if (show && works)
                pen.arrow(
                    g,
                    [L - 2.9 * U, my - 1.5 * U],
                    [L - 2.9 * U, my + 1.5 * U],
                    c.t.pen,
                    0.28,
                );
            a.motor = [L - 2.15 * U, my - 1.5 * U, "up"];
        } else wire(L, T, L, B);
        // the right run, with the switch
        const y0 = my - 0.9 * U,
            y1 = my + 0.9 * U;
        wire(R, T, R, y0);
        wire(R, y1, R, B);
        switchUp(c, R, y0, y1, l.closed);
        soft(c, R - 0.4 * U, my + 6, l.closed ? "closed" : "open", 13, "end");
        a.switch = [R, my, "right"];
        // the bottom run, with the cells; a loose wire ends in a clip lifted off the first cell
        const total = l.cells ? cellsWide(l.cells) : 0,
            x0 = mid - total / 2;
        const into = l.cells ? x0 - 4 : mid;
        if (l.loose) {
            // the clip is lifted well clear of the cell, so the break reads at a glance and in print
            const end = into - 2.8 * U;
            wire(L, B, end, B);
            pen.curve(
                g,
                [
                    [end, B],
                    [end + 0.45 * U, B - 0.12 * U],
                    [end + 0.72 * U, B - 0.92 * U],
                ],
                "ruler",
                { strokeWidth: 2.2 },
            );
            croc(c, end + 1.5 * U, B - 1.9 * U, 1, -0.9);
            wire(into - 0.9 * U, B, into, B);
            pen.circle(
                g,
                into - 0.9 * U,
                B,
                6,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.8 },
            );
            a.loose = [end + 1.2 * U, B - 2.4 * U, "up"];
        } else wire(L, B, into, B);
        if (l.cells) {
            cellPlates(c, x0, B, l.cells);
            wire(x0 + total + 4, B, R, B);
        } else wire(mid, B, R, B);
        soft(
            c,
            mid,
            B + 2.1 * U,
            l.cells === 0 ? "no cell" : l.cells === 1 ? "1 cell" : `${l.cells} cells`,
            14,
        );
        a.cell = [mid, B + 1.2 * U, "down"];
        return a;
    },
    describe: (p) =>
        `One loop of wire with cells, bulbs${p.buzzer > 0 ? ", a buzzer" : ""}${p.motor > 0 ? ", a motor" : ""} and a switch in it one after another, the wires drawn from part to part.`,
    reads: true,
});
