import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, penned, say } from "../lettering";
import { lightFill, type Pt } from "./apparatus";
import { ROCK_CYCLE, ROCK_STAGES } from "./substances";

/** Where each stage's box sits, in squares: sediment at the top, magma at the bottom left. */
const AT: Pt[] = [
    [4, 6],
    [11.5, 1.6],
    [19, 6],
    [16.5, 11.6],
    [6.5, 11.6],
];
const HALF_W = 3.6;
const HALF_H = 0.9;
/** Where each arrow's number sits along it, as a share of the way from its start. */
const ALONG = [0.5, 0.5, 0.5, 0.5, 0.5, 0.42, 0.5, 0.5];
const FILLS = ["tang", "glow", "sky", "berry", "tang"] as const;

/** A point on the edge of a stage's box, on the line from its middle towards `to`. */
function edge([x, y]: Pt, [tx, ty]: Pt): Pt {
    const dx = tx - x,
        dy = ty - y,
        s = Math.min(
            dx === 0 ? Infinity : (HALF_W + 0.25) / Math.abs(dx),
            dy === 0 ? Infinity : (HALF_H + 0.35) / Math.abs(dy),
        );
    return [x + dx * s, y + dy * s];
}

export const rockcycle = defineDrawing({
    id: "rockcycle",
    family: "science",
    title: "The rock cycle",
    group: "Structures",
    about: "The rock cycle as five boxes joined by numbered arrows: igneous rock is worn into sediment, sediment is pressed and cemented into sedimentary rock, heat and pressure change it into metamorphic rock, that melts into magma, and magma cools into igneous rock again, with two shortcuts across the middle, and sedimentary rock can be worn back into sediment. A key names what happens along each numbered arrow. `arrows` says which arrows are drawn, `blank` puts a question mark in the key for one arrow and `hide` in place of one box's name, so a question can ask what is missing; `start` and `end` badge two boxes S and E, and a checker works out the fewest arrows from one to the other.",
    params: { arrows: [1, 2, 3, 4, 5], blank: 0, hide: -1, key: 1, start: -1, end: -1 },
    settings: {
        arrows: { kind: "numbers", min: 1, max: 8, most: 8 },
        blank: { kind: "whole", min: 0, max: 7 },
        hide: { kind: "whole", min: -1, max: 4 },
        key: { kind: "whole", min: 0, max: 1 },
        start: { kind: "whole", min: -1, max: 4 },
        end: { kind: "whole", min: -1, max: 4 },
    },
    takes: [
        {
            label: "The loop",
            params: { arrows: [1, 2, 3, 4, 5], blank: 0, hide: -1, key: 1, start: -1, end: -1 },
        },
        {
            label: "With the shortcuts",
            params: {
                arrows: [1, 2, 3, 4, 5, 6, 7],
                blank: 0,
                hide: -1,
                key: 1,
                start: -1,
                end: -1,
            },
        },
        {
            label: "The whole cycle",
            params: {
                arrows: [1, 2, 3, 4, 5, 6, 7, 8],
                blank: 0,
                hide: -1,
                key: 1,
                start: -1,
                end: -1,
            },
        },
        {
            label: "One arrow and one box missing",
            params: { arrows: [1, 2, 3, 4, 5], blank: 2, hide: 3, key: 1, start: 0, end: 2 },
        },
    ],
    box: (p) => ({
        w: 23,
        h: p.key > 0 ? Math.ceil(13.6 + Math.ceil(new Set(p.arrows).size / 2) * 1.4) : 13,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            t = c.t,
            a: RawAnchors = {},
            drawn = [...new Set(p.arrows.map((k) => Math.round(k)))]
                .filter((k) => k >= 1 && k <= ROCK_CYCLE.length)
                .sort((x, y) => x - y);
        ROCK_STAGES.forEach((stage, i) => {
            const [x, y] = AT[i] ?? [0, 0];
            pen.rect(
                g,
                (x - HALF_W) * U,
                (y - HALF_H) * U,
                2 * HALF_W * U,
                2 * HALF_H * U,
                "ruler",
                lightFill(c, FILLS[i] ?? "tang"),
                { strokeWidth: 1.8 },
            );
            patch(c, x * U, (y - 0.1) * U, (2 * HALF_W - 0.6) * U, 1.2 * U);
            if (i === Math.round(p.hide)) penned(c, x * U, (y + 0.35) * U, "?", 20);
            else say(c, x * U, (y + 0.3) * U, stage.name, 14);
            for (const [which, tag] of [
                [p.start, "S"],
                [p.end, "E"],
            ] as const) {
                if (i !== Math.round(which)) continue;
                const bx = (x - HALF_W + 0.35) * U,
                    by = (y - HALF_H + 0.1) * U;
                pen.circle(g, bx, by, 1.1 * U, "ruler", pen.fill("card"), { strokeWidth: 2.4 });
                say(c, bx, by + 5, tag, 14);
            }
            a[`stage(${stage.key})`] = [x * U, (y - HALF_H) * U, "up"];
        });
        for (const k of drawn) {
            const arrow = ROCK_CYCLE[k - 1];
            if (!arrow) continue;
            // an arrow drawn both ways between two boxes runs as two lines side by side
            const back = drawn.some(
                    (j) =>
                        ROCK_CYCLE[j - 1]?.from === arrow.to &&
                        ROCK_CYCLE[j - 1]?.to === arrow.from,
                ),
                from = AT[arrow.from] ?? [0, 0],
                to = AT[arrow.to] ?? [0, 0],
                len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1,
                side = back ? 0.6 : 0,
                nx = (-(to[1] - from[1]) / len) * side,
                ny = ((to[0] - from[0]) / len) * side,
                e1 = edge(from, to),
                e2 = edge(to, from),
                p1: Pt = [e1[0] + nx, e1[1] + ny],
                p2: Pt = [e2[0] + nx, e2[1] + ny];
            pen.arrow(g, [p1[0] * U, p1[1] * U], [p2[0] * U, p2[1] * U], t.pen, back ? 0 : 0.08, 2);
            const f = ALONG[k - 1] ?? 0.5,
                mx = (p1[0] + (p2[0] - p1[0]) * f) * U,
                my = (p1[1] + (p2[1] - p1[1]) * f) * U;
            pen.circle(g, mx, my, 1.1 * U, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
            num(c, mx, my + 5, k, 13);
            a[`arrow(${k})`] = [mx, my - 0.55 * U, "up"];
        }
        if (p.key > 0) {
            pen.line(g, 0.3 * U, 13 * U, 22.7 * U, 13 * U, "pencil", {
                strokeWidth: 1,
                stroke: t["ink-soft"],
            });
            drawn.forEach((k, i) => {
                const x = (i % 2 ? 11.8 : 0.5) * U,
                    y = (14.1 + Math.floor(i / 2) * 1.4) * U;
                pen.circle(g, x + 0.5 * U, y - 0.3 * U, 0.95 * U, "ruler", pen.fill("card"), {
                    strokeWidth: 1.4,
                });
                num(c, x + 0.5 * U, y + 0.05 * U, k, 12);
                if (k === Math.round(p.blank)) {
                    pen.rect(g, x + 1.3 * U, y - 0.95 * U, 7.6 * U, 1.3 * U, "ruler", null, {
                        strokeWidth: 1.6,
                    });
                    penned(c, x + 5.1 * U, y + 0.1 * U, "?", 20);
                } else
                    say(
                        c,
                        x + 1.3 * U,
                        y + 0.05 * U,
                        ROCK_CYCLE[k - 1]?.process ?? "",
                        14,
                        "start",
                    );
            });
        }
        return a;
    },
    describe: (p) =>
        `Five boxes, igneous rock, sediment, sedimentary rock, metamorphic rock and magma, joined by ${new Set(p.arrows).size} numbered arrows${p.key > 0 ? ", with a key of what happens" : ""}${p.blank > 0 ? ", one entry left blank" : ""}${p.hide >= 0 ? ", one box's name hidden" : ""}.`,
    reads: true,
});
