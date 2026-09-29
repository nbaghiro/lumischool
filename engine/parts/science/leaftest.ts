import { clip, plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { type Fill } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, say, soft } from "../lettering";
import { lightFill } from "./apparatus";

/**
 * Whether a part of the leaf holds starch at the end of the day, so iodine turns it blue-black: only
 * a green part (it has chlorophyll) that the light reached, on a plant left in the sun. A covered part
 * or a white part stays the iodine's brown, since the plant was kept in the dark first to use up the
 * starch it had.
 */
export const starchIn = (green: boolean, covered: boolean, sun: number): boolean =>
    green && !covered && sun > 0;

const X0 = 1.4 * U,
    X1 = 13.4 * U,
    CY = 4.6 * U,
    HALF = 2.9 * U;

const leafPath = (x0: number, x1: number, half: number): string =>
    `M${x0} ${CY}C${x0 + 0.25 * (x1 - x0)} ${CY - half * 1.3} ${x0 + 0.7 * (x1 - x0)} ${CY - half * 1.1} ${x1} ${CY}C${x0 + 0.7 * (x1 - x0)} ${CY + half * 1.1} ${x0 + 0.25 * (x1 - x0)} ${CY + half * 1.3} ${x0} ${CY}Z`;

/** Where the cover lies across the leaf, as the stretch of x it hides, or null for none. */
function coverOf(cover: number): readonly [number, number] | null {
    const k = Math.round(cover);
    if (k === 1) return [6 * U, 8.6 * U];
    if (k === 2) return [7.6 * U, X1 + 0.4 * U];
    return null;
}

function veins<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    pen.line(g, X0, CY, X1 - 0.3 * U, CY, "ruler", { strokeWidth: 1.2, stroke: c.t["ink-soft"] });
    for (let k = 1; k <= 5; k++) {
        const x = X0 + k * 1.9 * U,
            reach = HALF * (k < 4 ? 0.85 : 0.6);
        for (const s of [-1, 1])
            pen.curve(
                g,
                [
                    [x, CY],
                    [x + 0.6 * U, CY + s * reach * 0.6],
                    [x + 1.3 * U, CY + s * reach],
                ],
                "ruler",
                { strokeWidth: 0.9, stroke: c.t["ink-soft"] },
            );
    }
}

export const leaftest = defineDrawing({
    id: "leaftest",
    family: "science",
    title: "The starch test on a leaf",
    group: "Structures",
    about: "A leaf on a plant kept in the dark for two days, then partly covered and left in the sun (`sun` 1) or the dark (`sun` 0) for a day. `cover` puts a strip of foil across the middle (1), over the tip half (2) or nowhere (0), and `kind` 1 is a variegated leaf with a white edge. With `stage` 0 it is on the plant under its foil; with `stage` 1 it has been boiled, whitened and tested with iodine, which turns blue-black only where there is starch: a green part the light reached (`starchIn`). Everywhere else stays the iodine's brown. A key names the two colours, so they read in print.",
    params: { stage: 1, cover: 1, kind: 0, sun: 1 },
    settings: {
        stage: { kind: "whole", min: 0, max: 1 },
        cover: { kind: "whole", min: 0, max: 2 },
        kind: { kind: "whole", min: 0, max: 1 },
        sun: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Foil across the middle, in the sun",
            params: { stage: 0, cover: 1, kind: 0, sun: 1 },
        },
        { label: "After the iodine test", params: { stage: 1, cover: 1, kind: 0, sun: 1 } },
        { label: "A variegated leaf in the sun", params: { stage: 0, cover: 0, kind: 1, sun: 1 } },
        { label: "The variegated leaf tested", params: { stage: 1, cover: 0, kind: 1, sun: 1 } },
        { label: "Tip covered, tested", params: { stage: 1, cover: 2, kind: 1, sun: 1 } },
        { label: "Kept in the dark, tested", params: { stage: 1, cover: 1, kind: 0, sun: 0 } },
    ],
    box: () => ({ w: 19, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            tested = Math.round(p.stage) === 1,
            variegated = Math.round(p.kind) === 1,
            band = coverOf(p.cover),
            whole = leafPath(X0, X1, HALF),
            inner = leafPath(X0 + 0.9 * U, X1 - 1.6 * U, HALF * 0.62);
        const dark: Fill = c.paper
            ? pen.fill("ink", "hachure", {
                  fillStyle: "cross-hatch",
                  hachureGap: 2.6,
                  fillWeight: 0.9,
              })
            : pen.fill("ink", "solid");
        const brown: Fill = c.paper
            ? pen.fill("tang", "hachure", { fillStyle: "hachure", hachureGap: 8 })
            : pen.fill("tang", "solid");
        const paint = (green: boolean, covered: boolean): Fill =>
            tested
                ? starchIn(green, covered, p.sun)
                    ? dark
                    : brown
                : green
                  ? pen.fill("mint", "solid")
                  : pen.fill("card");
        if (tested)
            pen.rect(g, 0.3 * U, 0.6 * U, 14.4 * U, 8.2 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.4,
                stroke: c.t["ink-soft"],
            });
        else {
            pen.curve(
                g,
                [
                    [X0, CY],
                    [0.7 * U, CY + 1.8 * U],
                    [0.4 * U, 9.6 * U],
                ],
                "ruler",
                { strokeWidth: 2 },
            );
        }
        // each area is laid on white first, since a hatch lets what is under it show through
        const area = (d: string, fill: Fill, width: number): void => {
            plain(c, { kind: "path", d, fill: c.t.card, stroke: "none", width: 0 });
            pen.path(g, d, "ruler", fill, { strokeWidth: width });
        };
        area(whole, paint(!variegated, false), 1.8);
        if (variegated) area(inner, paint(true, false), 0.9);
        const leaf = clip(c, { kind: "path", d: whole });
        // on the plant the foil lies over the leaf's edge; tested, the leaf's edge is drawn last
        if (!tested) pen.path(g, whole, "ruler", null, { strokeWidth: 1.8 });
        if (band) {
            if (tested) {
                const d = `M${band[0]} ${CY - HALF * 1.2}H${band[1]}V${CY + HALF * 1.2}H${band[0]}Z`;
                plain(leaf, { kind: "path", d, fill: c.t.card, stroke: "none", width: 0 });
                pen.path(leaf.g, d, "ruler", paint(true, true), { stroke: "none" });
                veins(leaf);
            } else {
                veins(leaf);
                plain(c, {
                    kind: "rect",
                    x: band[0],
                    y: CY - HALF * 1.05,
                    w: band[1] - band[0],
                    h: HALF * 2.1,
                    fill: c.t.card,
                    stroke: "none",
                    width: 0,
                });
                pen.rect(
                    g,
                    band[0],
                    CY - HALF * 1.05,
                    band[1] - band[0],
                    HALF * 2.1,
                    "ruler",
                    lightFill(c, "ink-soft", "hachure", 5),
                    {
                        strokeWidth: 1.5,
                    },
                );
                for (let k = 1; k < 4; k++) {
                    const x = band[0] + ((band[1] - band[0]) * k) / 4;
                    pen.line(g, x, CY - HALF * 0.9, x - 0.2 * U, CY + HALF * 0.9, "ruler", {
                        strokeWidth: 0.9,
                    });
                }
                say(
                    c,
                    (band[0] + Math.min(band[1], X1)) / 2,
                    CY - HALF * 1.05 - 0.3 * U,
                    "foil",
                    13,
                );
            }
            a.cover = [(band[0] + Math.min(band[1], X1)) / 2, CY - HALF, "up"];
        }
        if (!band) veins(leaf);
        if (tested || !band) pen.path(g, whole, "ruler", null, { strokeWidth: 1.8 });
        if (tested) {
            const kx = 15.2 * U;
            pen.rect(g, kx, 2 * U, 0.9 * U, 0.9 * U, "ruler", dark, { strokeWidth: 1.2 });
            say(c, kx + 1.3 * U, 2.75 * U, "blue-", 13, "start");
            say(c, kx + 1.3 * U, 3.55 * U, "black", 13, "start");
            pen.rect(g, kx, 5 * U, 0.9 * U, 0.9 * U, "ruler", brown, { strokeWidth: 1.2 });
            say(c, kx + 1.3 * U, 5.75 * U, "brown", 13, "start");
            cap(c, 0.4 * U, 9.6 * U, "after iodine", 11, "start");
        } else if (p.sun > 0) {
            const sx = 16.8 * U,
                sy = 2 * U;
            for (let k = 0; k < 8; k++) {
                const th = (k / 8) * Math.PI * 2;
                pen.line(
                    g,
                    sx + Math.cos(th) * 1.1 * U,
                    sy + Math.sin(th) * 1.1 * U,
                    sx + Math.cos(th) * 1.55 * U,
                    sy + Math.sin(th) * 1.55 * U,
                    "ruler",
                    { strokeWidth: 1.4 },
                );
            }
            pen.circle(g, sx, sy, 1.6 * U, "ruler", lightFill(c, "glow", "solid"), {
                strokeWidth: 1.5,
            });
            soft(c, 16.8 * U, 5.2 * U, "a day", 12);
            soft(c, 16.8 * U, 6 * U, "in the sun", 12);
        } else {
            soft(c, 16.8 * U, 4.4 * U, "a day", 12);
            soft(c, 16.8 * U, 5.2 * U, "in the dark", 12);
        }
        a.leaf = [(X0 + X1) / 2, CY - HALF, "up"];
        a.tip = [X1, CY, "right"];
        return a;
    },
    describe: (p) => {
        const leaf =
            Math.round(p.kind) === 1 ? "A variegated leaf with a white edge" : "A green leaf";
        const cover = ["", " a strip of foil across its middle", " foil over its tip half"][
            Math.max(0, Math.min(2, Math.round(p.cover)))
        ];
        return Math.round(p.stage) === 1
            ? `${leaf} after the iodine test, laid flat on a white tile,${cover ? " where" + cover.replace(" a strip of foil across", " foil lay across").replace(" foil over", " foil lay over") + "," : ""} with a key of two colours.`
            : `${leaf} on its plant${cover ? " with" + cover : ""}, left for a day ${p.sun > 0 ? "in the sun" : "in the dark"}.`;
    },
    reads: true,
    motion: {
        still: "Which parts turned dark is the answer, so the leaf holds still to be compared.",
    },
});
