import { plain, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash, wash } from "../outdoors/wash";

const PLACES = [
    "garden",
    "candy",
    "seaside",
    "night",
    "clock",
    "shelf",
    "bricks",
    "fair",
    "paper",
] as const;
type Place = (typeof PLACES)[number];
const placeOf = (v: string): Place => PLACES.find((p) => p === v) ?? "garden";

/**
 * The board's measures in squares from its top left: the header the target is written on, the field
 * the marble falls through, where the launcher turns, and the bucket's rail. The game plays on these
 * and the drawing draws them, so the two cannot disagree.
 */
export const MARBLEBOARD = {
    w: 22,
    h: 36,
    /** The field, inside the frame and under the header. */
    field: { x: 1, y: 5, w: 20, h: 30 },
    /** Where the launcher turns, and the bucket's rim runs, in the field's own squares. */
    launcher: { x: 10, y: 1.4 },
    rail: 28.6,
} as const;

const F = MARBLEBOARD.field;

const WORDS: Record<Place, string> = {
    garden: "a garden with a picket fence along its foot",
    candy: "a big sweet jar",
    seaside: "the seaside, with sky, sea and sand",
    night: "a pale starry sky with a moon",
    clock: "faint clockwork cogs",
    shelf: "a wall of wooden planks",
    bricks: "a brick wall",
    fair: "a striped fairground tent with bunting",
    paper: "plain squared paper",
};

export const marbleBoard = defineDrawing<{ place: string }>({
    id: "marbleboard",
    family: "sport",
    title: "Marble peg board",
    group: "Structures",
    about: "An upright wooden peg board for a marble game, as in pachinko: a header to write the target on, a tall field the marble falls through, a launcher's mount at the top, a bucket rail and a gutter at the foot. The place sets the picture behind the pegs.",
    params: { place: "garden" },
    settings: { place: { kind: "one of", of: PLACES } },
    takes: [
        { label: "The garden fence", params: { place: "garden" } },
        { label: "The sweet jar", params: { place: "candy" } },
        { label: "The seaside", params: { place: "seaside" } },
        { label: "A starry night", params: { place: "night" } },
        { label: "Clockwork", params: { place: "clock" } },
        { label: "The brick wall", params: { place: "bricks" } },
        { label: "The fairground", params: { place: "fair" } },
    ],
    box: () => ({ w: MARBLEBOARD.w, h: MARBLEBOARD.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            place = placeOf(p.place),
            x0 = F.x * U,
            y0 = F.y * U,
            x1 = (F.x + F.w) * U,
            y1 = (F.y + F.h) * U,
            field = `M${x0} ${y0}H${x1}V${y1}H${x0}Z`,
            at = (x: number, y: number): [number, number] => [(F.x + x) * U, (F.y + y) * U];
        // the frame, inset by the pencil's wobble so it stays in its box
        pen.rect(
            g,
            0.2 * U,
            0.2 * U,
            (MARBLEBOARD.w - 0.4) * U,
            (MARBLEBOARD.h - 0.4) * U,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.8, roughness: 0.4 },
        );
        pen.rect(g, x0, 1 * U, F.w * U, 3.5 * U, "pencil", pen.fill("card", "solid"), {
            strokeWidth: 1.2,
            roughness: 0.25,
        });
        pen.path(g, field, "pencil", pen.fill("card", "solid"), { strokeWidth: 0, stroke: "none" });
        if (place === "garden") {
            wash(c, field, "mint", 0.22, false);
            // a picket fence along the foot, its pickets pointed
            for (let x = 0.6; x < F.w - 0.4; x += 1.6) {
                const [px, py] = at(x, 23.5);
                pen.path(
                    g,
                    `M${px} ${py + 4.5 * U}V${py + 0.5 * U}L${px + 0.45 * U} ${py}L${px + 0.9 * U} ${py + 0.5 * U}V${py + 4.5 * U}`,
                    "pencil",
                    c.paper ? null : pen.fill("paper", "solid"),
                    {
                        strokeWidth: 0.8,
                        stroke: c.paper ? c.t.ink : c.t["ink-soft"],
                        roughness: 0.3,
                    },
                );
            }
            for (const y of [24.6, 27])
                pen.line(g, ...at(0.2, y), ...at(F.w - 0.2, y), "pencil", {
                    strokeWidth: 0.8,
                    stroke: c.paper ? c.t.ink : c.t["ink-soft"],
                });
            if (!c.paper)
                plain(c, {
                    kind: "circle",
                    cx: x1 - 2 * U,
                    cy: y0 + 2 * U,
                    r: 1.3 * U,
                    fill: c.t.glow,
                    opacity: 0.45,
                });
        } else if (place === "candy") {
            wash(c, field, "berry", 0.12, false);
            // the jar's glass, its shoulders and lid under the launcher
            const [jx, jy] = at(1.2, 3.2),
                jw = (F.w - 2.4) * U,
                jh = 25.4 * U;
            pen.path(
                g,
                `M${jx + 2 * U} ${jy}H${jx + jw - 2 * U}Q${jx + jw} ${jy} ${jx + jw} ${jy + 2.4 * U}V${jy + jh - 1.6 * U}Q${jx + jw} ${jy + jh} ${jx + jw - 1.6 * U} ${jy + jh}H${jx + 1.6 * U}Q${jx} ${jy + jh} ${jx} ${jy + jh - 1.6 * U}V${jy + 2.4 * U}Q${jx} ${jy} ${jx + 2 * U} ${jy}Z`,
                "pencil",
                null,
                { strokeWidth: 1.4, stroke: c.paper ? c.t.ink : c.t.sky, roughness: 0.3 },
            );
            if (!c.paper)
                plain(c, {
                    kind: "path",
                    d: `M${jx + 1 * U} ${jy + 4 * U}V${jy + jh - 3 * U}`,
                    fill: "none",
                    stroke: c.t.paper,
                    width: 4,
                    cap: "round",
                    opacity: 0.8,
                });
            for (let i = 0; i < 22; i++) {
                const [sx, sy] = at(2 + hash(i, 3) * (F.w - 4), 26.6 + hash(i, 5) * 1.4);
                pen.circle(
                    g,
                    sx,
                    sy,
                    0.7 * U,
                    "pencil",
                    pen.fill(i % 3 === 0 ? "berry" : i % 3 === 1 ? "mint" : "tang", "solid"),
                    {
                        strokeWidth: 0.6,
                        roughness: 0.2,
                    },
                );
            }
        } else if (place === "seaside") {
            const [, sea] = at(0, 17),
                [, sand] = at(0, 25);
            wash(c, `M${x0} ${y0}H${x1}V${sea}H${x0}Z`, "sky", 0.1, false);
            wash(c, `M${x0} ${sea}H${x1}V${sand}H${x0}Z`, "sky", 0.28, true);
            wash(c, `M${x0} ${sand}H${x1}V${y1}H${x0}Z`, "glow", 0.3, false);
            for (const y of [18.5, 21, 23.4])
                for (let x = 0.5 + (y % 2); x + 1.4 < F.w - 0.3; x += 3) {
                    const [wx, wy] = at(x, y);
                    pen.path(
                        g,
                        `M${wx} ${wy}Q${wx + 0.7 * U} ${wy - 0.5 * U} ${wx + 1.4 * U} ${wy}`,
                        "pencil",
                        null,
                        {
                            strokeWidth: 0.8,
                            stroke: c.paper ? c.t.ink : c.t.sky,
                        },
                    );
                }
            for (let i = 0; i < 4; i++) {
                const [sx, sy] = at(2.5 + i * 4.6 + hash(i, 9), 27.6);
                pen.path(
                    g,
                    `M${sx - 0.5 * U} ${sy}Q${sx} ${sy - 1.1 * U} ${sx + 0.5 * U} ${sy}Z`,
                    "pencil",
                    pen.fill("berry", "solid"),
                    { strokeWidth: 0.7, roughness: 0.2 },
                );
            }
        } else if (place === "night") {
            wash(c, field, "sky", 0.26, true);
            const [mx, my] = at(3, 3);
            pen.path(
                g,
                `M${mx} ${my - 1.4 * U}A${1.4 * U} ${1.4 * U} 0 1 0 ${mx + 1.3 * U} ${my + 0.6 * U}A${1.1 * U} ${1.1 * U} 0 1 1 ${mx} ${my - 1.4 * U}Z`,
                "pencil",
                pen.fill("glow", "solid"),
                { strokeWidth: 0.9, roughness: 0.2 },
            );
            for (let i = 0; i < 26; i++) {
                const [sx, sy] = at(0.8 + hash(i, 11) * (F.w - 1.6), 0.8 + hash(i, 13) * (F.h - 2)),
                    r = (0.14 + hash(i, 17) * 0.16) * U;
                pen.path(
                    g,
                    `M${sx - r} ${sy}H${sx + r}M${sx} ${sy - r}V${sy + r}`,
                    "pencil",
                    null,
                    { strokeWidth: 0.9, stroke: c.paper ? c.t.ink : c.t.glow },
                );
            }
        } else if (place === "clock") {
            wash(c, field, "glow", 0.14, false);
            for (const [cx, cy, r] of [
                [4.5, 8, 3.2],
                [15, 15, 4.2],
                [6, 23, 2.8],
            ] as const) {
                const [gx, gy] = at(cx, cy),
                    teeth: string[] = [];
                for (let i = 0; i < 24; i++) {
                    const a = (i / 24) * Math.PI * 2,
                        rr = (i % 2 === 0 ? r : r - 0.45) * U;
                    teeth.push(`${gx + Math.cos(a) * rr} ${gy + Math.sin(a) * rr}`);
                }
                pen.path(g, `M${teeth.join("L")}Z`, "pencil", null, {
                    strokeWidth: 0.9,
                    stroke: c.paper ? c.t.ink : c.t.tang,
                    roughness: 0.25,
                });
                pen.circle(g, gx, gy, r * 0.5 * U, "pencil", null, {
                    strokeWidth: 0.8,
                    stroke: c.paper ? c.t.ink : c.t.tang,
                });
            }
        } else if (place === "shelf") {
            wash(c, field, "tang", 0.16, false);
            for (let x = 2.5; x < F.w; x += 2.5)
                pen.line(g, ...at(x, 0.2), ...at(x, F.h - 0.2), "pencil", {
                    strokeWidth: 0.7,
                    stroke: c.paper ? c.t.ink : c.t.tang,
                });
        } else if (place === "bricks") {
            wash(c, field, "berry", 0.1, false);
            for (let row = 0; row < F.h; row += 1.5) {
                pen.line(g, ...at(0.1, row), ...at(F.w - 0.1, row), "pencil", {
                    strokeWidth: 0.5,
                    stroke: c.paper ? c.t.ink : c.t.berry,
                });
                for (let x = (row / 1.5) % 2 === 0 ? 1.5 : 3; x < F.w; x += 3)
                    pen.line(g, ...at(x, row), ...at(x, Math.min(F.h, row + 1.5)), "pencil", {
                        strokeWidth: 0.5,
                        stroke: c.paper ? c.t.ink : c.t.berry,
                    });
            }
        } else if (place === "fair") {
            for (let x = 0; x < F.w; x += 4) {
                const [sx] = at(x, 0),
                    [ex] = at(x + 2, 0);
                wash(c, `M${sx} ${y0}H${ex}V${y1}H${sx}Z`, "berry", 0.14, false);
            }
            const [bx, by] = at(0.2, 1.2);
            const flags: string[] = [];
            for (let i = 0; i < 9; i++) {
                const fx = bx + i * 2.18 * U;
                flags.push(`M${fx} ${by}L${fx + 1.09 * U} ${by + 1.5 * U}L${fx + 2.18 * U} ${by}`);
            }
            pen.path(g, flags.join(""), "pencil", pen.fill("tang", "solid"), {
                strokeWidth: 0.8,
                roughness: 0.25,
            });
        }
        // the bucket's rail, and the gutter the marbles that miss roll away along
        const [, rail] = at(0, MARBLEBOARD.rail + 1.25);
        pen.line(g, x0 + 0.3 * U, rail, x1 - 0.3 * U, rail, "ruler", {
            strokeWidth: 1.4,
            stroke: c.paper ? c.t.ink : c.t["ink-soft"],
        });
        pen.rect(g, x0, y1 - 0.9 * U, F.w * U, 0.9 * U, "pencil", pen.fill("ink-soft", "hachure"), {
            strokeWidth: 1,
            roughness: 0.25,
        });
        // the launcher's mount at the top of the field
        const [lx, ly] = at(MARBLEBOARD.launcher.x, 0);
        pen.path(
            g,
            `M${lx - 1.6 * U} ${ly}Q${lx} ${ly + 1.8 * U} ${lx + 1.6 * U} ${ly}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.2, roughness: 0.3 },
        );
        pen.rect(g, x0, y0, F.w * U, F.h * U, "pencil", null, {
            strokeWidth: 1.4,
            stroke: c.t.ink,
            roughness: 0.25,
        });
        return {
            header: [(F.x + F.w / 2) * U, 2.75 * U, "up"],
            launcher: [lx, ly + MARBLEBOARD.launcher.y * U, "down"],
        };
    },
    describe: (p) =>
        `An upright wooden peg board for a marble game, a header for the target, a tall field showing ${WORDS[placeOf(p.place)]}, and a gutter.`,
    motion: {
        still: "The board stands still; the pegs, the bucket and the marble are drawn over it.",
    },
});
