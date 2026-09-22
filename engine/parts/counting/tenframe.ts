import { part, type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

interface TenFrameParams {
    count: number;
    color: Marker;
}

export const tenFrame = defineDrawing<TenFrameParams>({
    id: "tenframe",
    family: "counting",
    title: "Ten frame",
    group: "Structures",
    about: "Each cell is 2 by 2 squares, so the frame sits exactly on the paper grid.",
    params: { count: 7, color: "berry" },
    settings: { count: { kind: "whole", min: 0, max: 10 }, color: { kind: "one of", of: MARKERS } },
    takes: [
        { label: "7 counters", params: { count: 7, color: "berry" } },
        { label: "3, in sky", params: { count: 3, color: "sky" } },
        { label: "Full frame", params: { count: 10, color: "mint" } },
        { label: "Empty frame", params: { count: 0, color: "tang" } },
    ],
    box: () => ({ w: 12, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = 20,
            y0 = 20,
            s = 40,
            a: RawAnchors = {};
        pen.rect(g, x0, y0, 5 * s, 2 * s, "ruler", null, { strokeWidth: 2.2 });
        for (let i = 1; i < 5; i++)
            pen.line(g, x0 + i * s, y0, x0 + i * s, y0 + 2 * s, "ruler", { strokeWidth: 1.5 });
        pen.line(g, x0, y0 + s, x0 + 5 * s, y0 + s, "ruler", { strokeWidth: 1.5 });
        for (let i = 0; i < 10; i++) {
            const x = x0 + (i % 5) * s + s / 2,
                y = y0 + Math.floor(i / 5) * s + s / 2;
            if (i < p.count)
                pen.circle(
                    part(c, "counter", [x, y + 14]).g,
                    x,
                    y,
                    28,
                    "pencil",
                    pen.fill(p.color),
                );
            a[`cell(${i})`] = [x, y, i < 5 ? "up" : "down"];
        }
        return a;
    },
    describe: (p) =>
        `A ten frame, two rows of five cells ruled in ink${p.count > 0 ? `, with ${MARKER_WORD[p.color]} counters filling the cells from the top left` : ", every cell empty and nothing in it"}.`,
    motion: {
        parts: {
            counter: { is: "hop", lift: 4, squash: 0.1, period: 5.2, wave: 0.11, free: true },
        },
    },
});
