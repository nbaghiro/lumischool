import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, paintFill } from "../../pigment";
import { defineDrawing } from "../drawing";
import { cap, say } from "../lettering";
import { loop } from "../marks";
import { type Pt } from "./kit";

/** The wheel's colours, each mixed from the three primaries in the box: its tertiaries are two to one. */
const WHEEL12 = [
    "red",
    "red 2+yellow",
    "red+yellow",
    "yellow 2+red",
    "yellow",
    "yellow 2+blue",
    "yellow+blue",
    "blue 2+yellow",
    "blue",
    "blue 2+red",
    "red+blue",
    "red 2+blue",
];
const WHEEL6 = ["red", "red+yellow", "yellow", "yellow+blue", "blue", "red+blue"];
const WHEEL_WORDS6 = ["red", "orange", "yellow", "green", "blue", "purple"];

export const colourWheel = defineDrawing({
    id: "colourwheel",
    family: "art",
    title: "Colour wheel",
    group: "Structures",
    about: "The three primaries round a wheel with what each pair makes between them, every colour mixed from the box's red, yellow and blue the way paint mixes, so the purple is as dark as real paint makes it. Six segments or twelve; any can be left empty to paint in; one can be ringed, the warm half marked off from the cool, or an arrow drawn to the opposite colour.",
    params: { segments: 6, blank: [] as number[], ring: -1, labels: true, split: "none" },
    settings: {
        segments: { kind: "one of", of: [6, 12] },
        blank: { kind: "numbers", min: 0, max: 11, most: 12 },
        ring: { kind: "whole", min: -1, max: 11 },
        labels: { kind: "flag" },
        split: { kind: "one of", of: ["none", "warm", "opposite"] },
    },
    takes: [
        {
            label: "Six, named",
            params: { segments: 6, blank: [], ring: -1, labels: true, split: "none" },
        },
        {
            label: "Twelve, warm and cool",
            params: { segments: 12, blank: [], ring: -1, labels: true, split: "warm" },
        },
        {
            label: "Secondaries to paint, opposite of blue",
            params: { segments: 6, blank: [1, 3, 5], ring: 4, labels: true, split: "opposite" },
        },
    ],
    box: () => ({ w: 14, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = p.segments === 12 ? 12 : 6,
            list = n === 12 ? WHEEL12 : WHEEL6;
        const cx = 7 * U,
            cy = 7 * U,
            R = 4.6 * U,
            r0 = (p.split === "warm" ? 1.9 : 1.4) * U,
            a: RawAnchors = {};
        const at = (turn: number, rad: number): Pt => [
            cx + rad * Math.sin(turn * Math.PI * 2),
            cy - rad * Math.cos(turn * Math.PI * 2),
        ];
        for (let i = 0; i < n; i++) {
            const t0 = (i - 0.5) / n,
                t1 = (i + 0.5) / n,
                steps = 6,
                outer: Pt[] = [],
                inner: Pt[] = [];
            for (let k = 0; k <= steps; k++) {
                outer.push(at(t0 + ((t1 - t0) * k) / steps, R));
                inner.unshift(at(t0 + ((t1 - t0) * k) / steps, r0));
            }
            const hex = colourOf(list[i] ?? "");
            const empty = p.blank.includes(i);
            pen.polygon(
                g,
                [...outer, ...inner],
                "ruler",
                empty || !hex ? c.pen.fill("card") : paintFill(c, hex),
                { strokeWidth: 1.8 },
            );
            const [lx, ly] = at(i / n, R + 1.1 * U);
            // an empty segment keeps its name back, so a question can ask what goes there
            if (p.labels && (n === 6 || i % 2 === 0))
                say(
                    c,
                    lx,
                    ly + 5,
                    empty ? "?" : ((n === 6 ? WHEEL_WORDS6[i] : WHEEL_WORDS6[i / 2]) ?? ""),
                    13,
                );
            if (i === p.ring) {
                const [rx, ry] = at(i / n, (R + r0) / 2);
                loop(c, rx, ry, 2.4 * U, 2.4 * U);
            }
            a[`segment(${i})`] = at(i / n, (R + r0) / 2);
        }
        pen.circle(g, cx, cy, r0 * 2, "ruler", c.pen.fill("card"), { strokeWidth: 1.8 });
        if (p.split === "warm") {
            // red to yellow is warm, green to purple cool: the line runs between purple and red, and between yellow and green
            const [x0, y0] = at(-0.5 / 6 - 0.0, R + 0.4 * U),
                [x1, y1] = at(2.5 / 6, R + 0.4 * U);
            pen.line(g, x0, y0, x1, y1, "ruler", {
                strokeWidth: 2,
                strokeLineDash: [8, 6],
                stroke: c.t.pen,
            });
            cap(c, cx + 0.55 * U, cy - 0.35 * U, "warm", 10, "middle", c.t.pen);
            cap(c, cx - 0.55 * U, cy + 0.75 * U, "cool", 10, "middle", c.t.pen);
        }
        if (p.split === "opposite" && p.ring >= 0) {
            const from = at(p.ring / n, r0 + 0.3 * U),
                to = at((p.ring + n / 2) / n, r0 + 0.3 * U);
            c.pen.arrow(g, from, to, c.t.pen, 0.02, 2);
        }
        a.centre = [cx, cy, "up"];
        return a;
    },
    describe: (p) => {
        const n = p.segments === 12 ? 12 : 6,
            blank = p.blank.filter((i) => i >= 0 && i < n).length;
        return `A colour wheel of ${n} painted segments in a ring round a plain white middle${p.labels ? ", each named" : ""}${blank ? `, ${blank} left white to paint` : ""}${p.ring >= 0 && p.ring < n ? ", one ringed" : ""}${p.split === "warm" ? ", a dashed line dividing warm from cool" : p.split === "opposite" && p.ring >= 0 ? ", an arrow to the opposite segment" : ""}.`;
    },
});
