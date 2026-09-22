import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { cap, say, soft } from "../lettering";

export const bookOpen = defineDrawing({
    id: "book",
    family: "stories",
    title: "Open book",
    group: "Props",
    about: "An open book with ruled lines, for a question about a page number or a number of pages read. The ruling is the same two-square rhythm the writing lines on a worksheet use.",
    params: { lines: 5, left: "", right: "", page: "" },
    settings: {
        lines: { kind: "whole", min: 0, max: 10 },
        left: { kind: "text", most: 40 },
        right: { kind: "text", most: 40 },
        page: { kind: "text", most: 4 },
    },
    takes: [
        { label: "Five ruled lines", params: { lines: 5, left: "", right: "", page: "" } },
        { label: "Page numbers", params: { lines: 5, left: "", right: "", page: "24" } },
        { label: "Headings", params: { lines: 4, left: "Chapter 1", right: "", page: "" } },
    ],
    box: () => ({ w: 18, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 9 * U,
            top = 1.6 * U,
            bottom = 9.6 * U,
            half = 7.6 * U;
        for (const s of [-1, 1]) {
            pen.path(
                g,
                `M${cx} ${top}C${cx + s * 2 * U} ${top - 12} ${cx + s * (half - 20)} ${top - 6} ${cx + s * half} ${top + 10}` +
                    `V${bottom - 10}C${cx + s * (half - 20)} ${bottom + 6} ${cx + s * 2 * U} ${bottom + 12} ${cx} ${bottom}Z`,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 2.4 },
            );
            for (let i = 0; i < p.lines; i++) {
                const y = top + (1.4 + i * 1.3) * U;
                pen.line(g, cx + s * 0.6 * U, y, cx + s * (half - 0.8 * U), y, "ruler", {
                    strokeWidth: 1,
                    stroke: c.t["ink-soft"],
                });
            }
        }
        pen.line(g, cx, top, cx, bottom, "pencil", { strokeWidth: 2 });
        if (p.left) say(c, cx - half / 2, top + 0.9 * U, p.left, 17);
        if (p.right) say(c, cx + half / 2, top + 0.9 * U, p.right, 17);
        if (p.page) {
            soft(c, cx - half / 2, bottom - 0.4 * U, p.page, 14);
            soft(c, cx + half / 2, bottom - 0.4 * U, String(Number(p.page) + 1), 14);
        }
        cap(c, cx, 11 * U, "page", 12);
        return {
            spine: [cx, top, "up"],
            left: [cx - half / 2, top, "up"],
            right: [cx + half / 2, top, "up"],
        };
    },
    describe: () =>
        "An open book seen from above, two pages with ruled lines across them and a fold down the middle, a page number in each corner when there is one.",
    motion: { still: STILL.text },
});
