import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { cap, num, onCircle, sector } from "../lettering";

/** Where each eighth of a tank sits on a quarter turn, measured the way a clock face is. */
const fuelTurn = (level: number): number => -0.125 + Math.max(0, Math.min(1, level)) * 0.25;

const FUEL_LABEL: Record<number, string> = { 0: "E", 4: "1/2", 8: "F" };

export const fuelGauge = defineDrawing({
    id: "fuelgauge",
    family: "travel",
    title: "Fuel gauge",
    group: "Structures",
    about: "A quarter circle dial from empty to full, marked at the quarters with the eighths between them and a needle that can land on either. A fuel gauge is a fraction a child has watched an adult read.",
    params: { level: 0.375 },
    settings: { level: { kind: "number", min: 0, max: 1, step: 0.125 } },
    takes: [
        { label: "Three eighths", params: { level: 0.375 } },
        { label: "Half", params: { level: 0.5 } },
        { label: "Nearly empty", params: { level: 0.1 } },
    ],
    box: () => ({ w: 13, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 6.5 * U,
            cy = 7.2 * U,
            R = 4.6 * U,
            a: RawAnchors = {};
        pen.path(g, roundedRect(U, U, 11 * U, 8 * U, 14), "ruler", pen.fill("card"), {
            strokeWidth: 2.6,
        });
        // The reserve, hatched rather than solid, so the marks over it stay readable in print.
        pen.path(
            g,
            sector(cx, cy, R - 4, fuelTurn(0) * 2 * Math.PI, fuelTurn(0.25) * 2 * Math.PI),
            "ruler",
            pen.fill("tang", "hachure", { hachureGap: 11, fillWeight: 0.7 }),
            { strokeWidth: 0 },
        );
        pen.arc(g, cx, cy, R * 2, R * 2, Math.PI * 1.25, Math.PI * 1.75, "ruler", {
            strokeWidth: 2,
        });
        for (let k = 0; k <= 8; k++) {
            const turn = fuelTurn(k / 8),
                major = k % 2 === 0;
            const [ax, ay] = onCircle(cx, cy, R, turn),
                [bx, by] = onCircle(cx, cy, R - (major ? 20 : 11), turn);
            pen.line(g, ax, ay, bx, by, "ruler", { strokeWidth: major ? 1.8 : 1 });
            if (FUEL_LABEL[k]) {
                const [tx, ty] = onCircle(cx, cy, R + 0.55 * U, turn);
                num(c, tx, ty + 5, FUEL_LABEL[k] ?? "", 15);
            }
            if (major) a[`mark(${k}/8)`] = [ax, ay, "up"];
        }
        const turn = fuelTurn(p.level);
        const [hx, hy] = onCircle(cx, cy, R - 0.85 * U, turn),
            [tx, ty] = onCircle(cx, cy, -0.5 * U, turn);
        pen.line(g, tx, ty, hx, hy, "ruler", { strokeWidth: 3.2 });
        pen.circle(
            g,
            cx,
            cy,
            15,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 1 },
        );
        cap(c, cx, 8.5 * U, "fuel", 12);
        a.needle = [hx, hy, "up"];
        a.dial = [cx, cy, "right"];
        return a;
    },
    describe: () =>
        "A quarter-circle fuel gauge on a card, marked from empty to full with the halfway mark, a hatched orange reserve and a needle pointing at the dial.",
    motion: { still: STILL.instrument },
    reads: true,
});
