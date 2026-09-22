import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { say } from "../lettering";

const flag = (xs: number[], i: number) => (xs[i] ?? 0) > 0;

const clamp = (n: number | undefined, lo: number, hi: number, dflt: number) =>
    Math.max(lo, Math.min(hi, Math.round(n ?? dflt)));

export const moorings = defineDrawing({
    id: "moorings",
    family: "places",
    title: "Boats at the quay",
    group: "Props",
    about: "A row of small boats on the water, each with its name underneath, that differ in what a clue can name: one sail or two, a flag at the top of the mast or none, and how many round windows along the side. The harbour's clue puzzle.",
    params: {
        sails: [1, 2, 1, 2],
        flags: [1, 0, 0, 1],
        portholes: [2, 3, 0, 2],
        names: ["Ivy", "Nell", "Kit", "Bo"],
    },
    settings: {
        sails: { kind: "numbers", min: 1, max: 2, most: 8 },
        flags: { kind: "numbers", min: 0, max: 1, most: 8 },
        portholes: { kind: "numbers", min: 0, max: 4, most: 8 },
        names: { kind: "words", most: 8 },
    },
    takes: [
        {
            label: "Four boats",
            params: {
                sails: [1, 2, 1, 2],
                flags: [1, 0, 0, 1],
                portholes: [2, 3, 0, 2],
                names: ["Ivy", "Nell", "Kit", "Bo"],
            },
        },
        {
            label: "Three boats",
            params: {
                sails: [2, 2, 1],
                flags: [0, 1, 1],
                portholes: [1, 2, 2],
                names: ["Puffin", "Star", "Wren"],
            },
        },
    ],
    box: (p) => ({ w: Math.max(1, p.names.length) * 7 + 1, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            water = 8.2 * U,
            a: RawAnchors = {};
        const hulls: Marker[] = ["tang", "sky", "berry", "mint"];
        p.names.forEach((name, i) => {
            const cx = (4 + i * 7) * U,
                deck = 6.3 * U,
                mast = 1.4 * U;
            pen.line(g, cx, deck, cx, mast, "ruler", { strokeWidth: 2.2 });
            pen.polygon(
                g,
                [
                    [cx + 5, mast + 0.3 * U],
                    [cx + 5, deck - 0.3 * U],
                    [cx + 2.6 * U, deck - 0.3 * U],
                ],
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.6 },
            );
            if (clamp(p.sails[i], 1, 2, 1) === 2)
                pen.polygon(
                    g,
                    [
                        [cx - 5, mast + 0.9 * U],
                        [cx - 5, deck - 0.3 * U],
                        [cx - 2.2 * U, deck - 0.3 * U],
                    ],
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.6 },
                );
            if (flag(p.flags, i))
                pen.polygon(
                    g,
                    [
                        [cx, mast - 0.1 * U],
                        [cx + 1.3 * U, mast + 0.25 * U],
                        [cx, mast + 0.6 * U],
                    ],
                    "pencil",
                    pen.fill("berry"),
                    { strokeWidth: 1.3 },
                );
            pen.path(
                g,
                `M${cx - 3 * U} ${deck}H${cx + 3 * U}Q${cx + 2.7 * U} ${water} ${cx + 1.8 * U} ${water + 0.3 * U}H${cx - 1.8 * U}Q${cx - 2.7 * U} ${water} ${cx - 3 * U} ${deck}Z`,
                "pencil",
                pen.fill(hulls[i % hulls.length], "solid", { hachureGap: 7, fillWeight: 0.6 }),
                { strokeWidth: 2 },
            );
            const n = clamp(p.portholes[i], 0, 4, 0);
            for (let k = 0; k < n; k++) {
                const hx = cx + ((k + 0.5) / n - 0.5) * 3.6 * U;
                pen.circle(g, hx, deck + 0.85 * U, 0.7 * U, "ruler", pen.fill("card"), {
                    strokeWidth: 1.3,
                });
            }
            say(c, cx, 10.4 * U, name, 17);
            a[`boat(${i})`] = [cx, mast, "up"];
            a[`name(${i})`] = [cx, 10.6 * U, "down"];
        });
        const W = (p.names.length * 7 + 1) * U;
        for (let x = 0.2 * U; x < W - U; x += 1.2 * U)
            pen.curve(
                g,
                [
                    [x, water + 0.35 * U],
                    [x + 0.3 * U, water + 0.05 * U],
                    [x + 0.6 * U, water + 0.35 * U],
                    [x + 0.9 * U, water + 0.1 * U],
                    [x + 1.2 * U, water + 0.35 * U],
                ],
                "pencil",
                { strokeWidth: 1.3, stroke: c.t.sky },
            );
        return a;
    },
    describe: () =>
        "A row of small boats on the water, each with its name written under it, differing in their sails, their flags and the round windows along each side.",
    motion: { still: STILL.clues },
});
