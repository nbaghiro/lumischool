import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";
import { mins, spanText } from "./spans";

export const elapsedLine = defineDrawing({
    id: "elapsed",
    family: "time",
    title: "Time line to count along",
    group: "Structures",
    about: "The bridging method for elapsed time: stop at the next o'clock, take the whole hours, then the minutes. Each hop is five squares wide whatever it is worth, and its label is worked out from the two times.",
    params: { stops: ["9:40", "10:00", "11:00", "11:15"], total: true },
    settings: { stops: { kind: "words", most: 6 }, total: { kind: "flag" } },
    takes: [
        {
            label: "Bridging an hour",
            params: { stops: ["9:40", "10:00", "11:00", "11:15"], total: true },
        },
        { label: "Inside one hour", params: { stops: ["2:25", "2:50"], total: false } },
        {
            label: "Over three hours",
            params: { stops: ["10:50", "11:00", "14:00", "14:20"], total: true },
        },
        { label: "No total shown", params: { stops: ["7:35", "8:00", "9:00"], total: false } },
    ],
    box: (p) => ({ w: Math.max(2, p.stops.length - 1) * 5 + 3, h: p.total ? 9 : 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 4.5 * U,
            x = (i: number) => 1.5 * U + i * 5 * U;
        const n = p.stops.length,
            a: RawAnchors = {};
        pen.line(g, x(0) - 10, y, x(n - 1) + 10, y, "ruler", { strokeWidth: 2 });
        p.stops.forEach((s, i) => {
            pen.line(g, x(i), y - 8, x(i), y + 9, "ruler", { strokeWidth: 1.8 });
            num(c, x(i), y + 30, s, 15);
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
                spanText(mins(p.stops[i + 1] ?? "0:00") - mins(p.stops[i] ?? "0:00")),
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
                spanText(mins(p.stops[n - 1] ?? "0:00") - mins(p.stops[0] ?? "0:00")),
                17,
            );
            a.total = [(x(0) + x(n - 1)) / 2, yb + 8, "down"];
        }
        return a;
    },
    describe: () =>
        "A time line with the times written under its ticks and pencil hops arched between them, each gap written above its hop and the whole read along the line.",
});
