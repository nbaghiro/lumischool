import { roundedRect } from "../../ink/pen";
import { letter, type RawAnchors } from "../../ink/surface";
import { U, MARKERS, MARKER_WORD, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

/**
 * A closed exercise book: a card cover in one colour, cloth tape down the spine, the pages showing
 * at the edge, and a white label for a name on the front. A child's own journal on the family's
 * tablet is one of these with their name on the label; blank, the label is ruled for writing on.
 */
interface ExerciseBookParams {
    cover: Marker;
    label: string;
}

export const exerciseBook = defineDrawing<ExerciseBookParams>({
    id: "exercisebook",
    family: "home",
    title: "Exercise book",
    group: "Props",
    about: "A closed exercise book with a coloured card cover, cloth tape down its spine, the pages' edges showing and a white label on the front for a name. Books of different colours can be counted or sorted, and the name on the label says whose it is.",
    params: { cover: "glow", label: "Maya" },
    settings: { cover: { kind: "one of", of: MARKERS }, label: { kind: "text", most: 12 } },
    takes: [
        { label: "Maya's, yellow", params: { cover: "glow", label: "Maya" } },
        { label: "A family's, pink", params: { cover: "berry", label: "The Okafors" } },
        { label: "A blank label, green", params: { cover: "mint", label: "" } },
    ],
    box: () => ({ w: 9, h: 12 }),
    draw: (c, p) => {
        const { pen, g, t } = c;
        const x0 = 0.5 * U,
            y0 = 0.4 * U,
            w = 8 * U,
            hh = 11.1 * U;
        pen.path(g, roundedRect(x0 + 0.25 * U, y0 + 0.2 * U, w, hh, 5), "ruler", pen.fill("card"), {
            strokeWidth: 1.2,
            stroke: t["ink-soft"],
        });
        for (const k of [0.09, 0.16])
            pen.line(g, x0 + w + k * U, y0 + 0.5 * U, x0 + w + k * U, y0 + hh - 0.2 * U, "ruler", {
                strokeWidth: 0.8,
                stroke: t["ink-soft"],
            });
        pen.path(g, roundedRect(x0, y0, w, hh, 6), "pencil", pen.fill(p.cover, "solid"), {
            strokeWidth: 2,
        });
        pen.rect(
            g,
            x0,
            y0,
            1.1 * U,
            hh,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.7 }),
            { strokeWidth: 1.4 },
        );
        const lx = x0 + 1.9 * U,
            ly = y0 + 2.2 * U,
            lw = w - 2.7 * U,
            lh = 3.4 * U;
        pen.path(g, roundedRect(lx, ly, lw, lh, 8), "ruler", pen.fill("card"), {
            strokeWidth: 1.5,
        });
        pen.path(
            g,
            roundedRect(lx + 0.2 * U, ly + 0.2 * U, lw - 0.4 * U, lh - 0.4 * U, 6),
            "ruler",
            null,
            { strokeWidth: 0.8, stroke: t["ink-soft"] },
        );
        const name = String(p.label).trim(),
            mid = lx + lw / 2;
        if (name) {
            const size = Math.min(26, (lw - 0.9 * U) / (name.length * 0.64));
            letter(c, {
                x: mid,
                y: ly + lh / 2 + size * 0.36,
                s: name,
                face: "hand",
                weight: 700,
                size: Number(size.toFixed(1)),
                informal: 100,
                fill: t.ink,
                anchor: "middle",
            });
        } else {
            for (const y of [ly + 1.45 * U, ly + 2.45 * U])
                pen.line(g, lx + 0.6 * U, y, lx + lw - 0.6 * U, y, "ruler", {
                    strokeWidth: 1,
                    stroke: t["ink-soft"],
                });
        }
        const a: RawAnchors = {
            label: [mid, ly + lh / 2, "up"],
            cover: [x0 + 1.1 * U + (w - 1.1 * U) / 2, y0 + 8.4 * U, "up"],
            spine: [x0 + 0.55 * U, y0 + hh / 2, "left"],
        };
        return a;
    },
    describe: (p) =>
        `An exercise book with a ${MARKER_WORD[p.cover]} card cover, cloth tape down its spine, the pages' edges showing and a white label on the front ${String(p.label).trim() ? "with a name written on it" : "ruled for a name"}.`,
});
