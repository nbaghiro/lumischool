import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

// Where each sack stands on the deck, filling the bottom row first: its middle, in squares.
const SACKS: Pt[] = [
    [2.8, 0],
    [4.3, 0],
    [5.8, 0],
    [3.55, 1],
    [5.05, 1],
];

export const mailBoat = defineDrawing({
    id: "mailboat",
    family: "travel",
    title: "Mail boat",
    group: "Structures",
    about: "A small mail boat with a pink hull, a wheelhouse, a mast flying a flag with an envelope on it and sacks of post on deck, tied up to a bollard or sailing with a wake behind.",
    params: { sacks: 3, sailing: 0 },
    settings: {
        sacks: { kind: "whole", min: 0, max: 5 },
        sailing: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Tied up, three sacks", params: { sacks: 3, sailing: 0 } },
        { label: "Sailing, five sacks", params: { sacks: 5, sailing: 1 } },
    ],
    box: () => ({ w: 14, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            sailing = p.sailing > 0,
            n = Math.max(0, Math.min(5, Math.round(p.sacks))),
            a: RawAnchors = {};
        const deck = 5.5 * U,
            water = 7.5 * U;

        // the mast and its flag with an envelope, hanging still or streaming out behind
        const mx = 6.6 * U,
            mt = 0.5 * U;
        pen.line(g, mx, deck, mx, mt, "pencil", calm(c, 2.2));
        pen.line(g, mx, mt + 0.3 * U, 1.9 * U, deck - 0.1 * U, "pencil", {
            ...calm(c, 1),
            stroke: c.t["ink-soft"],
        });
        pen.line(g, mx, mt + 0.3 * U, 12.6 * U, deck - 0.3 * U, "pencil", {
            ...calm(c, 1),
            stroke: c.t["ink-soft"],
        });
        const flag: Pt[] = sailing
            ? [
                  [mx, mt + 0.1 * U],
                  [mx - 1.2 * U, mt + 0.25 * U],
                  [mx - 2.4 * U, mt],
                  [mx - 2.35 * U, mt + 1.5 * U],
                  [mx - 1.2 * U, mt + 1.75 * U],
                  [mx, mt + 1.6 * U],
              ]
            : [
                  [mx, mt + 0.1 * U],
                  [mx - 1.2 * U, mt + 0.35 * U],
                  [mx - 1.55 * U, mt + 1.9 * U],
                  [mx - 0.35 * U, mt + 1.9 * U],
                  [mx, mt + 1.6 * U],
              ];
        pen.polygon(g, flag, "pencil", pen.fill("sky"), calm(c, 1.5));
        const ex = sailing ? mx - 1.2 * U : mx - 0.78 * U,
            ey = mt + 0.95 * U,
            ew = sailing ? 0.6 * U : 0.46 * U,
            eh = 0.42 * U;
        pen.rect(g, ex - ew, ey - eh, ew * 2, eh * 2, "pencil", pen.fill("card"), calm(c, 1.2));
        pen.linear(
            g,
            [
                [ex - ew, ey - eh],
                [ex, ey + 0.05 * U],
                [ex + ew, ey - eh],
            ],
            "pencil",
            calm(c, 1.1),
        );
        a.flag = [ex, ey - eh, "up"];

        // the wheelhouse, with its windows and roof
        pen.rect(
            g,
            8.2 * U,
            3.3 * U,
            2.8 * U,
            deck - 3.3 * U,
            "pencil",
            pen.fill("card"),
            calm(c, 1.7),
        );
        pen.polygon(
            g,
            [
                [7.9 * U, 3.35 * U],
                [11.3 * U, 3.35 * U],
                [11 * U, 2.85 * U],
                [8.2 * U, 2.85 * U],
            ],
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
            calm(c, 1.6),
        );
        for (const wx of [8.55, 9.75])
            pen.rect(
                g,
                wx * U,
                3.75 * U,
                0.9 * U,
                0.8 * U,
                "pencil",
                pen.fill("sky"),
                calm(c, 1.2),
            );
        pen.line(g, 10.9 * U, 2.85 * U, 10.9 * U, 2.1 * U, "pencil", calm(c, 1.4));
        pen.circle(g, 10.9 * U, 1.95 * U, 7, "pencil", pen.fill("ink-soft"), calm(c, 1));

        // the sacks of post, tied at the neck, each with its label
        for (let k = 0; k < n; k++) {
            const [sx, row] = SACKS[k] ?? [2.8, 0],
                x = sx * U,
                base = deck - row * 1.15 * U + 0.05 * U,
                w = 1.4 * U,
                h = 1.3 * U;
            pen.path(
                g,
                `M${x - w / 2} ${base}Q${x - w / 2 - 0.1 * U} ${base - h * 0.75} ${x - 0.25 * U} ${base - h}L${x + 0.25 * U} ${base - h}Q${x + w / 2 + 0.1 * U} ${base - h * 0.75} ${x + w / 2} ${base}Z`,
                "pencil",
                pen.fill("card"),
                calm(c, 1.5),
            );
            pen.polygon(
                g,
                [
                    [x - 0.22 * U, base - h],
                    [x - 0.35 * U, base - h - 0.35 * U],
                    [x + 0.35 * U, base - h - 0.35 * U],
                    [x + 0.22 * U, base - h],
                ],
                "pencil",
                pen.fill("card"),
                calm(c, 1.1),
            );
            pen.line(
                g,
                x - 0.3 * U,
                base - h + 0.05 * U,
                x + 0.3 * U,
                base - h + 0.05 * U,
                "pencil",
                calm(c, 1.3),
            );
            pen.rect(
                g,
                x - 0.28 * U,
                base - h * 0.55,
                0.56 * U,
                0.34 * U,
                "pencil",
                pen.fill("berry", "hachure", { hachureGap: 2.5 }),
                calm(c, 1),
            );
            a[`sack(${k})`] = [x, base - h - 0.35 * U, "up"];
        }

        // the hull, its bow raised to the right, with a rubbing strake along it
        const hull: Pt[] = [
            [1.8 * U, deck - 0.1 * U],
            [12.2 * U, deck - 0.1 * U],
            [13.5 * U, deck - 0.75 * U],
            [12.6 * U, 7.7 * U],
            [2.6 * U, 7.9 * U],
            [1.9 * U, 6.9 * U],
        ];
        pen.polygon(g, hull, "pencil", pen.fill("berry"), calm(c, 1.9));
        pen.curve(
            g,
            [
                [1.85 * U, deck + 0.45 * U],
                [7 * U, deck + 0.5 * U],
                [12.9 * U, deck + 0.15 * U],
            ],
            "pencil",
            calm(c, 1.2),
        );
        for (const x of [3.6, 5.4, 7.2])
            pen.circle(g, x * U, 6.55 * U, 0.46 * U, "pencil", pen.fill("card"), calm(c, 1.2));

        // the water: calm and tied up to a bollard on the quay, or cut by a bow wave with a wake behind
        const line: Pt[] = [];
        for (let x = 0.1 * U; x <= 13.9 * U; x += 0.5 * U)
            line.push([x, water + (sailing ? 0.12 : 0.05) * U * Math.sin(x / (0.6 * U))]);
        pen.polygon(
            g,
            [...line, [13.9 * U, 8.9 * U], [0.1 * U, 8.9 * U]],
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
            { stroke: "none" },
        );
        pen.curve(g, line, "pencil", calm(c, 1.5));
        if (sailing) {
            pen.curve(
                g,
                [
                    [13.6 * U, 7.35 * U],
                    [13.35 * U, 6.95 * U],
                    [12.9 * U, 7.1 * U],
                ],
                "pencil",
                calm(c, 1.4),
            );
            pen.curve(
                g,
                [
                    [13.85 * U, 7.6 * U],
                    [13.8 * U, 6.95 * U],
                    [13.4 * U, 6.7 * U],
                ],
                "pencil",
                calm(c, 1.2),
            );
            for (const [y, x0] of [
                [8, 1.8],
                [8.35, 0.4],
                [7.75, 0.2],
            ] as const)
                pen.line(g, x0 * U, y * U, (x0 + 1.6) * U, (y - 0.15) * U, "pencil", calm(c, 1.2));
        } else {
            pen.rect(
                g,
                0.1 * U,
                6.3 * U,
                0.9 * U,
                2.6 * U,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
                calm(c, 1.6),
            );
            pen.path(
                g,
                `M${0.3 * U} ${6.3 * U}V${5.75 * U}Q${0.55 * U} ${5.55 * U} ${0.8 * U} ${5.75 * U}V${6.3 * U}Z`,
                "pencil",
                pen.fill("ink-soft"),
                calm(c, 1.4),
            );
            pen.curve(
                g,
                [
                    [0.6 * U, 5.85 * U],
                    [1.3 * U, 6.35 * U],
                    [2 * U, 5.75 * U],
                ],
                "pencil",
                calm(c, 1.3),
            );
            for (const x of [4, 9])
                pen.line(g, x * U, 8.3 * U, (x + 0.9) * U, 8.3 * U, "pencil", calm(c, 1.1));
            a.bollard = [0.55 * U, 5.6 * U, "up"];
        }
        a.bow = [13.5 * U, deck - 0.75 * U, "right"];
        return a;
    },
    describe: (p) =>
        `A mail boat with a pink hull and a wheelhouse, ${p.sailing > 0 ? "its flag with an envelope streaming from the mast" : "a flag with an envelope hanging from the mast"} and ${Math.round(p.sacks) > 0 ? "sacks of post on deck" : "an empty deck"}, ${p.sailing > 0 ? "sailing with a wake behind" : "tied up to a bollard"}.`,
    motion: {
        body: { is: "float", lift: 4, dx: 0, deg: 2, pivot: [0.5, 1], period: 5.6, units: true },
    },
});
