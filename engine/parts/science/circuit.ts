import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, soft } from "../lettering";
import { cellsWide, cellPlates, switchUp, bulbGlass, bulbRays } from "./wiring";

export const circuit = defineDrawing({
    id: "circuit",
    family: "science",
    title: "Circuit",
    group: "Structures",
    about: "A cell, a bulb and a switch on one loop of wire. The switch is drawn open or closed and the bulb is lit or dark to match, so whether the circuit works is something to read off rather than to remember. The switch is a number rather than true or false, because a word setting cannot be a parameter and every question here turns on it varying.",
    params: { closed: 1, cells: 1, buzzer: 0 },
    settings: {
        closed: { kind: "whole", min: 0, max: 1 },
        cells: { kind: "whole", min: 1, max: 4 },
        buzzer: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "The switch shut", params: { closed: 1, cells: 1, buzzer: 0 } },
        { label: "The switch open", params: { closed: 0, cells: 1, buzzer: 0 } },
        { label: "Two cells and a buzzer", params: { closed: 1, cells: 2, buzzer: 1 } },
    ],
    box: () => ({ w: 16, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const l = 1.5 * U,
            r = 14.5 * U,
            t = 2.2 * U,
            b = 8.4 * U;
        const closed = p.closed > 0,
            lit = closed;
        // the loop, drawn as four runs so each component can break its own run
        pen.line(g, l, t, 5.6 * U, t, "ruler", { strokeWidth: 2.2 });
        pen.line(g, 10.4 * U, t, r, t, "ruler", { strokeWidth: 2.2 });
        pen.line(g, l, t, l, b, "ruler", { strokeWidth: 2.2 });
        pen.line(g, r, t, r, 4.6 * U, "ruler", { strokeWidth: 2.2 });
        pen.line(g, r, 6.4 * U, r, b, "ruler", { strokeWidth: 2.2 });
        // The bottom run is drawn after the cells, so the wire stops exactly where they start: a fixed
        // gap left a break in the loop, which is the one thing this drawing must not appear to have.
        // the bulb, on the top run
        const bx = 8 * U;
        bulbGlass(c, bx, t, pen.fill(lit ? "glow" : "card"));
        pen.line(g, 5.6 * U, t, bx - 1.2 * U, t, "ruler", { strokeWidth: 2.2 });
        pen.line(g, bx + 1.2 * U, t, 10.4 * U, t, "ruler", { strokeWidth: 2.2 });
        if (lit) bulbRays(c, bx, t);
        a.bulb = [bx, t - 2.6 * U, "up"];
        // the cell or cells, on the bottom run
        const cells = Math.max(1, Math.min(4, p.cells)),
            total = cellsWide(cells);
        pen.line(g, l, b, 8 * U - total / 2 - 4, b, "ruler", { strokeWidth: 2.2 });
        pen.line(g, 8 * U + total / 2 + 4, b, r, b, "ruler", { strokeWidth: 2.2 });
        cellPlates(c, 8 * U - total / 2, b, cells);
        soft(c, 8 * U, b + 2.1 * U, cells === 1 ? "1 cell" : `${cells} cells`, 14);
        a.cell = [8 * U, b + 1.2 * U, "down"];
        // the switch, on the right-hand run: a hinge, a contact and the blade between them
        const sy = 5.5 * U;
        switchUp(c, r, 4.6 * U, 6.4 * U, closed);
        soft(c, r - 0.4 * U, sy + 6, closed ? "closed" : "open", 13, "end");
        a.switch = [r, sy, "right"];
        if (p.buzzer > 0) {
            pen.circle(g, l, 5.5 * U, 1.8 * U, "ruler", pen.fill("card"), { strokeWidth: 2 });
            say(c, l, 5.5 * U + 6, "♪", 18);
            a.buzzer = [l, 5.5 * U - 1.9 * U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A cell, a bulb and a switch on one loop of wire${p.buzzer > 0 ? " with a buzzer beside the bulb" : ""}, the switch drawn ${p.closed > 0 ? "closed" : "open"}.`,
});
