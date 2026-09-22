import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";
import { price, cents } from "./price";

export const changeLine = defineDrawing({
    id: "change",
    family: "money",
    title: "Counting up for change",
    group: "Structures",
    about: "The shopkeeper's method: up from the price to the next round amount, then in whole dollars to what was handed over. Each hop is five squares wide and its label is worked out from the two amounts.",
    params: { stops: ["3.65", "4.00", "5.00"], total: true },
    settings: { stops: { kind: "words", most: 5 }, total: { kind: "flag" } },
    takes: [
        { label: "Change from $5", params: { stops: ["3.65", "4.00", "5.00"], total: true } },
        { label: "Inside a dollar", params: { stops: ["0.35", "1.00"], total: false } },
        { label: "Change from $20", params: { stops: ["12.40", "13.00", "20.00"], total: true } },
    ],
    box: (p) => ({ w: Math.max(2, p.stops.length - 1) * 5 + 3, h: p.total ? 9 : 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 4.5 * U,
            x = (i: number) => 1.5 * U + i * 5 * U,
            n = p.stops.length;
        const a: RawAnchors = {};
        pen.line(g, x(0) - 10, y, x(n - 1) + 10, y, "ruler", { strokeWidth: 2 });
        p.stops.forEach((s, i) => {
            pen.line(g, x(i), y - 8, x(i), y + 9, "ruler", { strokeWidth: 1.8 });
            num(c, x(i), y + 30, price(cents(s)), 15);
            a[`stop(${i})`] = [x(i), y + 9, "down"];
        });
        for (let i = 0; i + 1 < n; i++) {
            const xa = x(i),
                xb = x(i + 1),
                xm = (xa + xb) / 2,
                top = y - 44;
            pen.curve(
                g,
                [
                    [xa, y - 9],
                    [xm, top],
                    [xb, y - 9],
                ],
                "pencil",
                { strokeWidth: 1.8, stroke: c.t.pen },
            );
            for (const s of [-1, 1]) {
                const b = 0.9 + s * 0.45;
                pen.line(g, xb, y - 9, xb - 8 * Math.cos(b), y - 9 - 8 * Math.sin(b), "pencil", {
                    strokeWidth: 1.8,
                    stroke: c.t.pen,
                });
            }
            say(
                c,
                xm,
                top - 6,
                price(cents(p.stops[i + 1] ?? "0") - cents(p.stops[i] ?? "0")),
                14,
                "middle",
                c.t.pen,
            );
            a[`hop(${i})`] = [xm, top, "up"];
        }
        if (p.total) {
            const yb = y + 2.2 * U;
            pen.path(g, `M${x(0)} ${yb - 8}V${yb}H${x(n - 1)}V${yb - 8}`, "ruler", null, {
                strokeWidth: 1.5,
                stroke: c.t["ink-soft"],
            });
            num(
                c,
                (x(0) + x(n - 1)) / 2,
                yb + 24,
                price(cents(p.stops[n - 1] ?? "0") - cents(p.stops[0] ?? "0")),
                17,
            );
            a.change = [(x(0) + x(n - 1)) / 2, yb + 8, "down"];
        }
        return a;
    },
    describe: () =>
        "A number line for counting up change, amounts under its ticks and pencil hops arched between them with each hop's value written above.",
});
