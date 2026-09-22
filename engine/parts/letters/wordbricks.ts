import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, ghost, say, sayOn } from "../lettering";

/** A brick is as wide as its letters, never narrower than three squares. */
const brickW = (s: string): number => Math.max(3, Math.ceil(s.length * 0.62 + 1.6));

export const wordBricks = defineDrawing({
    id: "wordbricks",
    family: "letters",
    title: "Word bricks",
    group: "Structures",
    about: "A word laid out as bricks: a root word in the middle, a prefix before it and a suffix after it, each in its own colour and each named above, with the whole word written underneath. A compound word is two root bricks. Any brick, or the whole word, can be left empty.",
    params: { bricks: ["un", "lock", "ed"], root: 1, roots: 1, blank: -1, word: "", labels: true },
    settings: {
        bricks: { kind: "words", most: 4 },
        root: { kind: "whole", min: 0, max: 3 },
        roots: { kind: "whole", min: 1, max: 2 },
        blank: { kind: "whole", min: -1, max: 3 },
        word: { kind: "text", most: 16 },
        labels: { kind: "flag" },
    },
    takes: [
        {
            label: "un + lock + ed",
            params: {
                bricks: ["un", "lock", "ed"],
                root: 1,
                roots: 1,
                blank: -1,
                word: "unlocked",
                labels: true,
            },
        },
        {
            label: "Two words make one",
            params: {
                bricks: ["cup", "cake"],
                root: 0,
                roots: 2,
                blank: -1,
                word: "cupcake",
                labels: true,
            },
        },
        {
            label: "A suffix to fill",
            params: {
                bricks: ["care", "less"],
                root: 0,
                roots: 1,
                blank: 1,
                word: "",
                labels: true,
            },
        },
        {
            label: "The whole word to write",
            params: { bricks: ["re", "fill"], root: 1, roots: 1, blank: 2, word: "", labels: true },
        },
    ],
    box: (p) => {
        const widths = p.bricks.map(brickW),
            wordRow = !!p.word || p.blank === p.bricks.length;
        return {
            w: widths.reduce((s, w) => s + w, 0) + Math.max(0, widths.length - 1) + 1,
            h: (p.labels ? 2 : 1) + 3 + (wordRow ? 3 : 0),
        };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            widths = p.bricks.map(brickW);
        const W = (widths.reduce((s, w) => s + w, 0) + Math.max(0, widths.length - 1) + 1) * U,
            top = (p.labels ? 1.6 : 0.4) * U;
        const roots = Math.max(1, Math.round(p.roots)),
            compound = roots > 1;
        let x = 0.5 * U;
        p.bricks.forEach((brick, i) => {
            const w = (widths[i] ?? 0) * U,
                role = i < p.root ? "prefix" : i < p.root + roots ? "root" : "suffix";
            const fill: Marker =
                role === "prefix"
                    ? "sky"
                    : role === "suffix"
                      ? "mint"
                      : compound && (i - p.root) % 2
                        ? "glow"
                        : "tang";
            if (p.labels)
                cap(
                    c,
                    x + w / 2,
                    1.1 * U,
                    compound && role === "root" ? "word" : role === "root" ? "root word" : role,
                    11,
                );
            if (i === p.blank) ghost(c, roundedRect(x, top, w, 2.4 * U, 4), "ruler");
            else {
                pen.path(
                    g,
                    roundedRect(x, top, w, 2.4 * U, 4),
                    "pencil",
                    pen.fill(fill, "solid", { hachureGap: 6 }),
                    { strokeWidth: 2 },
                );
                sayOn(c, x + w / 2, top + 1.6 * U, brick, 22);
            }
            a[`brick(${i})`] = [x + w / 2, top, "up"];
            if (i < p.bricks.length - 1)
                say(c, x + w + 0.5 * U, top + 1.55 * U, "+", 18, "middle", c.t["ink-soft"]);
            x += w + U;
        });
        const wordY = top + 4.4 * U;
        if (p.blank === p.bricks.length) {
            say(c, W / 2 - 4.2 * U, wordY, "=", 22);
            pen.line(g, W / 2 - 3.2 * U, wordY + 6, W / 2 + 3.6 * U, wordY + 6, "ruler", {
                strokeWidth: 2,
            });
            a.word = [W / 2, wordY + 6, "down"];
        } else if (p.word) {
            say(c, W / 2, wordY, `= ${p.word}`, 22);
            a.word = [W / 2, wordY + 6, "down"];
        }
        return a;
    },
    describe: () =>
        "A word laid out as bricks in a row, a root in the middle with a prefix before and a suffix after, each named above, the whole word underneath.",
});
