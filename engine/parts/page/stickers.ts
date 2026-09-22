import { roundedRect, starPoints } from "../../ink/pen";
import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, wide } from "../lettering";

function smiley<G>(c: Ctx<G>, x: number, y: number, r: number): void {
    const { pen, g } = c;
    pen.circle(c.g, x, y, r * 2, "doodle", pen.fill("glow"), { strokeWidth: 1.8 });
    for (const s of [-1, 1])
        pen.circle(
            g,
            x + s * r * 0.34,
            y - r * 0.2,
            r * 0.22,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.6 },
        );
    pen.arc(g, x, y + r * 0.12, r * 1.1, r * 0.9, 0.35, Math.PI - 0.35, "pencil", {
        strokeWidth: 2,
    });
}

function bigTick<G>(c: Ctx<G>, x: number, y: number, r: number): void {
    c.pen.circle(c.g, x, y, r * 2, "doodle", c.pen.fill("mint"), { strokeWidth: 1.8 });
    c.pen.linear(
        c.g,
        [
            [x - r * 0.5, y],
            [x - r * 0.12, y + r * 0.42],
            [x + r * 0.55, y - r * 0.45],
        ],
        "pencil",
        { strokeWidth: 3, stroke: c.paper ? c.t.ink : c.t.ok },
    );
}

const KINDS = ["star", "smile", "tick", "word"];

/** Each sticker as it is seen, for the description. */
const seen = (kind: string, word: string): string =>
    kind === "word"
        ? `a rounded label reading ${word}`
        : kind === "smile"
          ? "a round smiling face"
          : kind === "tick"
            ? "a tick inside a circle"
            : "a star";

export const stickers = defineDrawing({
    id: "stickers",
    family: "page",
    title: "Stickers",
    group: "Marks",
    about: "The four stickers a page ever needs: a star, a smiley, a tick and a worded one. Drawn at the doodle level, because a sticker that looks measured looks printed rather than given.",
    params: { kinds: ["star", "smile", "tick", "word"], word: "Well done" },
    settings: {
        kinds: { kind: "words", of: KINDS, most: 6 },
        word: { kind: "text", most: 14 },
    },
    takes: [
        {
            label: "All four",
            params: { kinds: ["star", "smile", "tick", "word"], word: "Well done" },
        },
        { label: "Just marks", params: { kinds: ["tick", "star"], word: "" } },
        { label: "A longer word", params: { kinds: ["smile", "word"], word: "Super effort" } },
    ],
    box: (p) => ({
        w:
            p.kinds.reduce(
                (s, k) => s + (k === "word" ? Math.ceil(wide("Well done", 15) / U) + 2 : 4),
                0,
            ) + 1,
        h: 6,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            cy = 3 * U,
            a: RawAnchors = {};
        let x = U / 2;
        p.kinds.forEach((kind, i) => {
            if (kind === "word") {
                const w = (Math.ceil(wide(p.word, 15) / U) + 1) * U;
                pen.path(
                    g,
                    roundedRect(x, cy - 1.2 * U, w, 2.4 * U, 999),
                    "doodle",
                    pen.fill("berry", "solid", { hachureGap: 7 }),
                    { strokeWidth: 2 },
                );
                say(c, x + w / 2, cy + 6, p.word, 15);
                a[`sticker(${i})`] = [x + w / 2, cy - 1.2 * U, "up"];
                x += w + U;
                return;
            }
            const cx = x + 1.7 * U;
            if (kind === "smile") smiley(c, cx, cy, 1.5 * U);
            else if (kind === "tick") bigTick(c, cx, cy, 1.5 * U);
            else
                pen.polygon(g, starPoints(cx, cy, 1.6 * U), "doodle", pen.fill("glow"), {
                    strokeWidth: 2,
                });
            a[`sticker(${i})`] = [cx, cy - 1.6 * U, "up"];
            x += 4 * U;
        });
        return a;
    },
    describe: (p) => {
        const list = p.kinds.map((k) => seen(k, p.word));
        const what =
            list.length > 1
                ? `${list.slice(0, -1).join(", ")} and ${list.slice(-1).join("")}`
                : list.join("");
        return `${p.kinds.length === 1 ? "One sticker" : "A row of stickers"} on a finished page, drawn loosely: ${what}.`;
    },
});
