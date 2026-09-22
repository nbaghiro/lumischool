import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap } from "../lettering";
import { CAR, RAIL, SPUR } from "./yard";

export const sidings = defineDrawing({
    id: "sidings",
    family: "travel",
    title: "Sidings",
    group: "Structures",
    about: "A length of main line with a numbered place for each vehicle, and a siding under it that a carriage can be pushed into and pulled back out of. The buffer stop is at the far end of the siding, so the carriage pushed in first is the one that comes out last, which is the whole reason shunting is a puzzle.",
    params: { slots: 5, siding: 2 },
    settings: {
        slots: { kind: "whole", min: 2, max: 7 },
        siding: { kind: "whole", min: 1, max: 4 },
    },
    takes: [
        { label: "Five places, a siding for two", params: { slots: 5, siding: 2 } },
        { label: "Six places, a siding for three", params: { slots: 6, siding: 3 } },
    ],
    // The rail sits at 4.3 squares inside a carriage's box, so the yard's own height has to be
    // rounded up to a whole square: everything on a sheet is placed in whole squares, and the shelf
    // refuses a box that is not.
    box: (p) => ({ w: p.slots * CAR + 2, h: Math.ceil(RAIL + SPUR + 1.6) }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const w = p.slots * CAR * U,
            y = RAIL * U,
            sy = (RAIL + SPUR) * U;
        const spurFrom = Math.max(0, p.slots - p.siding) * CAR * U;
        const rails = (x1: number, x2: number, at: number) => {
            pen.line(g, x1, at, x2, at, "pencil", { strokeWidth: 2.4 });
            pen.line(g, x1, at + 0.5 * U, x2, at + 0.5 * U, "pencil", {
                strokeWidth: 1.3,
                stroke: c.t["ink-soft"],
            });
            for (let s = Math.ceil(x1 / U); s * U < x2; s++) {
                pen.line(g, s * U, at, s * U, at + 0.5 * U, "pencil", {
                    strokeWidth: 1.1,
                    stroke: c.t["ink-soft"],
                });
            }
        };
        rails(0.2 * U, w + 0.6 * U, y);
        rails(spurFrom + 0.2 * U, w + 0.6 * U, sy);
        // The connection: one curve from the main line down onto the siding, past the last place.
        pen.curve(
            g,
            [
                [w + 0.4 * U, y + 0.25 * U],
                [w + 0.9 * U, (y + sy) / 2],
                [w + 0.4 * U, sy + 0.25 * U],
            ],
            "pencil",
            { strokeWidth: 2 },
        );
        // The buffer stop at the closed end, which is why the siding is a stack and not a queue.
        pen.rect(
            g,
            spurFrom + 0.1 * U,
            sy - 1.1 * U,
            0.35 * U,
            1.6 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 2 },
        );
        for (let i = 0; i < p.slots; i++) {
            const x = i * CAR * U;
            cap(c, x + (CAR / 2) * U, y + 1.35 * U, `place ${i + 1}`, 11);
            a[`place(${i + 1})`] = [x + (CAR / 2) * U, y, "up"];
        }
        for (let i = 0; i < p.siding; i++) {
            const x = spurFrom + i * CAR * U;
            a[`spur(${i + 1})`] = [x + (CAR / 2) * U, sy, "up"];
        }
        cap(c, spurFrom + 0.6 * U, sy + 1.35 * U, "siding", 11, "start");
        a.points = [w + 0.4 * U, (y + sy) / 2, "right"];
        return a;
    },
    describe: () =>
        "A length of railway line with a numbered place for each vehicle and a siding under it, joined by a curve at one end and closed by a buffer stop.",
    reads: true,
});
