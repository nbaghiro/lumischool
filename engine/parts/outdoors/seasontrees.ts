import { type Ctx, type RawAnchors } from "../../ink/surface";
import { rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { type Pt, ring, lumps, blade } from "../animals/nature";

const SEASONS = ["spring", "summer", "autumn", "winter"];

const seasonsOf = (p: { seasons: string[] }): string[] => {
    const list = p.seasons.filter((s) => SEASONS.includes(s));
    return (list.length ? list : SEASONS).slice(0, 4);
};

const GROUND = 9.4 * U;

/** One trunk and six branches, given in (across, height above the ground), reused by every season. */
const BRANCHES: Pt[][] = [
    [
        [-3, 80],
        [-24, 100],
        [-44, 120],
    ],
    [
        [-1, 84],
        [-12, 114],
        [-18, 140],
    ],
    [
        [2, 84],
        [12, 116],
        [16, 144],
    ],
    [
        [3, 80],
        [24, 102],
        [44, 118],
    ],
    [
        [-26, 102],
        [-34, 118],
        [-34, 132],
    ],
    [
        [26, 104],
        [34, 120],
        [36, 132],
    ],
];

/** The tree itself. Nothing in here changes with the season, which is the point of the drawing. */
function bareTree<G>(c: Ctx<G>, cx: number): void {
    const { pen, g } = c;
    pen.path(
        g,
        `M${cx - 12} ${GROUND}C${cx - 13} ${GROUND - 36} ${cx - 9} ${GROUND - 60} ${cx - 6} ${GROUND - 88}` +
            `H${cx + 6}C${cx + 9} ${GROUND - 60} ${cx + 13} ${GROUND - 36} ${cx + 12} ${GROUND}Z`,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 8, fillWeight: 0.6 }),
        { strokeWidth: 2.2 },
    );
    BRANCHES.forEach((b, i) => {
        pen.curve(
            g,
            b.map(([dx, h]) => [cx + dx, GROUND - h] as Pt),
            "pencil",
            { strokeWidth: i < 4 ? 2.2 : 1.5 },
        );
    });
}

/** Five small petals round a point: a blossom on a bare branch in spring. */
function blossom<G>(c: Ctx<G>, x: number, y: number): void {
    const { pen, g } = c;
    for (let k = 0; k < 5; k++) {
        const t = (k / 5) * Math.PI * 2;
        pen.circle(
            g,
            x + 5.5 * Math.cos(t),
            y + 5.5 * Math.sin(t),
            9,
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 0.9 },
        );
    }
}

export const seasonTrees = defineDrawing({
    id: "seasontrees",
    family: "outdoors",
    title: "Tree through the year",
    group: "Props",
    about: "The same tree drawn once for each season: bare, in blossom, in full leaf, or thinning with leaves on the ground. The trunk and branches never change, so what is compared is the year and not four different trees.",
    params: { seasons: ["spring", "summer", "autumn", "winter"], names: 1 },
    settings: {
        seasons: { kind: "words", most: 4, of: SEASONS },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "All four seasons",
            params: { seasons: ["spring", "summer", "autumn", "winter"], names: 1 },
        },
        { label: "Summer and winter", params: { seasons: ["summer", "winter"], names: 1 } },
        { label: "One tree, in autumn", params: { seasons: ["autumn"], names: 1 } },
    ],
    box: (p) => ({ w: seasonsOf(p).length * 8 + 1, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        seasonsOf(p).forEach((kind, i) => {
            const cx = (4.5 + i * 8) * U,
                r = rng(2311 + i * 97);
            let top = GROUND - 144;
            bareTree(c, cx);
            if (kind === "summer") {
                // A full crown, drawn over the branches: in summer the tree hides its own shape.
                top = GROUND - 162;
                pen.path(
                    g,
                    ring(
                        lumps(
                            cx,
                            GROUND - 116,
                            58,
                            46,
                            [
                                1.02, 0.95, 1.05, 0.97, 1.03, 0.94, 1.04, 0.98, 1.06, 0.95, 1.01,
                                0.99,
                            ],
                        ),
                    ),
                    "doodle",
                    pen.fill("mint", "solid", { hachureGap: 8, fillWeight: 0.7 }),
                    { strokeWidth: 2.4 },
                );
            } else if (kind === "autumn") {
                // A smaller, notched crown that the outer branches poke through, and the rest on the floor.
                top = GROUND - 150;
                pen.path(
                    g,
                    ring(
                        lumps(
                            cx,
                            GROUND - 112,
                            48,
                            38,
                            [1.0, 0.8, 1.04, 0.76, 0.96, 0.84, 1.06, 0.78, 0.98, 0.86, 1.02, 0.77],
                        ),
                    ),
                    "doodle",
                    pen.fill("tang", "solid", { hachureGap: 10, fillWeight: 0.55 }),
                    { strokeWidth: 2 },
                );
                for (let k = 0; k < 6; k++) {
                    const x = cx + (k - 2.5) * 24 + (r() - 0.5) * 10,
                        y = GROUND - 6 - (k % 2) * 7;
                    pen.polygon(
                        g,
                        blade(x - 11, y, 22, 11, (r() - 0.5) * 0.9),
                        "pencil",
                        pen.fill("tang"),
                        { strokeWidth: 1.2 },
                    );
                }
            } else if (kind === "spring") {
                for (const b of BRANCHES)
                    blossom(c, cx + (b[2] ?? [0, 0])[0], GROUND - (b[2] ?? [0, 0])[1]);
                for (let k = 0; k < 3; k++)
                    blossom(
                        c,
                        cx + (BRANCHES[k * 2]?.[1] ?? [0, 0])[0],
                        GROUND - (BRANCHES[k * 2]?.[1] ?? [0, 0])[1],
                    );
                for (let k = 0; k < 4; k++) {
                    pen.ellipse(
                        g,
                        cx + (k - 1.5) * 26 + (r() - 0.5) * 8,
                        GROUND - 6,
                        11,
                        7,
                        "pencil",
                        pen.fill("berry"),
                        { strokeWidth: 0.9 },
                    );
                }
            } else {
                // Snow: a scalloped bank on the ground and a few flakes, so winter reads without colour.
                const x0 = cx - 72,
                    x1 = cx + 72;
                let d = `M${x0} ${GROUND}`;
                for (let k = 0; k < 6; k++) {
                    const s = x0 + ((x1 - x0) * k) / 6,
                        e = x0 + ((x1 - x0) * (k + 1)) / 6;
                    d += `Q${(s + e) / 2} ${GROUND - 17} ${e} ${GROUND - 3}`;
                }
                pen.path(g, `${d}V${GROUND}H${x0}Z`, "pencil", pen.fill("card"), {
                    strokeWidth: 1.8,
                });
                for (let k = 0; k < 6; k++) {
                    const x = cx - 60 + r() * 120,
                        y = GROUND - 130 + r() * 90;
                    for (const [dx, dy] of [
                        [6, 0],
                        [0, 6],
                    ] as Pt[]) {
                        pen.line(g, x - dx, y - dy, x + dx, y + dy, "doodle", {
                            strokeWidth: 1.2,
                            stroke: c.t["ink-soft"],
                        });
                    }
                }
            }
            pen.line(g, cx - 3.7 * U, GROUND, cx + 3.7 * U, GROUND, "pencil", { strokeWidth: 2.2 });
            // a world stands the tree in its own season and does not caption it, and a question that asks
            // which season this is turns the names off
            if (p.names > 0) say(c, cx, GROUND + 1.6 * U, kind, 16);
            a[`tree(${i})`] = [cx, top, "up"];
            a[`ground(${i})`] = [cx, GROUND, "down"];
        });
        return a;
    },
    describe: (p) =>
        seasonsOf(p).length > 1
            ? "The same tree drawn several times in a row, its trunk and branches unchanged, with its crown, blossom, leaves on the ground or snow telling the time of year."
            : "One tree standing on a line of ground, with its crown, blossom, fallen leaves or snow round it telling the time of year.",
});
