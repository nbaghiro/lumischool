import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, soft } from "../lettering";

/** Whether it is day or night at a place on the Earth at an hour, sunrise at six and sunset at eighteen. */
export const dayAt = (hour: number): "day" | "night" | "sunrise" | "sunset" => {
    const h = ((hour % 24) + 24) % 24;
    return h === 6 ? "sunrise" : h === 18 ? "sunset" : h > 6 && h < 18 ? "day" : "night";
};

/** Sunrise and sunset as drawn: from four to nine in the morning, and from three to eight in the evening. */
const sunTimes = (p: { rise: number; set: number }): { rise: number; set: number } => ({
    rise: Math.max(4, Math.min(9, Math.round(p.rise))),
    set: Math.max(15, Math.min(20, Math.round(p.set))),
});

/** Hours of daylight between a sunrise and a sunset, on the twenty-four hour clock. */
const daylight = (rise: number, set: number): number => Math.max(0, set - rise);

const clockWords = (h: number): string => (h === 12 ? "noon" : h < 12 ? `${h} am` : `${h - 12} pm`);

export const sunpath = defineDrawing({
    id: "sunpath",
    family: "science",
    title: "The sun's path",
    group: "Structures",
    about: "The sun's path across the sky in one day, from where it rises on the left to where it sets on the right, drawn over a house and a tree. The longer the day, the wider and higher the path: a summer day's arc climbs high and a winter day's stays low. Sunrise and sunset are written at the two ends in hours, so the length of the day is worked out, not read.",
    params: { rise: 6, set: 18 },
    settings: { rise: { kind: "whole", min: 4, max: 9 }, set: { kind: "whole", min: 15, max: 20 } },
    takes: [
        { label: "A summer day", params: { rise: 5, set: 20 } },
        { label: "Day and night the same", params: { rise: 6, set: 18 } },
        { label: "A winter day", params: { rise: 8, set: 16 } },
    ],
    box: () => ({ w: 22, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const { rise, set } = sunTimes(p),
            hours = daylight(rise, set);
        const ground = 9 * U,
            cx = 11 * U,
            half = hours * 0.5 * U,
            top = hours * 0.4 * U;
        pen.line(g, 0.3 * U, ground, 21.7 * U, ground, "ruler", { strokeWidth: 2.4 });
        // the path, a dashed arch, and the sun at its highest, at noon
        pen.path(
            g,
            `M${cx - half} ${ground}Q${cx} ${ground - top * 2} ${cx + half} ${ground}`,
            "pencil",
            null,
            { strokeWidth: 1.8, strokeLineDash: [7, 6], stroke: c.t.tang },
        );
        const sy = ground - top;
        for (let k = 0; k < 8; k++) {
            const t = (k / 8) * Math.PI * 2;
            pen.line(
                g,
                cx + 1.1 * U * Math.cos(t),
                sy + 1.1 * U * Math.sin(t),
                cx + 1.5 * U * Math.cos(t),
                sy + 1.5 * U * Math.sin(t),
                "pencil",
                { strokeWidth: 1.6 },
            );
        }
        pen.circle(g, cx, sy, 1.7 * U, "pencil", pen.fill("glow"), { strokeWidth: 2 });
        a.sun = [cx, sy - 1.6 * U, "up"];
        for (const [x, h, label] of [
            [cx - half, rise, "rises"],
            [cx + half, set, "sets"],
        ] as const) {
            pen.circle(g, x, ground, 9, "ruler", pen.fill("glow"), { strokeWidth: 1.2 });
            patch(c, x, ground + 0.95 * U, 44, 16);
            num(c, x, ground + 1.2 * U, clockWords(h), 13);
            soft(c, x, ground + 1.95 * U, label, 11);
        }
        // a house and a tree at the edges, clear of the longest path
        const hx = 1.5 * U;
        pen.rect(g, hx - 1.2 * U, ground - 2 * U, 2.4 * U, 2 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.8,
        });
        pen.polygon(
            g,
            [
                [hx - 1.5 * U, ground - 2 * U],
                [hx, ground - 3.2 * U],
                [hx + 1.5 * U, ground - 2 * U],
            ],
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.8 },
        );
        pen.rect(g, hx - 0.3 * U, ground - 1 * U, 0.6 * U, 1 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.2,
        });
        const tx = 20.5 * U;
        pen.line(g, tx, ground, tx, ground - 1.4 * U, "pencil", {
            strokeWidth: 2.6,
            stroke: c.t.tang,
        });
        pen.circle(g, tx, ground - 2.3 * U, 2.2 * U, "pencil", pen.fill("mint"), {
            strokeWidth: 1.6,
        });
        return a;
    },
    describe: () =>
        "The sun's path across the sky in one day, an arc over a house and a tree from its rising on the left to its setting on the right.",
    reads: true,
});
