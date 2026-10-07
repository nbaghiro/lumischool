import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { asPerson, type CharlieParams } from "../people/charlie";
import { placePerson } from "../people/figure";
import { wash } from "./wash";

const CHARLIE: CharlieParams = {
    pose: "hold",
    mood: "excited",
    dir: -1,
    hair: "ponytail",
    top: "tang",
    sleeves: "short",
    print: "star",
    wear: "shorts",
    bottom: "sky",
    pattern: "plain",
    feet: "bare",
    holding: "",
};

/** Charlie on a little island with her spade, beside an X dug into the sand, the picture the treasure hunt is chosen by. */
export const treasureCover = defineDrawing<{ charlie: boolean }>({
    id: "treasurecover",
    family: "outdoors",
    title: "Digging for treasure",
    group: "Props",
    about: "Charlie on a little sandy island with a palm tree, holding her spade beside a red X in the sand with the sea all round, the picture of a treasure hunting game.",
    params: { charlie: true },
    settings: { charlie: { kind: "flag" } },
    takes: [
        { label: "With Charlie", params: { charlie: true } },
        { label: "Just the island and the X", params: { charlie: false } },
    ],
    box: () => ({ w: 8, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c;
        wash(c, `M${0.5 * U} ${3.6 * U}H${7.5 * U}V${6.4 * U}H${0.5 * U}Z`, "sky", 0.3, true);
        const sand = `M${0.6 * U} ${5.6 * U}Q${0.8 * U} ${4 * U} ${3.6 * U} ${3.9 * U}Q${7.2 * U} ${3.8 * U} ${7.4 * U} ${5.4 * U}Q${7 * U} ${6.6 * U} ${4 * U} ${6.6 * U}Q${0.7 * U} ${6.6 * U} ${0.6 * U} ${5.6 * U}Z`;
        if (!c.paper) plain(c, { kind: "path", d: sand, fill: c.t.card });
        pen.path(g, sand, "pencil", pen.fill("glow"), { strokeWidth: 1.6 });
        // the palm at the back of the island
        pen.path(
            g,
            `M${1.6 * U} ${4.6 * U}Q${2.1 * U} ${3 * U} ${1.7 * U} ${1.4 * U}`,
            "pencil",
            null,
            { strokeWidth: 3.2 },
        );
        for (const [dx, dy] of [
            [-1.2, 0.5],
            [1.3, 0.4],
            [-0.6, -0.6],
            [0.8, -0.5],
        ] as const)
            pen.path(
                g,
                `M${1.7 * U} ${1.4 * U}Q${(1.7 + dx * 0.5) * U} ${(1 + dy) * U} ${(1.7 + dx) * U} ${(1.6 + dy) * U}`,
                "pencil",
                pen.fill("mint"),
                { strokeWidth: 2.4, stroke: c.paper ? c.t.ink : c.t.ok },
            );
        // the X, and the spade standing in the sand beside it
        const x = 4 * U,
            y = 5.4 * U;
        for (const s of [1, -1])
            pen.line(g, x - 0.45 * U, y - s * 0.3 * U, x + 0.45 * U, y + s * 0.3 * U, "pencil", {
                strokeWidth: 3.4,
                stroke: c.paper ? c.t.ink : c.t.berry,
            });
        pen.line(g, 5.3 * U, 2.6 * U, 5.1 * U, 4.8 * U, "pencil", {
            strokeWidth: 2.4,
            stroke: c.paper ? c.t.ink : c.t.tang,
        });
        pen.path(
            g,
            `M${4.75 * U} ${4.7 * U}H${5.45 * U}L${5.4 * U} ${5.4 * U}Q${5.1 * U} ${5.75 * U} ${4.8 * U} ${5.4 * U}Z`,
            "pencil",
            pen.fill("sky", "solid"),
            {
                strokeWidth: 1.4,
            },
        );
        if (p.charlie) placePerson(c, asPerson(CHARLIE), 6.4 * U, 5.8 * U, { size: 0.42 });
        return {};
    },
    describe: (p) =>
        p.charlie
            ? "Charlie on a little sandy island with a palm tree and her spade, standing beside a red X marked in the sand, with the sea all round."
            : "A little sandy island with a palm tree and a spade standing beside a red X marked in the sand, with the sea all round it.",
});
