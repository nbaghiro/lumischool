import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

/** The tablet, its stand and its screen, never whose tiles they are. */
function describeTablet(p: { tiles: number; stand: number }): string {
    const n = Math.max(0, Math.min(4, Math.round(p.tiles)));
    const on = `A tablet ${p.stand > 0 ? "on a stand" : "lying flat"} with a round button under its screen, `;
    if (n === 0) return `${on}squared paper on the screen.`;
    if (n === 1) return `${on}a tile on the screen, a coloured picture above a line.`;
    return `${on}tiles side by side on the screen, each a coloured picture above a line.`;
}

const MARKS: Marker[] = ["glow", "mint", "berry", "sky"];

/**
 * The family's tablet, standing on its stand, with a tile on its screen for each child who uses it.
 * A tile is a picture above a line for a name, which is the switcher a child opens it to; with no
 * tiles the screen is squared paper, which is what a child sees once their journal is open.
 */
export const familyTablet = defineDrawing({
    id: "tablet",
    family: "home",
    title: "Family tablet",
    group: "Props",
    about: "A tablet on a stand with a round button under its screen. Its screen shows a tile for each child who uses it, a coloured picture above a line for a name, from one to four, or squared paper with none. The tiles can be counted, and a question can ask whose turn it is.",
    params: { tiles: 3, stand: 1 },
    settings: {
        tiles: { kind: "whole", min: 0, max: 4 },
        stand: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Three children", params: { tiles: 3, stand: 1 } },
        { label: "Two children, lying flat", params: { tiles: 2, stand: 0 } },
        { label: "A journal open", params: { tiles: 0, stand: 1 } },
    ],
    box: () => ({ w: 10, h: 8 }),
    draw: (c, p) => {
        const { pen, g, t } = c;
        const n = Math.max(0, Math.min(4, Math.round(p.tiles)));
        const x = 0.5 * U,
            y = 0.4 * U,
            w = 9 * U,
            h = 6.2 * U,
            sx = x + 0.55 * U,
            sy = y + 0.5 * U,
            sw = w - 1.1 * U,
            sh = h - 1.3 * U;
        if (p.stand > 0) {
            pen.polygon(
                g,
                [
                    [3.2 * U, y + h - 0.4 * U],
                    [2.4 * U, 7.7 * U],
                    [7.6 * U, 7.7 * U],
                    [6.8 * U, y + h - 0.4 * U],
                ],
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                { strokeWidth: 1.5 },
            );
        }
        pen.path(g, roundedRect(x, y, w, h, 12), "ruler", pen.fill("card"), { strokeWidth: 2.4 });
        pen.path(g, roundedRect(sx, sy, sw, sh, 5), "ruler", null, { strokeWidth: 1.4 });
        pen.circle(g, x + w / 2, y + h - 0.42 * U, 0.42 * U, "ruler", null, { strokeWidth: 1.2 });
        const a: RawAnchors = {
            screen: [x + w / 2, sy + sh / 2, "up"],
            button: [x + w / 2, y + h - 0.2 * U, "down"],
        };
        if (!n) {
            for (let gx = sx + 0.5 * U; gx < sx + sw - 2; gx += 0.5 * U)
                pen.line(g, gx, sy + 3, gx, sy + sh - 3, "ruler", {
                    strokeWidth: 0.6,
                    stroke: t.grid,
                });
            for (let gy = sy + 0.5 * U; gy < sy + sh - 2; gy += 0.5 * U)
                pen.line(g, sx + 3, gy, sx + sw - 3, gy, "ruler", {
                    strokeWidth: 0.6,
                    stroke: t.grid,
                });
            return a;
        }
        const tw = Math.min(1.9 * U, (sw - 0.5 * U) / n - 0.25 * U),
            th = 2.8 * U,
            gap = (sw - n * tw) / (n + 1);
        for (let i = 0; i < n; i++) {
            const tx = sx + gap + i * (tw + gap),
                ty = sy + (sh - th) / 2;
            pen.path(g, roundedRect(tx, ty, tw, th, 5), "ruler", pen.fill("card"), {
                strokeWidth: 1.3,
            });
            pen.circle(
                g,
                tx + tw / 2,
                ty + 1.05 * U,
                Math.min(tw * 0.62, 1.2 * U),
                "pencil",
                pen.fill(MARKS[i % MARKS.length] ?? "glow"),
                { strokeWidth: 1.3 },
            );
            pen.line(g, tx + 0.3 * U, ty + 2.25 * U, tx + tw - 0.3 * U, ty + 2.25 * U, "ruler", {
                strokeWidth: 1.3,
            });
            a[`tile${i + 1}`] = [tx + tw / 2, ty, "up"];
        }
        return a;
    },
    describe: (p) => describeTablet(p),
});
