import { letter, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch } from "../lettering";
import { loop } from "../marks";
import { parse, run, upTo, world } from "../../coding";

/** What a list holds once the program has run, or up to step `upto`; empty when it never makes one. */
export function listOf(name: string, code: readonly string[], upto = -1): number[] {
    const r = run(parse(code), world({ cols: 99, rows: 99, start: { col: 50, row: 50 } }));
    return upTo(r, upto).state.lists[name] ?? [];
}

/** A cell is three squares wide, so a number of three figures fits in it at the size a child reads. */
const CELL = 3;
const tagWidth = (name: string): number => Math.max(3, Math.ceil(name.length * 0.55 + 1.6));

interface ListBoxParams {
    name: string;
    code: string[];
    upto: number;
    blank: number;
    mark: number;
    crossed: number;
}

export const listBox = defineDrawing<ListBoxParams>({
    id: "listbox",
    family: "coding",
    title: "A list a program keeps",
    group: "Structures",
    about: "A list a program keeps under one name: a tag with the name, and a row of cells numbered from 1, each holding one number. The numbers come from running `code`, so the cells can never show a list the program would not make; `upto` stops partway, `blank` leaves one item for a child to write, `mark` rings one item, and `crossed` crosses out the items from the left that a search has already looked at.",
    params: {
        name: "cargo",
        code: ["set cargo to list 4, 7, 2, 5"],
        upto: -1,
        blank: 0,
        mark: 0,
        crossed: 0,
    },
    settings: {
        name: { kind: "text", most: 10 },
        code: { kind: "words", most: 12 },
        upto: { kind: "whole", min: -1, max: 40 },
        blank: { kind: "whole", min: 0, max: 9 },
        mark: { kind: "whole", min: 0, max: 9 },
        crossed: { kind: "whole", min: 0, max: 9 },
    },
    takes: [
        {
            label: "Four crates of cargo",
            params: {
                name: "cargo",
                code: ["set cargo to list 4, 7, 2, 5"],
                upto: -1,
                blank: 0,
                mark: 0,
                crossed: 0,
            },
        },
        {
            label: "A shelf searched from the left",
            params: {
                name: "shelf",
                code: ["set shelf to list 12, 18, 25, 31, 40, 47"],
                upto: -1,
                blank: 0,
                mark: 4,
                crossed: 3,
            },
        },
        {
            label: "One added, last one blank",
            params: {
                name: "stars",
                code: ["set stars to list 3, 5", "add 8 to stars"],
                upto: -1,
                blank: 3,
                mark: 0,
                crossed: 0,
            },
        },
    ],
    box: (p) => ({
        w: tagWidth(p.name) + Math.max(1, listOf(p.name, p.code, p.upto).length) * CELL + 1,
        h: 5,
    }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c;
        const items = listOf(p.name, p.code, p.upto);
        const tw = tagWidth(p.name) * U,
            top = 1.6 * U,
            h = CELL * U;
        // the name's tag, the same sky tag the box of one number wears
        pen.path(
            g,
            roundedRect(0.3 * U, top + 0.7 * U, tw - 0.9 * U, 1.6 * U, 5),
            "ruler",
            pen.fill("sky"),
            {
                strokeWidth: 1.4,
            },
        );
        patch(c, 0.3 * U + (tw - 0.9 * U) / 2, top + 1.5 * U, p.name.length * 10 + 8, 14);
        letter(c, {
            x: 0.3 * U + (tw - 0.9 * U) / 2,
            y: top + 1.5 * U + 5,
            s: p.name,
            face: "mono",
            weight: 700,
            size: 15,
            fill: c.t.ink,
            anchor: "middle",
        });
        pen.line(g, tw - 0.6 * U, top + 1.5 * U, tw, top + 1.5 * U, "ruler", { strokeWidth: 1.4 });
        if (!items.length)
            pen.rect(g, tw, top, CELL * U, h, "ruler", null, {
                strokeWidth: 1.6,
                strokeLineDash: [6, 5],
                stroke: c.t["ink-soft"],
            });
        items.forEach((v, i) => {
            const x = tw + i * CELL * U,
                cx = x + (CELL * U) / 2;
            pen.rect(g, x, top, CELL * U, h, "pencil", pen.fill("card"), { strokeWidth: 2 });
            cap(c, cx, top - 0.4 * U, String(i + 1), 11);
            if (p.blank === i + 1)
                pen.rect(g, cx - 1 * U, top + 0.5 * U, 2 * U, 2 * U, "ruler", null, {
                    strokeWidth: 1.6,
                    strokeLineDash: [6, 5],
                    stroke: c.t["ink-soft"],
                });
            else num(c, cx, top + h / 2 + 8, String(v), 22);
            if (i < p.crossed)
                pen.line(
                    g,
                    x + 0.4 * U,
                    top + h - 0.4 * U,
                    x + CELL * U - 0.4 * U,
                    top + 0.4 * U,
                    "pencil",
                    {
                        strokeWidth: 2,
                        stroke: c.paper ? c.t.ink : "#C2185B",
                    },
                );
            if (p.mark === i + 1) loop(c, cx, top + h / 2, CELL * U + 6, h + 8);
            a[`item${i + 1}`] = [cx, top + h + 0.2 * U, "down"];
        });
        a.name = [0.3 * U + (tw - 0.9 * U) / 2, top + 2.4 * U, "down"];
        return a;
    },
    describe: (p) => {
        const items = listOf(p.name, p.code, p.upto);
        return `A list called ${p.name}: a tag with its name and a row of ${items.length} numbered cells, each holding one number${p.crossed ? `, the first ${p.crossed} crossed out` : ""}.`;
    },
});
