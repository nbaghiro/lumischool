import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, penned } from "../lettering";
import { CELL_W, cellsWide, cellPlates, bulbGlass, bulbRays, croc, thingIcon } from "./wiring";

/**
 * The things a lesson tests, what each is made of and what it does, in one table, so the drawing
 * that lights a bulb and the checker that marks it cannot disagree. The coin is a dollar coin:
 * copper and nickel, so it conducts and a magnet leaves it alone, which is the surprise worth
 * having. Only the things with a material go in a tester or answer a magnet question.
 */
export const THINGS: Record<
    string,
    {
        name: string;
        made?: "metal" | "plastic" | "rubber" | "wood" | "glass";
        magnetic?: boolean;
        source: boolean;
        half: number;
    }
> = {
    nail: { name: "nail", made: "metal", magnetic: true, source: false, half: 1.5 },
    clip: { name: "paper clip", made: "metal", magnetic: true, source: false, half: 1.4 },
    foil: { name: "foil", made: "metal", magnetic: false, source: false, half: 1.3 },
    coin: { name: "coin", made: "metal", magnetic: false, source: false, half: 0.8 },
    ruler: { name: "plastic ruler", made: "plastic", magnetic: false, source: false, half: 1.8 },
    eraser: { name: "eraser", made: "rubber", magnetic: false, source: false, half: 1.1 },
    stick: { name: "lolly stick", made: "wood", magnetic: false, source: false, half: 1.7 },
    marble: { name: "marble", made: "glass", magnetic: false, source: false, half: 0.65 },
    candle: { name: "candle", source: true, half: 0.6 },
    torch: { name: "torch", source: true, half: 1.7 },
    lamp: { name: "lamp", source: true, half: 1.2 },
    sun: { name: "sun", source: true, half: 1.6 },
    moon: { name: "moon", source: false, half: 1.1 },
    mirror: { name: "mirror", source: false, half: 0.9 },
};

const MATERIALS = Object.keys(THINGS).filter((k) => THINGS[k]?.made);

/** Whether a thing lets electricity through: the metal ones do, and nothing else in the table does. */
const conducts = (kind: string): boolean => THINGS[kind]?.made === "metal";

export const tester = defineDrawing({
    id: "tester",
    family: "science",
    title: "Conductor tester",
    group: "Structures",
    about: "A cell and a bulb on a loop with a gap in it, and a thing held across the gap between two crocodile clips. The bulb lights when the thing lets electricity through, which the metal things do and the plastic, rubber, wood and glass ones do not, so the drawing is a test a child can predict before it is shown. With `show` at 0 the bulb waits under a question mark.",
    params: { thing: "coin", show: 1, tag: "" },
    settings: {
        thing: { kind: "one of", of: MATERIALS },
        show: { kind: "whole", min: 0, max: 1 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        { label: "A coin across the gap", params: { thing: "coin", show: 1, tag: "" } },
        { label: "A plastic ruler", params: { thing: "ruler", show: 1, tag: "" } },
        { label: "A paper clip, to predict", params: { thing: "clip", show: 0, tag: "" } },
    ],
    box: () => ({ w: 16, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            show = p.show > 0,
            kind = THINGS[p.thing]?.made ? p.thing : "coin";
        if (p.tag) num(c, 0.9 * U, 1.4 * U, p.tag, 22);
        const L = 1.5 * U,
            R = 14.5 * U,
            T = 3.2 * U,
            B = 9 * U,
            bx = 8 * U,
            gx = 10.3 * U,
            lit = show && conducts(kind);
        const wire = (x1: number, y1: number, x2: number, y2: number) =>
            pen.line(g, x1, y1, x2, y2, "ruler", { strokeWidth: 2.2 });
        wire(L, T, bx - 1.2 * U, T);
        wire(bx + 1.2 * U, T, R, T);
        wire(L, T, L, B);
        wire(R, T, R, B);
        bulbGlass(c, bx, T, pen.fill(lit ? "glow" : "card"));
        if (lit) bulbRays(c, bx, T);
        if (!show) penned(c, bx, T - 1.7 * U, "?", 24);
        a.bulb = [bx, T - 2.6 * U, "up"];
        const x0 = 3.4 * U;
        wire(L, B, x0 - 4, B);
        cellPlates(c, x0, B, 1);
        const half = (THINGS[kind]?.half ?? 1) * U,
            left = gx - half + 0.25 * U,
            right = gx + half - 0.25 * U;
        wire(x0 + cellsWide(1) + 4, B, left - 1.2 * U, B);
        wire(right + 1.2 * U, B, R, B);
        thingIcon(c, kind, gx, B);
        croc(c, left, B, 1);
        croc(c, right, B, -1);
        cap(c, gx, B + 2.1 * U, THINGS[kind]?.name ?? kind, 11);
        a.thing = [gx, B - 1 * U, "up"];
        a.cell = [x0 + CELL_W / 2, B + 1.2 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A cell and a bulb on a loop of wire with a gap in it, and the ${p.thing} held across the gap between two crocodile clips.`,
    reads: true,
});
