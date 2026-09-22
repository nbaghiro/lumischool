import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { PARTY, kidPicture } from "../stories/pictures";

/** What each of the six pictures shows, by its number. */
const PICTURES = ["sun", "house", "flower", "fish", "tree", "boat"] as const;

const within = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const easel = defineDrawing({
    id: "easel",
    family: "home",
    title: "Easel",
    group: "Props",
    about: "An easel standing on three legs with a picture on it and a palette of paint hanging from its peg, a blob of each colour. Which colours mix to make which is the question, and the blobs are the answer to start from.",
    params: { picture: 0 },
    settings: { picture: { kind: "whole", min: 0, max: 5 } },
    takes: [
        { label: "A house", params: { picture: 1 } },
        { label: "A flower", params: { picture: 2 } },
    ],
    box: () => ({ w: 5, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            W = 5 * U,
            base = 7.8 * U,
            a: RawAnchors = {};
        pen.line(g, W / 2, 0.3 * U, 0.6 * U, base, "pencil", {
            strokeWidth: 2.6,
            stroke: c.t.tang,
        });
        pen.line(g, W / 2, 0.3 * U, W - 0.6 * U, base, "pencil", {
            strokeWidth: 2.6,
            stroke: c.t.tang,
        });
        pen.line(g, W / 2, 0.8 * U, W / 2, base - 0.4 * U, "pencil", {
            strokeWidth: 2,
            stroke: c.t.tang,
        });
        pen.rect(g, 0.9 * U, 4.6 * U, W - 1.8 * U, 0.3 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.2,
        });
        const x = 0.7 * U,
            y = 1 * U,
            w = W - 1.4 * U,
            h = 3.6 * U;
        pen.rect(g, x, y, w, h, "pencil", pen.fill("card"), { strokeWidth: 1.8 });
        kidPicture(c, within(p.picture, 0, 5), x + 0.2 * U, y + 0.3 * U, w - 0.4 * U, h - 0.6 * U);
        a.picture = [W / 2, y, "up"];
        // the palette, each blob one marker
        const px = W - 1.3 * U,
            py = 5.9 * U;
        pen.ellipse(g, px, py, 1.9 * U, 1.2 * U, "pencil", pen.fill("card"), { strokeWidth: 1.3 });
        PARTY.forEach((m, i) => {
            const t = -Math.PI * 0.9 + i * 0.42;
            pen.circle(
                g,
                px + Math.cos(t) * 0.55 * U,
                py + Math.sin(t) * 0.32 * U + 0.05 * U,
                0.3 * U,
                "pencil",
                pen.fill(m),
                { strokeWidth: 0.8 },
            );
        });
        a.palette = [px, py - 0.6 * U, "up"];
        return a;
    },
    describe: (p) =>
        `An easel standing on three legs with a picture of a ${PICTURES[within(p.picture, 0, 5)] ?? "sun"} on it, and a palette of paint hanging from its peg with a blob of each colour.`,
    motion: { still: "A picture on an easel is looked at, and holds still to be." },
});
