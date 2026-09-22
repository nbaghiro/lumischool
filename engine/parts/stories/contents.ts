import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, say, wide } from "../lettering";

export const contents = defineDrawing({
    id: "contents",
    family: "stories",
    title: "A contents page",
    group: "Structures",
    about: "The contents page of an information book: each chapter's title with a dotted line running to the page it starts on. Finding a page from a heading, and working out how long a chapter is from where the next one starts, are the first things a child does with a book that is not a story.",
    params: {
        title: "Contents",
        book: "All about hedgehogs",
        entries: [
            "Where hedgehogs live",
            "What they eat",
            "The long winter sleep",
            "Baby hedgehogs",
        ],
        pages: [2, 6, 10, 14],
        blank: -1,
    },
    settings: {
        title: { kind: "text", most: 20 },
        book: { kind: "text", most: 40 },
        entries: { kind: "words", most: 8 },
        pages: { kind: "numbers", min: 1, max: 200, most: 8 },
        blank: { kind: "whole", min: -1, max: 7 },
    },
    takes: [
        {
            label: "An information book",
            params: {
                title: "Contents",
                book: "All about hedgehogs",
                entries: [
                    "Where hedgehogs live",
                    "What they eat",
                    "The long winter sleep",
                    "Baby hedgehogs",
                ],
                pages: [2, 6, 10, 14],
                blank: -1,
            },
        },
        {
            label: "A page to find",
            params: {
                title: "Contents",
                book: "",
                entries: ["The first boats", "Sails and wind", "Lighthouses"],
                pages: [3, 9, 15],
                blank: 1,
            },
        },
    ],
    box: (p) => ({
        w: Math.max(20, Math.ceil(Math.max(0, ...p.entries.map((e) => e.length)) * 0.5 + 7)),
        h: Math.max(1, p.entries.length) * 2 + (p.book ? 6 : 5),
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const W =
                Math.max(20, Math.ceil(Math.max(0, ...p.entries.map((e) => e.length)) * 0.5 + 7)) *
                U,
            H = (Math.max(1, p.entries.length) * 2 + (p.book ? 6 : 5)) * U;
        pen.path(
            g,
            roundedRect(0.4 * U, 0.4 * U, W - 0.8 * U, H - 0.8 * U, 6),
            "pencil",
            pen.fill("card"),
            { strokeWidth: 2.2 },
        );
        let y = 2.2 * U;
        if (p.book) {
            cap(c, W / 2, 1.6 * U, p.book, 10);
            y += 1 * U;
        }
        say(c, 1.4 * U, y, p.title, 21, "start");
        pen.line(g, 1.4 * U, y + 0.6 * U, W - 1.4 * U, y + 0.6 * U, "pencil", {
            strokeWidth: 1.2,
            stroke: c.t["ink-soft"],
        });
        p.entries.forEach((entry, i) => {
            const ry = y + (2.2 + i * 2) * U,
                tx = 1.4 * U + wide(entry, 16) + 8,
                px = W - 1.4 * U;
            say(c, 1.4 * U, ry, entry, 16, "start");
            pen.line(g, tx, ry, px - 2.2 * U, ry, "ruler", {
                strokeWidth: 1.4,
                strokeLineDash: [2, 5],
                stroke: c.t["ink-soft"],
            });
            if (i === p.blank)
                pen.rect(g, px - 1.9 * U, ry - 1.2 * U, 1.9 * U, 1.6 * U, "ruler", null, {
                    strokeWidth: 1.6,
                });
            else num(c, px, ry, String(p.pages[i] ?? ""), 16, "end");
            a[`entry(${i})`] = [px - 0.9 * U, ry - 1.2 * U, "up"];
        });
        return a;
    },
    describe: () =>
        "The contents page of a book: a heading, then each chapter's title with a dotted line running across to its page number at the right.",
});
