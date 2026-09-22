import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { writeLine } from "./lines";

const padH = (p: { items: string[]; count: number }) =>
    4 + (p.count > 0 ? Math.min(p.count, p.items.length) : p.items.length) * 2;

export const listPad = defineDrawing({
    id: "listpad",
    family: "writing",
    title: "A list on a notepad",
    group: "Inputs",
    about: "A spiral notepad with a title and one thing to a line, each with a box to tick. A list is the first thing a child writes for a reason (what to pack, what to buy), and it is the thing a sentence with commas is made from. An empty entry is a line to write on; `count` shows only the first so many.",
    params: { title: "To pack", items: ["hat", "", ""], count: 0, width: 12, ticks: true },
    settings: {
        title: { kind: "text", most: 20 },
        items: { kind: "words", most: 8 },
        count: { kind: "whole", min: 0, max: 8 },
        width: { kind: "whole", min: 8, max: 20 },
        ticks: { kind: "flag" },
    },
    takes: [
        {
            label: "To pack, two to write",
            params: { title: "To pack", items: ["hat", "", ""], count: 0, width: 12, ticks: true },
        },
        {
            label: "Five things, no boxes",
            params: {
                title: "Shopping",
                items: ["eggs", "milk", "bread", "pears", "jam"],
                count: 0,
                width: 12,
                ticks: false,
            },
        },
    ],
    box: (p) => ({ w: p.width, h: padH(p) }),
    draw: (c, p) => {
        const { pen, g } = c,
            W = p.width * U,
            H = padH(p) * U,
            a: RawAnchors = {};
        pen.path(
            g,
            roundedRect(0.4 * U, 0.7 * U, W - 0.8 * U, H - 1 * U, 8),
            "pencil",
            pen.fill("card"),
            { strokeWidth: 2 },
        );
        const rings = Math.max(3, Math.floor((p.width - 2) / 1.5));
        for (let k = 0; k < rings; k++) {
            const x = 1.4 * U + (k * (W - 2.8 * U)) / Math.max(1, rings - 1);
            pen.ellipse(g, x, 0.75 * U, 9, 18, "pencil", null, { strokeWidth: 1.6 });
        }
        say(c, W / 2, 2.6 * U, p.title, 18);
        pen.line(g, 1 * U, 3.1 * U, W - 1 * U, 3.1 * U, "ruler", {
            strokeWidth: 1,
            stroke: c.t.berry,
        });
        const shown = p.count > 0 ? p.items.slice(0, p.count) : p.items;
        shown.forEach((item, i) => {
            const y = (4.9 + i * 2) * U,
                x = p.ticks ? 2.6 * U : 1.2 * U;
            if (p.ticks)
                pen.rect(g, 1 * U, y - 0.95 * U, 0.9 * U, 0.9 * U, "ruler", null, {
                    strokeWidth: 1.3,
                });
            if (item) say(c, x, y - 0.1 * U, item, 17, "start");
            else writeLine(c, x, y, W - x - 1 * U);
            a[`item(${i})`] = [x, y - U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A spiral notepad with a title at the top and one thing to a line down it, ruled for a list${p.ticks ? ", a box to tick beside each line" : ""}.`,
});
