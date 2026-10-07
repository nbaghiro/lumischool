import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const boltShip = defineDrawing<{ flame: boolean; ramp: boolean }>({
    id: "boltship",
    family: "travel",
    title: "Bolt's ship",
    group: "Structures",
    about: "The little round spaceship Bolt brings the rescued crew home in: a white hull with a red nose, a big round window for mission control, a deck where the crew stand in rows, legs and a ramp.",
    params: { flame: false, ramp: true },
    settings: { flame: { kind: "flag" }, ramp: { kind: "flag" } },
    takes: [
        { label: "Landed with its ramp down", params: { flame: false, ramp: true } },
        { label: "Lifting off", params: { flame: true, ramp: false } },
    ],
    box: () => ({ w: 8, h: 8 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            edge = { strokeWidth: 1.6, roughness: 0.25 },
            ink = { strokeWidth: 1.6, stroke: c.t.ink, roughness: 0.2 };
        if (p.flame) {
            pen.path(
                g,
                `M${3 * U} ${6.6 * U}Q${3.2 * U} ${7.6 * U} ${4 * U} ${7.95 * U}Q${4.8 * U} ${7.6 * U} ${5 * U} ${6.6 * U}Z`,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1.2, stroke: c.paper ? c.t.ink : c.t["glow-ink"], roughness: 0.3 },
            );
            pen.path(
                g,
                `M${3.5 * U} ${6.6 * U}Q${3.7 * U} ${7.3 * U} ${4 * U} ${7.5 * U}Q${4.3 * U} ${7.3 * U} ${4.5 * U} ${6.6 * U}Z`,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 0.6, stroke: "none", roughness: 0.3 },
            );
        } else
            for (const side of [-1, 1]) {
                pen.line(
                    g,
                    4 * U + side * 2.2 * U,
                    5.8 * U,
                    4 * U + side * 3.1 * U,
                    7.85 * U,
                    "pencil",
                    { ...ink, strokeWidth: 2.2 },
                );
                pen.line(
                    g,
                    4 * U + side * 2.75 * U,
                    7.85 * U,
                    4 * U + side * 3.5 * U,
                    7.85 * U,
                    "pencil",
                    { ...ink, strokeWidth: 2.4 },
                );
            }
        pen.path(
            g,
            `M${1.2 * U} ${6.6 * U}V${3.6 * U}Q${1.2 * U} ${0.4 * U} ${4 * U} ${0.4 * U}Q${6.8 * U} ${0.4 * U} ${6.8 * U} ${3.6 * U}V${6.6 * U}Q${4 * U} ${7.1 * U} ${1.2 * U} ${6.6 * U}Z`,
            "pencil",
            pen.fill("card"),
            edge,
        );
        pen.path(
            g,
            `M${2.6 * U} ${1.05 * U}Q${4 * U} ${0.1 * U} ${5.4 * U} ${1.05 * U}Q${4 * U} ${1.6 * U} ${2.6 * U} ${1.05 * U}Z`,
            "pencil",
            pen.fill("berry"),
            edge,
        );
        // the window mission control looks out of
        pen.circle(
            g,
            4 * U,
            2.6 * U,
            2.6 * U,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 7 }),
            edge,
        );
        pen.circle(g, 4 * U, 2.6 * U, 2.9 * U, "pencil", null, { ...ink, strokeWidth: 1.2 });
        // the deck the crew stand on, a long window low on the hull
        pen.rect(
            g,
            1.6 * U,
            4.25 * U,
            4.8 * U,
            1.9 * U,
            "pencil",
            pen.fill("glow", "hachure", { hachureGap: 8 }),
            edge,
        );
        pen.line(g, 1.6 * U, 5.2 * U, 6.4 * U, 5.2 * U, "pencil", {
            strokeWidth: 0.8,
            stroke: c.paper ? c.t.ink : c.t["ink-soft"],
            roughness: 0.2,
        });
        if (p.ramp)
            pen.path(g, `M${6.6 * U} ${6.5 * U}L${7.95 * U} ${7.9 * U}`, "pencil", null, {
                ...ink,
                strokeWidth: 3,
            });
        return {
            window: [4 * U, 2.6 * U, "up"],
            deck: [4 * U, 5.2 * U, "up"],
            door: [7.6 * U, 8 * U, "down"],
        };
    },
    describe: (p) =>
        `Bolt's little round spaceship, white with a red nose, a big round window and a long deck window for the crew${p.flame ? ", lifting off on a bright flame" : ", landed on its legs with the ramp down"}.`,
    motion: { still: "The ship stands still until the game lifts it off." },
});
