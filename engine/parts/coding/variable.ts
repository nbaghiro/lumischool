import { letter, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch } from "../lettering";
import { parse, run, upTo, world } from "../../coding";
import { arrowIcon } from "./listing";

/** Every number a name held, in order, as the program sets and changes it. */
function historyOf(name: string, code: readonly string[], upto = -1): number[] {
    const r = run(parse(code), world({ cols: 1, rows: 1 })),
        part = upTo(r, upto),
        out: number[] = [];
    const names = new RegExp(`\\b${name}\\b`, "i");
    for (const f of part.frames) {
        const v = f.state.vars[name];
        if (
            v !== undefined &&
            (f.kind === "set" || f.kind === "change") &&
            names.test(code[f.line - 1] ?? "")
        )
            out.push(v);
    }
    return out;
}

export const variable = defineDrawing({
    id: "variable",
    family: "coding",
    title: "A name holding a number",
    group: "Structures",
    about: "A box with a name on its tag, holding the number a program has put in it, and the numbers it held before, crossed out in order along a strip beside it, because a name holds one number at a time and the old one is gone. The numbers come from running `code`, so the box can never show a number the program would not give; `upto` stops partway and `blank` leaves the last number for a child to write.",
    params: {
        name: "n",
        code: ["set n to 4", "add 3 to n", "add 3 to n"],
        upto: -1,
        blank: false,
        history: true,
    },
    settings: {
        name: { kind: "text", most: 8 },
        code: { kind: "words", most: 8 },
        upto: { kind: "whole", min: -1, max: 8 },
        blank: { kind: "flag" },
        history: { kind: "flag" },
    },
    takes: [
        {
            label: "4, then 7, then 10",
            params: {
                name: "n",
                code: ["set n to 4", "add 3 to n", "add 3 to n"],
                upto: -1,
                blank: false,
                history: true,
            },
        },
        {
            label: "Gems, last one blank",
            params: {
                name: "gems",
                code: ["set gems to 0", "add 2 to gems", "add 2 to gems", "take 1 from gems"],
                upto: -1,
                blank: true,
                history: true,
            },
        },
    ],
    box: (p) => {
        const hist = historyOf(p.name, p.code, p.upto);
        return { w: 8 + (p.history ? Math.max(0, hist.length - 1) * 3 + 1 : 0), h: 8 };
    },
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c;
        const hist = historyOf(p.name, p.code, p.upto),
            now = hist[hist.length - 1];
        // the box, drawn a little in perspective so it reads as something that holds
        const x = 0.8 * U,
            y = 2.2 * U,
            w = 6 * U,
            h = 4.6 * U;
        pen.polygon(
            g,
            [
                [x, y],
                [x + w, y],
                [x + w + 0.8 * U, y - 0.8 * U],
                [x + 0.8 * U, y - 0.8 * U],
            ],
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.6 },
        );
        pen.polygon(
            g,
            [
                [x + w, y],
                [x + w + 0.8 * U, y - 0.8 * U],
                [x + w + 0.8 * U, y + h - 0.8 * U],
                [x + w, y + h],
            ],
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.6 },
        );
        pen.rect(g, x, y, w, h, "pencil", pen.fill("card"), { strokeWidth: 2 });
        // the tag with its name
        pen.path(
            g,
            roundedRect(
                x + 0.6 * U,
                y + h - 0.5 * U,
                Math.max(2.4 * U, p.name.length * 11 + 16),
                1.5 * U,
                5,
            ),
            "ruler",
            pen.fill("sky"),
            { strokeWidth: 1.4 },
        );
        patch(
            c,
            x + 0.6 * U + Math.max(2.4 * U, p.name.length * 11 + 16) / 2,
            y + h + 0.2 * U,
            p.name.length * 10 + 8,
            14,
        );
        letter(c, {
            x: x + 0.6 * U + Math.max(2.4 * U, p.name.length * 11 + 16) / 2,
            y: y + h + 0.55 * U,
            s: p.name,
            face: "mono",
            weight: 700,
            size: 15,
            fill: c.t.ink,
            anchor: "middle",
        });
        if (p.blank || now === undefined)
            pen.rect(g, x + w / 2 - 1.3 * U, y + 1.1 * U, 2.6 * U, 2.2 * U, "ruler", null, {
                strokeWidth: 1.6,
                strokeLineDash: [6, 5],
                stroke: c.t["ink-soft"],
            });
        else num(c, x + w / 2, y + h / 2 + 11, String(now), 34);
        a.value = [x + w / 2, y + 0.5 * U, "up"];
        if (p.history && hist.length > 1) {
            cap(c, 8.5 * U, 1.2 * U, "before", 10, "start");
            hist.slice(0, -1).forEach((v, i) => {
                const hx = 8.8 * U + i * 3 * U,
                    hy = 3.2 * U;
                num(c, hx + U, hy + U, String(v), 20, "middle", c.t["ink-soft"]);
                pen.line(g, hx + 0.2 * U, hy + 1.3 * U, hx + 1.8 * U, hy + 0.2 * U, "pencil", {
                    strokeWidth: 2,
                    stroke: c.paper ? c.t.ink : "#C2185B",
                });
                if (i < hist.length - 2)
                    arrowIcon(c, hx + 2.5 * U, hy + 0.7 * U, 0, 10, 1.6, c.t["ink-soft"]);
            });
        }
        return a;
    },
    describe: (p) =>
        `A box with a name on its tag, holding the number a program has put in it${p.history ? ", and a strip beside it of the numbers it held before, crossed out" : ""}.`,
});
