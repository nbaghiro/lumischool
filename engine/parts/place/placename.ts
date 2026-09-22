import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";
import { loop } from "../marks";
import { charCells, columns } from "./columns";

export const placeName = defineDrawing({
    id: "placename",
    family: "place",
    title: "What the digit is worth",
    group: "Structures",
    about: "One number written large with a single digit ringed and its value named underneath. The point of the drawing is that the 4 in 2405 is four hundred, not four.",
    params: { value: "2405", ring: 1 },
    settings: { value: { kind: "text", most: 8 }, ring: { kind: "whole", min: 0, max: 7 } },
    takes: [
        { label: "The 4 in 2405", params: { value: "2405", ring: 1 } },
        { label: "The 3 in 37", params: { value: "37", ring: 0 } },
        { label: "A tenth", params: { value: "5.6", ring: 2 } },
    ],
    box: (p) => ({ w: Math.max(9, charCells(p.value).reduce((s, n) => s + n, 0) + 4), h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            chars = Array.from(p.value),
            cells = charCells(p.value);
        const total = cells.reduce((s, n) => s + n, 0),
            w = Math.max(9, total + 4);
        const y = 3 * U,
            a: RawAnchors = {};
        // Where each digit sits, and which column of the chart it belongs to: the point takes a cell
        // of its own but is not a place.
        const at: number[] = [];
        let x = ((w - total) / 2) * U,
            col = 0;
        chars.forEach((ch, i) => {
            const cw = (cells[i] ?? 3) * U,
                cx = x + cw / 2;
            num(c, cx, y, ch, ch === "." ? 30 : 40);
            if (ch !== ".") {
                at[col] = cx;
                a[`digit(${col})`] = [cx, y - 1.6 * U, "up"];
                col++;
            }
            x += cw;
        });
        const cols = columns(p.value);
        const i = Math.min(Math.max(p.ring, 0), cols.length - 1),
            cx = at[i] ?? 0,
            col_ = cols[i] ?? { digit: "", head: "", part: false };
        loop(c, cx, y - 13, 2.4 * U, 3 * U);
        const worth = col_.part
            ? `${col_.digit} ${col_.head.toLowerCase()}`
            : `${col_.digit}${"0".repeat(cols.filter((q) => !q.part).length - 1 - i)}`;
        pen.line(g, cx, y + 0.7 * U, cx, y + 1.5 * U, "pencil", {
            strokeWidth: 1.6,
            stroke: c.t.pen,
        });
        say(c, cx, y + 2.2 * U, `worth ${worth}`, 17, "middle", c.t.pen);
        a.worth = [cx, y + 2.4 * U, "down"];
        return a;
    },
    describe: () =>
        "A number written large with one digit ringed in pencil, a line down from the ring and the digit's worth written under it.",
});
