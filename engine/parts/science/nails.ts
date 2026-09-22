import { group, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";
import { LIQUID, lightFill, glassPath, liquid, gleam, lettered, nail } from "./apparatus";
import { RUST, rustOf } from "./substances";

export const nails = defineDrawing({
    id: "nails",
    family: "science",
    title: "Nails left in jars",
    group: "Structures",
    about: "Iron nails left in lettered jars for some days: in water, where they get both water and air, in salty water, in dry air with a lid on, in boiled water sealed under a layer of oil, and painted. Rust needs water and air together, so only the nails that have both go orange, and the salty one fastest. How rusty each is comes from one rule with the days, which the checker marks from.",
    params: { jars: ["water", "dry", "oil"], days: 7, letters: 1, names: 1 },
    settings: {
        jars: { kind: "words", most: 5, of: Object.keys(RUST) },
        days: { kind: "whole", min: 0, max: 30 },
        letters: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Water, dry air, oil",
            params: { jars: ["water", "dry", "oil"], days: 7, letters: 1, names: 1 },
        },
        {
            label: "Salt water is fastest",
            params: { jars: ["water", "salt", "painted"], days: 7, letters: 1, names: 1 },
        },
        {
            label: "The first day",
            params: { jars: ["water", "salt", "dry", "oil"], days: 0, letters: 1, names: 1 },
        },
    ],
    box: (p) => ({
        w: Math.max(1, Math.min(5, p.jars.length)) * 4 + 1,
        h: 8 + (p.names > 0 ? 1 : 0),
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = c.t,
            n = Math.max(1, Math.min(5, p.jars.length)),
            days = Math.max(0, Math.round(p.days));
        p.jars.slice(0, n).forEach((jar, i) => {
            const x = (2.5 + i * 4) * U,
                lx = x - 1.5 * U,
                rx = x + 1.5 * U,
                top = 1.8 * U,
                base = 6.4 * U,
                rust = rustOf(jar, days);
            const wet = jar !== "dry",
                level = top + 1.8 * U;
            if (wet)
                liquid(
                    c,
                    lx,
                    rx,
                    level,
                    base,
                    jar === "salt"
                        ? pen.fill("sky", "hachure", { hachureGap: 4 })
                        : pen.fill(LIQUID, "hachure", { hachureGap: 7, fillWeight: 0.7 }),
                    8,
                );
            if (jar === "oil")
                pen.rect(
                    g,
                    lx + 3,
                    level - 0.5 * U,
                    rx - lx - 6,
                    0.5 * U,
                    "ruler",
                    lightFill(c, "glow", "solid"),
                    { strokeWidth: 1 },
                );
            if (jar === "dry")
                for (let k = 0; k < 7; k++)
                    pen.rect(
                        g,
                        lx + 0.3 * U + k * 0.38 * U,
                        base - 0.45 * U - (k % 2) * 4,
                        7,
                        7,
                        "pencil",
                        pen.fill("card"),
                        { strokeWidth: 0.9 },
                    );
            // the nail, standing at a lean, rusted where it is wet if the jar lets it rust
            const x0 = x - 0.5 * U,
                y0 = top + 0.7 * U,
                x1 = x + 0.45 * U,
                y1 = base - 0.3 * U;
            const ang = Math.atan2(y1 - y0, x1 - x0),
                len = Math.hypot(x1 - x0, y1 - y0);
            nail(
                group(c, {
                    turn: [
                        ["translate", x0, y0],
                        ["rotate", (ang * 180) / Math.PI],
                    ],
                }),
                0,
                len,
                0,
                rust,
                13 + i,
            );
            if (jar === "painted")
                pen.line(
                    g,
                    x0 + (x1 - x0) * 0.12,
                    y0 + (y1 - y0) * 0.12,
                    x1 - (x1 - x0) * 0.1,
                    y1 - (y1 - y0) * 0.1,
                    "pencil",
                    { strokeWidth: 3, stroke: c.paper ? t.ink : t.berry },
                );
            pen.path(g, glassPath(lx, rx, top, base, 8), "pencil", null, { strokeWidth: 2.2 });
            if (jar === "dry" || jar === "oil")
                pen.rect(
                    g,
                    lx - 0.2 * U,
                    top - 0.5 * U,
                    rx - lx + 0.4 * U,
                    0.5 * U,
                    "pencil",
                    pen.fill("mint"),
                    { strokeWidth: 1.6 },
                );
            else pen.line(g, lx - 3, top, rx + 3, top, "pencil", { strokeWidth: 1.4 });
            gleam(c, lx + 5, top + 6, base - 8, 2.2);
            if (p.letters > 0) lettered(c, x, 7.5 * U, i);
            if (p.names > 0)
                soft(c, x, (p.letters > 0 ? 8.6 : 7.5) * U, RUST[jar]?.name ?? jar, 11);
            a[`jar(${i})`] = [x, top - 0.6 * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `Lettered glass jars in a row, an iron nail leaning in each, what each jar holds drawn round its nail${p.names > 0 ? ", each named underneath" : ""}.`,
    reads: true,
});
