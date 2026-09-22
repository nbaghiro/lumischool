import { type Ctx, type RawAnchors } from "../../ink/surface";
import { type Fill } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, penned, say } from "../lettering";
import { type Pt } from "./optics";

/** The colours out of a prism, from the least bent to the most, with the letter each is written as. */
export const SPECTRUM = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"] as const;

const BAND: Record<(typeof SPECTRUM)[number], { fill: string }> = {
    red: { fill: "#E5534B" },
    orange: { fill: "tang" },
    yellow: { fill: "glow" },
    green: { fill: "mint" },
    blue: { fill: "sky" },
    indigo: { fill: "#6F79D6" },
    violet: { fill: "#A47AD8" },
};

/** A band's fill: its colour on screen, and on paper a hatch at its own angle so neighbours stay apart. */
function bandFill<G>(c: Ctx<G>, i: number): Fill {
    const f = BAND[SPECTRUM[i] ?? "red"].fill;
    if (c.paper)
        return {
            fill: c.t.ink,
            fillStyle: i % 3 === 2 ? "cross-hatch" : "hachure",
            hachureAngle: -60 + i * 22,
            hachureGap: 4.5,
            fillWeight: 0.7,
        };
    return f.startsWith("#")
        ? { fill: f, fillStyle: "solid" }
        : c.pen.fill(f as "tang" | "glow" | "mint" | "sky");
}

export const prism = defineDrawing({
    id: "prism",
    family: "science",
    title: "Prism and rainbow",
    group: "Structures",
    about: "A narrow beam of white light going into a glass prism and coming out as the colours of the rainbow on a screen, red at the top because it is bent least and violet at the bottom because it is bent most. The seven bands are lettered, so the order is readable in print, and one can be left blank for a question.",
    params: { letters: 1, blank: -1 },
    settings: {
        letters: { kind: "whole", min: 0, max: 1 },
        blank: { kind: "whole", min: -1, max: 6 },
    },
    takes: [
        { label: "White light into colours", params: { letters: 1, blank: -1 } },
        { label: "One colour to name", params: { letters: 1, blank: 3 } },
    ],
    box: () => ({ w: 21, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        // the slit the light comes through, then the white beam to the prism's face
        pen.rect(g, 0.4 * U, 3.4 * U, 0.5 * U, 3.2 * U, "ruler", pen.fill("ink-soft"), {
            strokeWidth: 1.6,
        });
        const ax = 8 * U,
            ay = 1.6 * U,
            side = 5.6 * U,
            bl: Pt = [ax - side / 2, ay + side * 0.866],
            br: Pt = [ax + side / 2, ay + side * 0.866];
        const hit: Pt = [ax - side / 4 - 0.1 * U, (ay + bl[1]) / 2];
        pen.polygon(
            g,
            [
                [0.9 * U, 4.85 * U],
                [hit[0], hit[1] - 0.12 * U],
                [hit[0], hit[1] + 0.12 * U],
                [0.9 * U, 5.15 * U],
            ],
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.4 },
        );
        pen.polygon(
            g,
            [[ax, ay], br, bl],
            "ruler",
            pen.fill("sky", "hachure", { hachureGap: 7, fillWeight: 0.5 }),
            { strokeWidth: 2.2 },
        );
        // inside the glass the beam bends down towards the base, then fans out as it leaves
        const exit: Pt = [ax + side / 4 + 0.2 * U, (ay + br[1]) / 2 + 0.55 * U];
        pen.line(g, hit[0], hit[1], exit[0], exit[1], "ruler", { strokeWidth: 1.6 });
        const sx = 17.4 * U,
            top = 2.4 * U,
            band = 0.95 * U;
        for (let i = 0; i < SPECTRUM.length; i++) {
            const y0 = top + i * band,
                y1 = y0 + band,
                e0 = exit[1] - 0.15 * U + i * 0.05 * U,
                e1 = e0 + 0.05 * U;
            const blank = Math.round(p.blank) === i;
            pen.polygon(
                g,
                [
                    [exit[0], e0],
                    [sx, y0],
                    [sx, y1],
                    [exit[0], e1],
                ],
                "ruler",
                blank ? pen.fill("card") : bandFill(c, i),
                { strokeWidth: 0.9 },
            );
            if (p.letters > 0 || blank) {
                const ly = (y0 + y1) / 2 + 5;
                if (blank) penned(c, sx + 1.4 * U, ly + 1, "?", 18);
                else say(c, sx + 1.4 * U, ly, (SPECTRUM[i] ?? "")[0]?.toUpperCase() ?? "", 13);
            }
            a[`band(${i})`] = [sx, (y0 + y1) / 2, "right"];
        }
        pen.rect(
            g,
            sx,
            top - 0.5 * U,
            0.4 * U,
            SPECTRUM.length * band + 1 * U,
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.8 },
        );
        cap(c, sx + 0.2 * U, top + SPECTRUM.length * band + 1.4 * U, "screen", 10);
        a.prism = [ax, ay, "up"];
        return a;
    },
    describe: () =>
        "A narrow beam of white light going into a glass prism and coming out spread into the seven colours of the rainbow on a screen.",
    reads: true,
});
