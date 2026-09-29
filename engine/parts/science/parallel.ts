import { group, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { penned, say, soft } from "../lettering";
import { bulbGlass, bulbRays, cellPlates, cellsWide, switchUp } from "./wiring";

const whole = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, Math.round(v)));

/** Which branches are closed, one to a branch, a branch with no setting being closed. */
const closedOf = (branches: number, closed: readonly number[]): boolean[] =>
    Array.from({ length: whole(branches, 2, 3) }, (_, i) => (closed[i] ?? 1) > 0);

/**
 * How bright each branch's bulb is, with one bulb on one cell as 1. Each branch is joined straight
 * across the cells, so a closed branch's bulb gets the cells' whole push, as bright as one bulb alone
 * on them whatever the other branches do, and an open branch's bulb is out.
 */
export const branchGlow = (cells: number, branches: number, closed: readonly number[]): number[] =>
    closedOf(branches, closed).map((on) => (on ? whole(cells, 1, 4) : 0));

/**
 * How much current the cells give, with one bulb on one cell as 1: the branches' currents added, so
 * the cells run down faster with every branch closed.
 */
export const cellsGive = (cells: number, branches: number, closed: readonly number[]): number =>
    branchGlow(cells, branches, closed).reduce((s, v) => s + v, 0);

const L = 1.2 * U,
    R = 14.5 * U,
    BULB_X = 5 * U,
    SWITCH_X = 10.2 * U,
    FIRST = 3.6 * U,
    ROW = 5.4 * U;

const rowY = (i: number): number => FIRST + i * ROW;
const railY = (branches: number): number => rowY(whole(branches, 2, 3) - 1) + 3.4 * U;

/** A switch lying along a run of wire, hinged on the left, its blade lifting up when open. */
function switchAlong<G>(c: Ctx<G>, x: number, y: number, closed: boolean): void {
    const turned = group(c, { turn: [["rotate", -90, x, y]] });
    switchUp(turned, x, y - 0.9 * U, y + 0.9 * U, closed, true);
}

export const parallel = defineDrawing({
    id: "parallel",
    family: "science",
    title: "Parallel circuit",
    group: "Structures",
    about: "Cells with two or three branches (`branches`) joined across them side by side, a bulb and a switch in each. `closed` lists each branch's switch, 1 closed and 0 open. Each branch is joined straight across the cells, so a closed branch's bulb is as bright as one bulb alone on the cells (`cells`, one to four), whatever the other switches do, and opening one switch puts out only its own bulb; the cells give the branches' currents added together, so they run down faster the more branches are closed. With `symbols` 1 it is a circuit diagram in the standard symbols: long and short plates for a cell, a circle with a cross for a bulb, a switch as a blade between two contacts that rests across the far one when closed, and a dot where wires join; nothing glows. With `show` 0 the bulbs wait under question marks.",
    params: { cells: 2, branches: 2, closed: [1, 1], show: 1, symbols: 1 },
    settings: {
        cells: { kind: "whole", min: 1, max: 4 },
        branches: { kind: "whole", min: 2, max: 3 },
        closed: { kind: "numbers", min: 0, max: 1, most: 3 },
        show: { kind: "whole", min: 0, max: 1 },
        symbols: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Two branches in symbols",
            params: { cells: 2, branches: 2, closed: [1, 1], show: 1, symbols: 1 },
        },
        {
            label: "Three branches, one switch open",
            params: { cells: 1, branches: 3, closed: [1, 0, 1], show: 1, symbols: 0 },
        },
        {
            label: "Two cells, both bulbs lit",
            params: { cells: 2, branches: 2, closed: [1, 1], show: 1, symbols: 0 },
        },
        {
            label: "Which will light?",
            params: { cells: 2, branches: 3, closed: [0, 1, 1], show: 0, symbols: 1 },
        },
    ],
    box: (p) => ({ w: 16, h: Math.ceil(railY(p.branches) / U + 2.6) }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            sym = p.symbols > 0,
            show = p.show > 0,
            n = whole(p.branches, 2, 3),
            closed = closedOf(n, p.closed),
            glow = branchGlow(p.cells, n, p.closed),
            cells = whole(p.cells, 1, 4),
            B = railY(n),
            wire = (x1: number, y1: number, x2: number, y2: number) =>
                pen.line(g, x1, y1, x2, y2, "ruler", { strokeWidth: 2.2 });
        wire(L, FIRST, L, B);
        wire(R, FIRST, R, B);
        const half = sym ? 0.75 * U : 1.2 * U;
        for (let i = 0; i < n; i++) {
            const y = rowY(i),
                on = closed[i] ?? true;
            wire(L, y, BULB_X - half, y);
            wire(BULB_X + half, y, SWITCH_X - 0.9 * U, y);
            wire(SWITCH_X + 0.9 * U, y, R, y);
            switchAlong(c, SWITCH_X, y, on);
            if (sym) {
                const r = 0.75 * U,
                    d = r * 0.7;
                pen.circle(g, BULB_X, y, 2 * r, "ruler", pen.fill("card"), { strokeWidth: 2 });
                pen.line(g, BULB_X - d, y - d, BULB_X + d, y + d, "ruler", { strokeWidth: 1.8 });
                pen.line(g, BULB_X - d, y + d, BULB_X + d, y - d, "ruler", { strokeWidth: 1.8 });
                if (!show) penned(c, BULB_X, y - 1.3 * U, "?", 22);
            } else {
                const level = glow[i] ?? 0,
                    lit = show && level > 0;
                bulbGlass(c, BULB_X, y, pen.fill(lit ? "glow" : "card"));
                if (lit) bulbRays(c, BULB_X, y, 5 + level, 1.7, 2.1 + 0.25 * level);
                if (!show) penned(c, BULB_X, y - 1.7 * U, "?", 24);
            }
            if (i > 0)
                for (const x of [L, R])
                    pen.circle(
                        g,
                        x,
                        y,
                        8,
                        "ruler",
                        { fill: c.t.ink, fillStyle: "solid" },
                        { strokeWidth: 0.8 },
                    );
            say(c, R + 0.5 * U, y + 5, "ABC"[i] ?? "?", 15, "start");
            a[`bulb(${i})`] = [BULB_X, y - (sym ? 1.6 : 2.6) * U, "up"];
            a[`switch(${i})`] = [SWITCH_X, y - 1.2 * U, "up"];
        }
        const total = cellsWide(cells),
            x0 = (L + R) / 2 - total / 2;
        wire(L, B, x0, B);
        cellPlates(c, x0, B, cells);
        wire(x0 + total, B, R, B);
        soft(c, (L + R) / 2, B + 2.1 * U, cells === 1 ? "1 cell" : `${cells} cells`, 14);
        a.cell = [(L + R) / 2, B + 1.2 * U, "down"];
        return a;
    },
    describe: (p) =>
        `${p.symbols > 0 ? "A circuit diagram of c" : "C"}ells with ${whole(p.branches, 2, 3) === 3 ? "three" : "two"} branches joined across them side by side, a bulb and a switch in each branch, lettered down the side.`,
    reads: true,
    motion: { still: "Which bulbs are lit, and how brightly, is the reading, so it holds still." },
});
