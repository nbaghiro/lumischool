import { type RawAnchors } from "../../ink/surface";
import { U, type TokenName } from "../../paper";
import { defineDrawing } from "../drawing";
import { numOn, sayOn } from "../lettering";

type Pt = [number, number];

/** Gold, silver and bronze. On paper they are dots, hachure and cross-hatch, which is the point. */
const METALS: TokenName[] = ["glow", "grid", "tang"];

export const medalRow = defineDrawing({
    id: "medalrow",
    family: "sport",
    title: "Medals",
    group: "Props",
    about: "Medals on ribbons, each one told apart by the pattern on its ribbon and the rim of its disc as well as by colour. First, second and third are an order before they are a number, and this is that order.",
    params: { labels: ["1", "2", "3"] },
    settings: { labels: { kind: "words", most: 5 } },
    takes: [
        { label: "One, two, three", params: { labels: ["1", "2", "3"] } },
        { label: "Named", params: { labels: ["Gold", "Silver", "Bronze"] } },
        { label: "One medal", params: { labels: ["1"] } },
    ],
    box: (p) => ({ w: Math.max(1, p.labels.length) * 6 + 1, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        p.labels.forEach((label, i) => {
            const cx = (i * 6 + 3.5) * U,
                apex = 1.15 * U,
                hang = 5.3 * U,
                cy = 7.3 * U,
                kind = i % 3;
            const edge = (t: number, s: number): Pt => [
                cx + s * (0.3 + 0.78 * t) * U,
                apex + t * (hang - apex),
            ];
            pen.circle(g, cx, apex - 0.15 * U, 0.5 * U, "pencil", null, { strokeWidth: 1.6 });
            pen.polygon(
                g,
                [edge(0, -1), edge(0, 1), edge(1, 1), edge(1, -1)],
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.8 },
            );
            // One stripe, three diagonals or three bars: the ribbon says which medal it is in black ink.
            if (kind === 0) {
                pen.line(g, cx, apex + 4, cx, hang - 2, "pencil", { strokeWidth: 1.8 });
            } else if (kind === 1) {
                for (const t of [0.1, 0.4, 0.7]) {
                    const s0 = edge(t, -1),
                        s1 = edge(t + 0.2, 1);
                    pen.line(g, s0[0], s0[1], s1[0], s1[1], "pencil", { strokeWidth: 1.8 });
                }
            } else {
                for (const t of [0.25, 0.5, 0.75]) {
                    const s0 = edge(t, -1),
                        s1 = edge(t, 1);
                    pen.line(g, s0[0], s0[1], s1[0], s1[1], "pencil", { strokeWidth: 1.8 });
                }
            }
            pen.circle(
                g,
                cx,
                cy,
                3.6 * U,
                "pencil",
                pen.fill(METALS[kind], "solid", { hachureGap: 6, fillWeight: 0.7 }),
                { strokeWidth: 2.4 },
            );
            const dash = kind === 1 ? [7, 5] : kind === 2 ? [1.5, 6] : undefined;
            pen.circle(g, cx, cy, 3 * U, "pencil", null, {
                strokeWidth: 1.2,
                stroke: c.t.ink,
                strokeLineDash: dash,
            });
            if (/^[0-9]+$/.test(label)) numOn(c, cx, cy + 9, label, 24);
            else sayOn(c, cx, cy + 7, label, 16);
            a[`medal(${i + 1})`] = [cx, cy - 1.8 * U, "up"];
            a[`ribbon(${i + 1})`] = [cx, apex - 0.4 * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        p.labels.length === 1
            ? "One medal hanging on a ribbon, a yellow disc with a plain rim and a single stripe down the ribbon, its label written on the disc."
            : "Medals hanging on ribbons in a row, each disc a different metal with its own rim, the ribbons told apart by a stripe, diagonals or bars.",
    motion: { body: { is: "sway", deg: 2.4, pivot: [0.5, 0], period: 3.6 } },
});
