import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";

/** The timer's pointer angle for a number of minutes, in radians from twelve o'clock. */
const turnOf = (minutes: number) => ((-135 + minutes * 4.5) * Math.PI) / 180;

/**
 * The timer's scale runs round three quarters of the dial, so 0 and 60 are never the same mark, and
 * its numbers and unit sit outside the face where the pointer cannot cover them.
 */
export const oven = defineDrawing({
    id: "oven",
    family: "food",
    title: "Oven",
    group: "Props",
    about: "A kitchen oven with four rings on the hob, a tray of buns seen through the window in its door and a timer dial marked from 0 to 60 minutes. When it is lit the window glows. The buns can be counted and the timer read.",
    params: { lit: 1, minutes: 20, buns: 6 },
    settings: {
        lit: { kind: "whole", min: 0, max: 1 },
        minutes: { kind: "whole", min: 0, max: 60 },
        buns: { kind: "whole", min: 0, max: 6 },
    },
    takes: [
        { label: "Lit, 20 minutes, six buns", params: { lit: 1, minutes: 20, buns: 6 } },
        { label: "Off, 45 minutes, four buns", params: { lit: 0, minutes: 45, buns: 4 } },
        { label: "Empty, the timer at 0", params: { lit: 0, minutes: 0, buns: 0 } },
    ],
    box: () => ({ w: 7, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            lit = p.lit > 0,
            mins = Math.max(0, Math.min(60, Math.round(p.minutes))),
            n = Math.max(0, Math.min(6, Math.round(p.buns))),
            a: RawAnchors = {};
        const dx = 70,
            dy = 36,
            ink = { fill: c.t.ink, fillStyle: "solid" };

        pen.path(g, roundedRect(24, 1, 92, 68, 6), "pencil", pen.fill("card"), {
            strokeWidth: 1.8,
        });
        pen.circle(g, dx, dy, 32, "ruler", pen.fill("card"), { strokeWidth: 1.7 });
        for (let m = 0; m <= 60; m += 5) {
            const t = turnOf(m),
                long = m % 15 === 0,
                r0 = long ? 8.5 : 11;
            pen.line(
                g,
                dx + r0 * Math.sin(t),
                dy - r0 * Math.cos(t),
                dx + 14.5 * Math.sin(t),
                dy - 14.5 * Math.cos(t),
                "ruler",
                { strokeWidth: long ? 1.4 : 1.1 },
            );
            if (long) num(c, dx + 28 * Math.sin(t), dy - 28 * Math.cos(t) + 4.6, m, 13);
        }
        say(c, dx, dy + 29, "min", 13);
        const t = turnOf(mins),
            s = Math.sin(t),
            k = Math.cos(t);
        pen.polygon(
            g,
            [
                [dx - 2 * k, dy - 2 * s],
                [dx + 13.5 * s, dy - 13.5 * k],
                [dx + 2 * k, dy + 2 * s],
            ],
            "ruler",
            ink,
            { strokeWidth: 1.2 },
        );
        pen.circle(g, dx, dy, 7, "ruler", ink, { strokeWidth: 0.8 });
        a.timer = [dx, 1, "up"];

        pen.polygon(
            g,
            [
                [20, 69],
                [120, 69],
                [136, 87],
                [4, 87],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.8, preserveVertices: true },
        );
        const rings: [number, number, number, number][] = [
            [48, 73.5, 30, 6.5],
            [92, 73.5, 30, 6.5],
            [42, 81.5, 36, 8],
            [98, 81.5, 36, 8],
        ];
        rings.forEach(([x, y, w, h], i) => {
            pen.ellipse(g, x, y, w, h, "ruler", null, { strokeWidth: 1.5 });
            pen.ellipse(g, x, y, w * 0.5, h * 0.5, "ruler", pen.fill("ink-soft"), {
                strokeWidth: 1.1,
            });
            a[`ring(${i})`] = [x, y - h / 2, "up"];
        });
        a.hob = [dx, 69, "up"];

        pen.rect(g, 4, 87, 132, 11, "pencil", pen.fill("card"), { strokeWidth: 1.8 });
        for (const x of [22, 42, 98, 118]) {
            pen.circle(g, x, 92.5, 7.5, "ruler", pen.fill("card"), { strokeWidth: 1.3 });
            pen.line(g, x, 92.5, x, 89.2, "ruler", { strokeWidth: 1.1 });
        }
        pen.path(g, roundedRect(64, 90, 12, 5, 2), "ruler", pen.fill(lit ? "glow" : "card"), {
            strokeWidth: 1.2,
        });
        a.lamp = [dx, 90, "up"];

        pen.rect(g, 4, 98, 132, 56, "pencil", pen.fill("card"), { strokeWidth: 1.8 });
        pen.rect(g, 10, 101, 120, 50, "pencil", pen.fill("card"), { strokeWidth: 1.4 });
        pen.path(g, roundedRect(32, 104.5, 76, 5, 2.5), "ruler", pen.fill("ink-soft"), {
            strokeWidth: 1.2,
        });
        pen.path(
            g,
            roundedRect(20, 114, 100, 33, 4),
            "ruler",
            lit
                ? pen.fill("glow")
                : pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.7 }),
            { strokeWidth: 1.6 },
        );
        pen.polygon(
            g,
            [
                [32, 119],
                [108, 119],
                [113, 144],
                [27, 144],
            ],
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.2, preserveVertices: true },
        );
        for (let i = 0; i < n; i++) {
            const row = Math.floor(i / 3),
                col = i % 3,
                x = dx + (col - 1) * (row ? 27 : 24),
                y = row ? 137 : 126,
                w = row ? 19 : 17,
                h = row ? 10 : 9;
            pen.ellipse(
                g,
                x,
                y,
                w,
                h,
                "ruler",
                pen.fill("tang", "solid", { hachureGap: 3, fillWeight: 0.6 }),
                { strokeWidth: 1.3 },
            );
            pen.arc(g, x, y - 0.5, w * 0.55, h * 0.45, Math.PI * 1.15, Math.PI * 1.6, "ruler", {
                strokeWidth: 0.9,
                stroke: c.t.card,
            });
            a[`bun(${i})`] = [x, y - h / 2, "up"];
        }
        a.window = [dx, 147, "down"];
        pen.rect(
            g,
            10,
            154,
            120,
            4,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 3, fillWeight: 0.6 }),
            { strokeWidth: 1.2 },
        );
        a.door = [dx, 158, "down"];
        return a;
    },
    describe: (p) =>
        `A kitchen oven: four rings on the hob, knobs, a timer dial marked in minutes, and a window in the door${p.lit > 0 ? " that glows" : ""}${Math.max(0, Math.min(6, Math.round(p.buns))) > 0 ? " showing a tray of buns" : ""}.`,
    motion: {
        still: "An oven stands where it is fitted, and its timer is read, so it holds still.",
    },
    reads: true,
});
