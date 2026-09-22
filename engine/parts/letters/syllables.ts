import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { glyph, CELL, letters } from "./glyphs";

export const syllableArcs = defineDrawing({
    id: "syllables",
    family: "letters",
    title: "Syllable arcs",
    group: "Structures",
    about: "An arc under each beat of a word, the way a child claps it. The arcs are drawn under the letters they cover, so where one syllable ends and the next begins is part of the drawing.",
    params: { parts: ["but", "ter", "fly"], count: true },
    settings: { parts: { kind: "words", most: 6 }, count: { kind: "flag" } },
    takes: [
        { label: "but-ter-fly", params: { parts: ["but", "ter", "fly"], count: true } },
        { label: "rab-bit", params: { parts: ["rab", "bit"], count: true } },
        { label: "One beat", params: { parts: ["dog"], count: true } },
        { label: "No count", params: { parts: ["el", "e", "phant"], count: false } },
    ],
    box: (p) => ({ w: Math.ceil(p.parts.join("").length * CELL) + 2, h: p.count ? 8 : 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            word = p.parts.join(""),
            x0 = U;
        const L = letters(word, x0),
            y = 3.4 * U,
            a: RawAnchors = {};
        Array.from(word).forEach((ch, i) => glyph(c, L.at(i), y, ch, 34));
        let i = 0;
        p.parts.forEach((part, k) => {
            // A one-letter syllable would collapse into a V, so every arc gets a floor on its width.
            const a0 = L.at(i) - 0.5 * CELL * U + 4,
                a1 = L.at(i + part.length - 1) + 0.5 * CELL * U - 4;
            const mid = (a0 + a1) / 2,
                half = Math.max(0.55 * U, (a1 - a0) / 2);
            const from = mid - half,
                to = mid + half,
                by = y + 0.5 * U;
            pen.curve(
                g,
                [
                    [from, by],
                    [mid, by + 0.9 * U],
                    [to, by],
                ],
                "pencil",
                { strokeWidth: 2.2, stroke: c.t.pen },
            );
            a[`part(${k})`] = [mid, by + 0.9 * U, "down"];
            i += part.length;
        });
        if (p.count)
            num(
                c,
                x0 + L.width / 2,
                7.4 * U,
                `${p.parts.length} beat${p.parts.length === 1 ? "" : "s"}`,
                16,
            );
        a.word = [x0 + L.width / 2, y - 1.2 * U, "up"];
        return a;
    },
    describe: () =>
        "A word written large with an arc drawn under each beat of it, the arcs meeting where one syllable ends and the next begins.",
});
