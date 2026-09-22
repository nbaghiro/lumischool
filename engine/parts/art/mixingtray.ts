import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, paintFill, parseRecipe } from "../../pigment";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";
import { loop } from "../marks";
import { blob, shine } from "./kit";

export const mixingTray = defineDrawing({
    id: "mixingtray",
    family: "art",
    title: "Mixing tray",
    group: "Props",
    about: "A white tray with round wells, each holding a paint mixed from the pans. A well can hold one pan's paint, a mix written as its recipe (yellow+blue, or red 2 + white), or nothing yet. The colour in each well is worked out the way paint mixes, so blue and yellow come out green.",
    params: { wells: ["yellow+blue", "red+white", ""], ring: -1, labels: false },
    settings: {
        wells: { kind: "words", most: 8 },
        ring: { kind: "whole", min: -1, max: 7 },
        labels: { kind: "flag" },
    },
    takes: [
        {
            label: "A green, a pink and an empty well",
            params: { wells: ["yellow+blue", "red+white", ""], ring: -1, labels: false },
        },
        {
            label: "The three secondaries, named",
            params: { wells: ["red+yellow", "yellow+blue", "red+blue"], ring: 1, labels: true },
        },
        {
            label: "Greens in proportion",
            params: {
                wells: ["yellow 2+blue", "yellow+blue", "blue 2+yellow"],
                ring: -1,
                labels: true,
            },
        },
    ],
    box: (p) => ({
        w: Math.max(1, p.wells.length) * 3 + 2,
        h: 4 + (p.labels ? Math.max(1, ...p.wells.map((w) => parseRecipe(w)?.length ?? 0)) : 0),
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(1, p.wells.length),
            a: RawAnchors = {};
        pen.path(
            g,
            roundedRect(4, 4, (n * 3 + 2) * U - 8, 4 * U - 8, 2 * U - 4),
            "pencil",
            c.pen.fill("card"),
            { strokeWidth: 2.2 },
        );
        p.wells.forEach((w, i) => {
            const cx = (2.5 + i * 3) * U,
                cy = 2 * U,
                hex = colourOf(w);
            pen.circle(
                g,
                cx,
                cy,
                2.5 * U,
                "ruler",
                c.paper ? null : { fill: "#EEF2F6", fillStyle: "solid" },
                { strokeWidth: 1.5 },
            );
            if (hex) {
                pen.path(g, blob(cx, cy + 1, 0.95 * U, 71 + i * 13), "pencil", paintFill(c, hex), {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
                shine(c, cx + 2, cy + 2, 0.8 * U);
            }
            if (p.labels)
                (parseRecipe(w) ?? []).forEach((x, k) =>
                    soft(
                        c,
                        cx,
                        (4.7 + k) * U,
                        `${k ? "+ " : ""}${x.parts > 1 ? `${x.parts} ` : ""}${x.pigment}`,
                        12,
                    ),
                );
            if (i === p.ring) loop(c, cx, cy, 3 * U, 3 * U);
            a[`well(${i})`] = [cx, cy, "up"];
        });
        return a;
    },
    describe: (p) => {
        const n = Math.max(1, p.wells.length),
            filled = p.wells.filter((w) => colourOf(w) !== null).length;
        const held = filled === n ? "each" : filled === 0 ? "none" : `${filled} of them`;
        return `A white mixing tray with ${n} round wells in a row, ${held} holding a puddle of paint${p.labels ? ", the recipe written under each well" : ""}${p.ring >= 0 && p.ring < n ? ", one ringed" : ""}.`;
    },
});
