import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { loop } from "../marks";

export const hundredSquare = defineDrawing({
    id: "hundred",
    family: "counting",
    title: "Hundred square",
    group: "Structures",
    about: "Rows of ten. `add` draws the jumps, down for tens and across for ones; hidden cells are blank.",
    params: { from: 1, to: 60, start: 23, add: 21, hide: [44] as number[] },
    settings: {
        from: { kind: "whole", min: 1, max: 100 },
        to: { kind: "whole", min: 1, max: 100 },
        start: { kind: "whole", min: 0, max: 100 },
        add: { kind: "whole", min: 0, max: 99 },
        hide: { kind: "numbers", min: 1, max: 100, most: 20 },
    },
    takes: [
        {
            label: "1 to 60, a jump of 21",
            params: { from: 1, to: 60, start: 23, add: 21, hide: [44] },
        },
        {
            label: "1 to 30, a jump of 12",
            params: { from: 1, to: 30, start: 5, add: 12, hide: [17] },
        },
        { label: "41 to 100", params: { from: 41, to: 100, start: 55, add: 30, hide: [85] } },
        { label: "Plain, 1 to 20", params: { from: 1, to: 20, start: 0, add: 0, hide: [] } },
    ],
    box: (p) => ({ w: 22, h: (Math.ceil(p.to / 10) - Math.floor((p.from - 1) / 10)) * 2 + 2 }),
    draw: (c, p) => {
        const s = 2 * U,
            row0 = Math.floor((p.from - 1) / 10),
            a: RawAnchors = {};
        const at = (n: number): [number, number] => [
            U + ((n - 1) % 10) * s,
            U + (Math.floor((n - 1) / 10) - row0) * s,
        ];
        for (let n = p.from; n <= p.to; n++) {
            const [x, y] = at(n);
            c.pen.rect(c.g, x, y, s, s, "ruler", null, { strokeWidth: 1.2 });
            if (!p.hide.includes(n)) say(c, x + s / 2, y + s / 2 + 6, String(n), 15);
            a[`cell(${n})`] = [x + s / 2, y, "up"];
        }
        if (p.start >= p.from && p.start <= p.to) {
            const [x, y] = at(p.start);
            loop(c, x + s / 2, y + s / 2, s + 6, s + 4);
        }
        // One pencil path for the whole jump: straight down for the tens, then across for the ones.
        // Cell to cell arrows would be shorter than their own arrowheads.
        const tens = Math.min(Math.floor(p.add / 10), Math.floor((p.to - p.start) / 10));
        const ones = Math.min(p.add % 10, p.to - p.start - tens * 10);
        if (p.add > 0 && tens + ones > 0) {
            const mid = p.start + tens * 10,
                end = mid + ones;
            const centre = (n: number): [number, number] => [at(n)[0] + s / 2, at(n)[1] + s / 2];
            const path: [number, number][] = [centre(p.start), centre(mid), centre(end)];
            c.pen.linear(c.g, path, "pencil", { stroke: c.t.pen, strokeWidth: 2 });
            const [px, py] = path[ones ? 1 : 0] ?? [0, 0],
                [qx, qy] = centre(end);
            const angle = Math.atan2(qy - py, qx - px);
            for (const turn of [-0.5, 0.5]) {
                const b = angle + Math.PI + turn;
                c.pen.line(c.g, qx, qy, qx + 12 * Math.cos(b), qy + 12 * Math.sin(b), "pencil", {
                    stroke: c.t.pen,
                    strokeWidth: 2,
                });
            }
        }
        return a;
    },
    describe: (p) =>
        `A hundred square in rows of ten with a number in each cell${p.hide.length > 0 ? " and some cells left blank" : ""}${p.add > 0 ? ", one cell ringed and a pencil arrow jumping from it" : ", one cell ringed"}.`,
});
