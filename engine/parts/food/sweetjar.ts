import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U, MARKERS, MARKER_WORD, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

interface SweetJarParams {
    count: number;
    color: Marker;
}

export const sweetJar = defineDrawing<SweetJarParams>({
    id: "sweetjar",
    family: "food",
    title: "Jar of sweets",
    group: "Props",
    about: "A lidded jar with countable sweets in it. A jar is the container a story uses when the number is bigger than a plate's worth and still small enough to count.",
    params: { count: 12, color: "berry" },
    settings: { count: { kind: "whole", min: 1, max: 24 }, color: { kind: "one of", of: MARKERS } },
    takes: [
        { label: "Twelve sweets", params: { count: 12, color: "berry" } },
        { label: "A handful", params: { count: 5, color: "sky" } },
        { label: "Nearly full", params: { count: 20, color: "mint" } },
    ],
    box: () => ({ w: 8, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 4 * U,
            top = 2.6 * U,
            bottom = 9.4 * U,
            half = 2.4 * U,
            a: RawAnchors = {};
        pen.path(
            g,
            `M${cx - half} ${top}V${bottom - 16}Q${cx - half} ${bottom} ${cx - half + 16} ${bottom}` +
                `H${cx + half - 16}Q${cx + half} ${bottom} ${cx + half} ${bottom - 16}V${top}`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 2.4 },
        );
        const per = 4;
        for (let i = 0; i < p.count; i++) {
            const row = Math.floor(i / per),
                inRow = Math.min(per, p.count - row * per);
            const x = cx + ((i % per) - (inRow - 1) / 2) * 1.1 * U,
                y = bottom - 0.9 * U - row * 1.05 * U;
            pen.circle(g, x, y, 19, "pencil", pen.fill(p.color), { strokeWidth: 1.3 });
        }
        pen.path(
            g,
            roundedRect(cx - half - 8, top - 22, half * 2 + 16, 24, 6),
            "pencil",
            pen.fill("mint", "solid", { hachureGap: 6 }),
            { strokeWidth: 2.2 },
        );
        pen.path(
            g,
            roundedRect(cx - 0.9 * U, top - 34, 1.8 * U, 16, 5),
            "pencil",
            pen.fill("mint", "solid", { hachureGap: 6 }),
            { strokeWidth: 1.8 },
        );
        a.lid = [cx, top - 34, "up"];
        a.jar = [cx, top, "up"];
        return a;
    },
    describe: (p) =>
        `A lidded glass jar with round ${MARKER_WORD[p.color]} sweets stacked inside it in rows, its green lid on top.`,
    motion: { body: { is: "wiggle", deg: 3, period: 5.2 } },
});
