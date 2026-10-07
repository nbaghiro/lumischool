import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { lumps, ring } from "../animals/nature";
import { defineDrawing } from "../drawing";

const KINDS = ["trunk", "crown", "firtrunk", "fircrown"] as const;
type Kind = (typeof KINDS)[number];

const kindOf = (v: unknown): Kind => KINDS.find((k) => k === v) ?? "trunk";
const tallOf = (v: number): number => Math.max(3, Math.min(14, Math.round(v)));

const boxOf = (p: { kind: string; tall: number }) => {
    const k = kindOf(p.kind);
    return k === "crown"
        ? { w: 10, h: 6 }
        : k === "fircrown"
          ? { w: 7, h: 8 }
          : { w: 2, h: tallOf(p.tall) };
};

/** A climbable tree drawn in two pieces, so a game can lay a branch between them: the trunk with its roots, and the crown of autumn leaves or fir needles. */
export const oakTree = defineDrawing<{ kind: string; tall: number }>({
    id: "oaktree",
    family: "outdoors",
    title: "Climbing tree",
    group: "Structures",
    about: "An oak or a fir in two pieces: a trunk with rough bark and roots spreading at its foot, and a crown of autumn leaves or dark needles to sit over a branch.",
    params: { kind: "trunk", tall: 6 },
    settings: {
        kind: { kind: "one of", of: KINDS },
        tall: { kind: "whole", min: 3, max: 14 },
    },
    takes: [
        { label: "An oak's trunk", params: { kind: "trunk", tall: 6 } },
        { label: "An oak's crown", params: { kind: "crown", tall: 6 } },
        { label: "A fir's trunk", params: { kind: "firtrunk", tall: 6 } },
        { label: "A fir's crown", params: { kind: "fircrown", tall: 6 } },
    ],
    box: boxOf,
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            k = kindOf(p.kind),
            b = boxOf(p),
            w = b.w * U,
            h = b.h * U,
            line = { strokeWidth: 1.6, roughness: 0.35 };
        if (k === "trunk" || k === "firtrunk") {
            const bark = pen.fill(k === "trunk" ? "tang" : "ink-soft", "hachure", {
                hachureGap: 4,
            });
            pen.path(
                g,
                `M${0.55 * U} 0L${0.5 * U} ${h - 0.6 * U}Q${0.3 * U} ${h - 0.1 * U} ${0.05 * U} ${h - 0.05 * U}H${w - 0.05 * U}Q${w - 0.3 * U} ${h - 0.1 * U} ${w - 0.5 * U} ${h - 0.6 * U}L${w - 0.55 * U} 0Z`,
                "pencil",
                bark,
                line,
            );
            for (let y = 1.2 * U; y < h - 1 * U; y += 1.7 * U)
                pen.curve(
                    g,
                    [
                        [0.8 * U, y],
                        [1.0 * U, y + 0.4 * U],
                        [0.9 * U, y + 0.8 * U],
                    ],
                    "pencil",
                    { strokeWidth: 0.9, stroke: c.paper ? c.t.ink : c.t["ink-soft"] },
                );
            return { top: [w / 2, 0, "up"], foot: [w / 2, h, "down"] };
        }
        if (k === "crown") {
            // a lumpy canopy of autumn leaves, with brighter clumps in it and a few leaves drawn singly
            const canopy = lumps(
                5 * U,
                3.2 * U,
                4.7 * U,
                2.75 * U,
                [0.93, 1, 0.9, 0.98, 1, 0.92, 0.97, 1, 0.9, 0.96, 1, 0.94, 0.98, 0.9],
            );
            pen.path(g, ring(canopy), "pencil", pen.fill("tang", "solid"), line);
            for (const [x, y, rx, ry, tone] of [
                [3.2, 2.4, 1.5, 1.0, "glow"],
                [6.6, 2.0, 1.6, 1.0, "glow"],
                [5.2, 4.0, 1.6, 1.0, "berry"],
                [2.6, 4.2, 1.1, 0.8, "berry"],
                [7.6, 3.9, 1.2, 0.8, "glow"],
            ] as const)
                pen.path(
                    g,
                    ring(
                        lumps(x * U, y * U, rx * U, ry * U, [1, 0.88, 1, 0.92, 1, 0.86, 0.98, 0.9]),
                    ),
                    "pencil",
                    pen.fill(tone, "solid"),
                    {
                        strokeWidth: 1,
                        roughness: 0.3,
                    },
                );
            for (const [x, y] of [
                [2.0, 3.2],
                [4.4, 1.4],
                [8.0, 2.8],
                [6.2, 5.0],
                [4.0, 5.2],
            ] as const)
                pen.path(
                    g,
                    `M${x * U} ${y * U}q${0.25 * U} ${-0.35 * U} ${0.5 * U} 0q${-0.25 * U} ${0.35 * U} ${-0.5 * U} 0Z`,
                    "pencil",
                    null,
                    {
                        strokeWidth: 0.9,
                        stroke: c.paper ? c.t.ink : c.t["ink-soft"],
                    },
                );
            return { top: [w / 2, 0.4 * U, "up"] };
        }
        for (const [y0, half] of [
            [0.3, 1.6],
            [2.2, 2.6],
            [4.4, 3.3],
        ] as const)
            pen.polygon(
                g,
                [
                    [w / 2, y0 * U],
                    [w / 2 + half * U, (y0 + 3.2) * U],
                    [w / 2 - half * U, (y0 + 3.2) * U],
                ],
                "pencil",
                pen.fill("mint", "solid"),
                line,
            );
        return { top: [w / 2, 0.3 * U, "up"] };
    },
    describe: (p) => {
        const k = kindOf(p.kind);
        return k === "trunk"
            ? "The trunk of an oak with rough brown bark, wide roots spreading at its foot, and a cut top where its crown and branch sit."
            : k === "firtrunk"
              ? "The trunk of a fir tree with dark grey bark and roots spreading at its foot, and a cut top where its crown sits."
              : k === "crown"
                ? "The round crown of an oak in autumn, a cloud of orange, yellow and pink leaves with a little green left in its middle."
                : "The pointed crown of a fir tree, three layers of dark green needles stacked into a tall triangle.";
    },
    motion: { still: "A tree stands still; the game sways its crown when a branch is shaken." },
});
