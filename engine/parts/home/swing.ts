import { part, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const within = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const swing = defineDrawing({
    id: "swing",
    family: "home",
    title: "Swing",
    group: "Props",
    about: "A garden swing: a wooden frame with its legs spread and a seat, or two, hanging on ropes from the top bar. A swing going back and forth is a pendulum, and its swings can be counted.",
    params: { seats: 1 },
    settings: { seats: { kind: "whole", min: 1, max: 2 } },
    takes: [
        { label: "One seat", params: { seats: 1 } },
        { label: "Two seats", params: { seats: 2 } },
    ],
    box: () => ({ w: 8, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = within(p.seats, 1, 2),
            W = 8 * U,
            base = 6.7 * U,
            bar = 0.9 * U,
            wood = pen.fill("tang"),
            a: RawAnchors = {};
        for (const [x, sd] of [
            [0.9 * U, -1],
            [W - 0.9 * U, 1],
        ] as const) {
            pen.line(g, x - sd * 0.1 * U, bar, x + sd * 0.4 * U, base, "pencil", {
                strokeWidth: 3,
                stroke: c.t.tang,
            });
            pen.line(g, x - sd * 0.1 * U, bar, x - sd * 0.7 * U, base, "pencil", {
                strokeWidth: 3,
                stroke: c.t.tang,
            });
        }
        pen.rect(g, 0.5 * U, bar - 0.22 * U, W - 1 * U, 0.44 * U, "pencil", wood, {
            strokeWidth: 1.6,
        });
        for (let i = 0; i < n; i++) {
            const cx = n === 1 ? W / 2 : (2.9 + i * 2.2) * U,
                seatY = 5 * U;
            const hang = part(c, "seat", [cx, bar]).g;
            for (const dx of [-0.65, 0.65])
                pen.line(hang, cx + dx * U, bar + 0.2 * U, cx + dx * U, seatY, "pencil", {
                    strokeWidth: 1.3,
                });
            pen.rect(
                hang,
                cx - 0.9 * U,
                seatY - 0.05 * U,
                1.8 * U,
                0.34 * U,
                "pencil",
                pen.fill(i ? "sky" : "berry"),
                { strokeWidth: 1.4 },
            );
            a[`seat(${i})`] = [cx, seatY, "up"];
        }
        for (let x = 0.3 * U; x < W - 0.3 * U; x += 1.4 * U)
            for (const d of [-5, 0, 5])
                pen.line(g, x + d, base, x + d * 1.5, base - 0.45 * U, "pencil", {
                    strokeWidth: 1,
                    stroke: c.t.ok,
                });
        pen.line(g, 0.1 * U, base, W - 0.1 * U, base, "pencil", { strokeWidth: 1.8 });
        a.top = [W / 2, bar - 0.2 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A garden swing with a wooden frame, its legs spread, and ${within(p.seats, 1, 2) > 1 ? "seats hanging side by side" : "a seat hanging"} on ropes from the top bar.`,
    motion: { parts: { seat: { is: "sway", deg: 9, period: 3.6 } } },
});
