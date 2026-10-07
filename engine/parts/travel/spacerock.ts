import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const KINDS = ["asteroid", "crystal", "satellite", "comet"] as const;
type Kind = (typeof KINDS)[number];
const kindOf = (v: string): Kind => KINDS.find((k) => k === v) ?? "asteroid";

const BOXES: Record<Kind, { w: number; h: number }> = {
    asteroid: { w: 3, h: 3 },
    crystal: { w: 3, h: 3 },
    satellite: { w: 4, h: 2 },
    comet: { w: 5, h: 2 },
};

const WORDS: Record<Kind, string> = {
    asteroid:
        "A lumpy grey asteroid with three round craters, drifting in space where a flying robot has to steer round it",
    crystal:
        "A floating rock in an asteroid belt with pale blue crystals growing out of it, sharp and glinting in the light",
    satellite:
        "A little satellite drifting across the sky, a gold box in the middle with a blue solar panel on each side",
    comet: "A small comet rushing across the sky, a bright yellow head of ice with a soft tail streaming out behind it",
};

export const spaceRock = defineDrawing<{ kind: string }>({
    id: "spacerock",
    family: "travel",
    title: "Space rock",
    group: "Props",
    about: "Something drifting in space that a flying robot bumps off and steers round: a lumpy asteroid, a crystal rock from a belt, a satellite, or a comet.",
    params: { kind: "asteroid" },
    settings: { kind: { kind: "one of", of: KINDS } },
    takes: [
        { label: "An asteroid", params: { kind: "asteroid" } },
        { label: "A crystal rock", params: { kind: "crystal" } },
        { label: "A satellite", params: { kind: "satellite" } },
        { label: "A comet", params: { kind: "comet" } },
    ],
    box: (p) => BOXES[kindOf(p.kind)],
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            kind = kindOf(p.kind),
            edge = { strokeWidth: 1.4, roughness: 0.35 },
            soft = { strokeWidth: 1, stroke: c.paper ? c.t.ink : c.t["ink-soft"], roughness: 0.3 };
        if (kind === "satellite") {
            for (const x of [0.1, 2.75])
                pen.rect(
                    g,
                    x * U,
                    0.45 * U,
                    1.15 * U,
                    1.1 * U,
                    "ruler",
                    pen.fill("sky", "hachure", { hachureGap: 4 }),
                    edge,
                );
            pen.line(g, 1.25 * U, U, 2.75 * U, U, "ruler", soft);
            pen.rect(g, 1.45 * U, 0.55 * U, 1.1 * U, 0.9 * U, "pencil", pen.fill("glow"), edge);
            pen.line(g, 2 * U, 0.55 * U, 2.2 * U, 0.1 * U, "pencil", soft);
            return { middle: [2 * U, U, "up"] };
        }
        if (kind === "comet") {
            pen.path(
                g,
                `M${3.9 * U} ${0.55 * U}Q${2.2 * U} ${0.3 * U} ${0.15 * U} ${0.9 * U}Q${2.2 * U} ${1.5 * U} ${3.9 * U} ${1.45 * U}Z`,
                "pencil",
                pen.fill("glow", "hachure", { hachureGap: 5 }),
                { ...soft, strokeWidth: 0.9 },
            );
            pen.circle(g, 4.1 * U, U, 1.4 * U, "pencil", pen.fill("glow"), edge);
            return { middle: [4.1 * U, U, "up"] };
        }
        const cx = 1.5 * U,
            cy = 1.5 * U;
        pen.path(
            g,
            `M${0.3 * U} ${1.4 * U}Q${0.4 * U} ${0.4 * U} ${1.4 * U} ${0.35 * U}Q${2.6 * U} ${0.3 * U} ${2.7 * U} ${1.4 * U}Q${2.8 * U} ${2.5 * U} ${1.6 * U} ${2.65 * U}Q${0.4 * U} ${2.7 * U} ${0.3 * U} ${1.4 * U}Z`,
            "pencil",
            pen.fill(kind === "crystal" ? "card" : "ink-soft", "hachure", { hachureGap: 6 }),
            edge,
        );
        if (kind === "asteroid") {
            for (const [x, y, r] of [
                [1.1, 1.1, 0.7],
                [1.9, 1.9, 0.5],
                [1.9, 0.95, 0.35],
            ] as const)
                pen.circle(g, x * U, y * U, r * U, "pencil", pen.fill("card"), soft);
            return { middle: [cx, cy, "up"] };
        }
        for (const [x, y, s, lean] of [
            [1.1, 1.3, 0.9, -0.3],
            [1.9, 1.3, 1.1, 0.25],
            [1.5, 1.8, 0.7, 0],
        ] as const) {
            const tip = { x: (x + lean) * U, y: (y - s) * U };
            pen.path(
                g,
                `M${(x - 0.25) * U} ${y * U}L${tip.x} ${tip.y}L${(x + 0.25) * U} ${y * U}Z`,
                "pencil",
                pen.fill("sky"),
                edge,
            );
        }
        return { middle: [cx, cy, "up"] };
    },
    describe: (p) => `${WORDS[kindOf(p.kind)]}.`,
    motion: { still: "It drifts only as the game carries it across the sky." },
});
