import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { ghost, num, numOn, patch } from "../lettering";

/** How high above the top of the stick the light stands, and so how far back it has to be. */
const ABOVE = 4;

const lead = (tall: number, shadow: number): number =>
    Math.ceil((ABOVE * shadow) / Math.max(1, tall)) + 2;

export const shadows = defineDrawing({
    id: "shadows",
    family: "science",
    title: "Stick and shadow",
    group: "Structures",
    about: "A light, an upright and the shadow it throws, with both lengths marked. Where the shadow comes from is a drawing rather than a sentence: the ray runs from the lamp past the top of the stick to the far end of the shadow.",
    params: { tall: 4, shadow: 6, unit: "cm", lamp: false, marks: true },
    settings: {
        tall: { kind: "whole", min: 1, max: 8 },
        shadow: { kind: "whole", min: 1, max: 12 },
        unit: { kind: "text", most: 3 },
        lamp: { kind: "flag" },
        marks: { kind: "flag" },
    },
    takes: [
        {
            label: "Sun high, a short shadow",
            params: { tall: 4, shadow: 4, unit: "cm", lamp: false, marks: true },
        },
        {
            label: "Sun low, a long shadow",
            params: { tall: 4, shadow: 8, unit: "cm", lamp: false, marks: true },
        },
        {
            label: "Under a lamp",
            params: { tall: 4, shadow: 6, unit: "cm", lamp: true, marks: true },
        },
    ],
    box: (p) => ({ w: lead(p.tall, p.shadow) + p.shadow + 3, h: p.tall + ABOVE + 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        // The ray has to be true: from the light, past the top of the stick, to the end of the shadow.
        // Fixing the light ABOVE squares over the stick's top fixes how far back it has to stand.
        const back = (ABOVE * p.shadow) / Math.max(1, p.tall);
        const cols = lead(p.tall, p.shadow);
        const ground = (p.tall + ABOVE + 2) * U;
        const foot = cols * U,
            top = ground - p.tall * U;
        pen.line(g, 0, ground, (p.shadow + cols + 3) * U, ground, "ruler", { strokeWidth: 2.6 });
        // the shadow first, so the stick is drawn over it
        pen.polygon(
            g,
            [
                [foot, ground],
                [foot + p.shadow * U, ground],
                [foot + p.shadow * U, ground + 0.5 * U],
                [foot, ground + 0.5 * U],
            ],
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 3.2 }),
            { strokeWidth: 1.2 },
        );
        pen.line(g, foot, ground, foot, top, "ruler", { strokeWidth: 3.4 });
        const tipX = foot + p.shadow * U;
        const lx = foot - back * U,
            ly = top - ABOVE * U;
        if (p.lamp) {
            pen.path(
                g,
                `M${lx - 1.2 * U} ${ly}h${2.4 * U}l${-0.7 * U} ${1 * U}h${-1 * U}Z`,
                "ruler",
                pen.fill("card"),
                { strokeWidth: 2 },
            );
            pen.line(g, lx, ly, lx, ly - 1.4 * U, "ruler", { strokeWidth: 2 });
        } else {
            pen.circle(g, lx, ly, 2.4 * U, "pencil", pen.fill("glow"), { strokeWidth: 2 });
            for (let i = 0; i < 8; i++) {
                const ang = (i * Math.PI) / 4;
                pen.line(
                    g,
                    lx + 1.5 * U * Math.cos(ang),
                    ly + 1.5 * U * Math.sin(ang),
                    lx + 2.1 * U * Math.cos(ang),
                    ly + 2.1 * U * Math.sin(ang),
                    "pencil",
                    { strokeWidth: 1.4 },
                );
            }
        }
        ghost(c, `M${lx} ${ly}L${tipX} ${ground}`);
        if (p.marks) {
            patch(c, foot - 0.7 * U, ground - (p.tall * U) / 2, 34, 18);
            num(c, foot - 0.5 * U, ground - (p.tall * U) / 2 + 5, `${p.tall}`, 14, "end");
            numOn(c, foot + (p.shadow * U) / 2, ground + 1.6 * U, `${p.shadow} ${p.unit}`, 15);
        }
        a.top = [foot, top, "up"];
        a.foot = [foot, ground, "down"];
        a.tip = [tipX, ground, "down"];
        a.light = [lx, ly, "up"];
        return a;
    },
    describe: (p) =>
        `A ${p.lamp ? "lamp" : "sun"} high up, an upright stick and the shadow it throws along the ground, a ray drawn from the light past the stick's top to the shadow's end.`,
    reads: true,
});
