import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, patch, say } from "../lettering";
import { parse, readCond, run, world } from "../../coding";

export const fork = defineDrawing({
    id: "fork",
    family: "coding",
    title: "A fork in the path",
    group: "Structures",
    about: "A decision drawn as a path that splits at a signpost: the question on the sign, the yes way and the no way, and what happens at the end of each. With `cond` and a number `n` the program's own test decides which way is taken, and `lit` inks that way in, so a worked example shows the path and a question leaves it for the child to trace.",
    params: {
        ask: "Is there a wall ahead?",
        yes: "turn right",
        no: "forward 1",
        cond: "",
        n: 0,
        lit: false,
    },
    settings: {
        ask: { kind: "text", most: 40 },
        yes: { kind: "text", most: 20 },
        no: { kind: "text", most: 20 },
        cond: { kind: "text", most: 30 },
        n: { kind: "whole", min: 0, max: 100 },
        lit: { kind: "flag" },
    },
    takes: [
        {
            label: "Which way for 7",
            params: {
                ask: "Is the number more than 5?",
                yes: "shout",
                no: "whisper",
                cond: "the number is more than 5",
                n: 7,
                lit: true,
            },
        },
        {
            label: "A wall ahead, not taken",
            params: {
                ask: "Is there a wall ahead?",
                yes: "turn right",
                no: "forward 1",
                cond: "",
                n: 0,
                lit: false,
            },
        },
    ],
    box: (p) => ({
        w: Math.max(
            16,
            Math.ceil(Math.max(p.yes.length, p.no.length) * 0.5) * 2 + 10,
            Math.ceil(p.ask.length * 0.46) + 4,
        ),
        h: 12,
    }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c,
            box = fork.box(p),
            W = box.w * U,
            cx = W / 2;
        let taken: 1 | 2 | 0 = 0;
        if (readCond(p.cond)) {
            const r = run(
                parse([`if ${p.cond}`, "  say yes", "otherwise", "  say no"]),
                world({ cols: 1, rows: 1 }),
                { vars: { number: p.n, n: p.n } },
            );
            taken = r.end.said === "yes" ? 1 : r.end.said === "no" ? 2 : 0;
        }
        const endW = (answer: string) => Math.max(5 * U, answer.length * 9 + 22);
        const lx = Math.max(3 * U, endW(p.yes) / 2 + 0.5 * U),
            rx = Math.min(W - 3 * U, W - endW(p.no) / 2 - 0.5 * U);
        const top = 3.3 * U,
            split = 5.6 * U,
            ey = 9 * U;
        const ink = c.paper ? c.t.ink : c.t.pen;
        const road = (d: string, on: boolean) => {
            pen.path(g, d, "pencil", null, {
                strokeWidth: 12,
                stroke: c.paper ? "#E4E4E4" : "#E9EEF3",
            });
            pen.path(
                g,
                d,
                "pencil",
                null,
                on
                    ? { strokeWidth: 4, stroke: ink }
                    : { strokeWidth: 1.6, stroke: c.t["ink-soft"], strokeLineDash: [7, 6] },
            );
        };
        road(`M${cx} ${top}L${cx} ${split}`, taken !== 0 && p.lit);
        road(
            `M${cx} ${split}C${cx} ${split + 1.8 * U} ${lx} ${split + 1.2 * U} ${lx} ${ey}`,
            taken === 1 && p.lit,
        );
        road(
            `M${cx} ${split}C${cx} ${split + 1.8 * U} ${rx} ${split + 1.2 * U} ${rx} ${ey}`,
            taken === 2 && p.lit,
        );
        // the question on a sign where the path divides
        const sw = Math.max(9 * U, p.ask.length * 8.2 + 24);
        pen.path(g, roundedRect(cx - sw / 2, 0.5 * U, sw, 2.8 * U, 8), "pencil", pen.fill("glow"), {
            strokeWidth: 1.8,
        });
        patch(c, cx, 1.8 * U, sw - 16, 22);
        say(c, cx, 2.15 * U, p.ask, 15);
        pen.polygon(
            g,
            [
                [cx, split - 0.8 * U],
                [cx + 0.8 * U, split],
                [cx, split + 0.8 * U],
                [cx - 0.8 * U, split],
            ],
            "ruler",
            pen.fill("tang"),
            { strokeWidth: 1.4 },
        );
        cap(c, (cx + lx) / 2 - 0.6 * U, split + 1.6 * U, "yes", 12, "end", c.t.ink);
        cap(c, (cx + rx) / 2 + 0.6 * U, split + 1.6 * U, "no", 12, "start", c.t.ink);
        const end = (x: number, answer: string, anchor: string) => {
            const bw = endW(answer);
            pen.path(g, roundedRect(x - bw / 2, ey, bw, 2.2 * U, 8), "pencil", pen.fill("card"), {
                strokeWidth: 1.8,
            });
            say(c, x, ey + 1.45 * U, answer, 15);
            a[anchor] = [x, ey, "up"];
        };
        end(lx, p.yes, "yes");
        end(rx, p.no, "no");
        a.sign = [cx, 0.5 * U, "up"];
        return a;
    },
    describe: () =>
        "A path that splits at a signpost with a question on it, a yes way and a no way each leading to what happens at its end.",
});
