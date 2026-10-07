import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const KINDS = ["crate", "metal", "tile", "wall", "rock", "plank"] as const;
type Kind = (typeof KINDS)[number];
const kindOf = (v: string): Kind => KINDS.find((k) => k === v) ?? "crate";

const BOXES: Record<Kind, { w: number; h: number }> = {
    crate: { w: 2, h: 2 },
    metal: { w: 2, h: 2 },
    tile: { w: 2, h: 1 },
    wall: { w: 1, h: 4 },
    rock: { w: 2, h: 2 },
    plank: { w: 1, h: 1 },
};

const WORDS: Record<Kind, string> = {
    crate: "A wooden supply crate on Bolt's planet, nailed shut with a cross of planks, that a spin breaks open to find what is inside",
    metal: "A heavy grey metal block with rivets and a magnet mark, that Bolt's magnet pulls along the ground to make a step",
    tile: "A cracked stone floor tile with a jagged split across it, that Bolt's jets break when they blast down on it",
    wall: "A tall cracked stone wall across Bolt's way, with jagged splits running down it, that a spin knocks down",
    rock: "A round grey boulder with a few chips on it, that a spin sends rolling away along the ground",
    plank: "A broken bit of plank from a crate a spin has smashed, flying off and tumbling as it falls",
};

export const spaceCrate = defineDrawing<{ kind: string }>({
    id: "spacecrate",
    family: "travel",
    title: "Crates and blocks",
    group: "Props",
    about: "What stands in Bolt's way on a planet and what the world is built of: wooden crates to spin open, metal blocks for the magnet, cracked tiles and walls to break, boulders and broken planks.",
    params: { kind: "crate" },
    settings: { kind: { kind: "one of", of: KINDS } },
    takes: KINDS.map((kind) => ({
        label:
            kind === "crate"
                ? "A wooden crate"
                : kind === "metal"
                  ? "A metal block"
                  : kind === "tile"
                    ? "A cracked tile"
                    : kind === "wall"
                      ? "A cracked wall"
                      : kind === "rock"
                        ? "A boulder"
                        : "A broken plank",
        params: { kind },
    })),
    box: (p) => BOXES[kindOf(p.kind)],
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            kind = kindOf(p.kind),
            box = BOXES[kind],
            w = box.w * U,
            h = box.h * U,
            edge = { strokeWidth: 1.4, roughness: 0.25 },
            ink = { strokeWidth: 1.1, stroke: c.paper ? c.t.ink : c.t["ink-soft"], roughness: 0.3 };
        if (kind === "crate") {
            pen.rect(
                g,
                0.1 * U,
                0.1 * U,
                w - 0.2 * U,
                h - 0.2 * U,
                "pencil",
                pen.fill("tang"),
                edge,
            );
            pen.rect(g, 0.35 * U, 0.35 * U, w - 0.7 * U, h - 0.7 * U, "pencil", null, ink);
            pen.line(g, 0.35 * U, 0.35 * U, w - 0.35 * U, h - 0.35 * U, "pencil", ink);
            pen.line(g, w - 0.35 * U, 0.35 * U, 0.35 * U, h - 0.35 * U, "pencil", ink);
        } else if (kind === "metal") {
            pen.rect(
                g,
                0.1 * U,
                0.1 * U,
                w - 0.2 * U,
                h - 0.2 * U,
                "ruler",
                pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                edge,
            );
            for (const [x, y] of [
                [0.35, 0.35],
                [1.65, 0.35],
                [0.35, 1.65],
                [1.65, 1.65],
            ] as const)
                pen.circle(g, x * U, y * U, 0.2 * U, "pencil", pen.fill("card"), {
                    strokeWidth: 0.8,
                    roughness: 0.1,
                });
            pen.path(
                g,
                `M${0.7 * U} ${0.7 * U}V${1.1 * U}Q${0.7 * U} ${1.4 * U} ${U} ${1.4 * U}Q${1.3 * U} ${1.4 * U} ${1.3 * U} ${1.1 * U}V${0.7 * U}`,
                "pencil",
                null,
                { strokeWidth: 3, stroke: c.paper ? c.t.ink : c.t.berry, roughness: 0.2 },
            );
        } else if (kind === "tile") {
            pen.rect(
                g,
                0.05 * U,
                0.1 * U,
                w - 0.1 * U,
                h - 0.2 * U,
                "pencil",
                pen.fill("card"),
                edge,
            );
            pen.path(
                g,
                `M${0.3 * U} ${0.2 * U}L${0.8 * U} ${0.55 * U}L${0.7 * U} ${0.8 * U}M${0.8 * U} ${0.55 * U}L${1.3 * U} ${0.35 * U}L${1.7 * U} ${0.75 * U}`,
                "pencil",
                null,
                { ...ink, strokeWidth: 1.4 },
            );
        } else if (kind === "wall") {
            pen.rect(
                g,
                0.08 * U,
                0.05 * U,
                w - 0.16 * U,
                h - 0.1 * U,
                "pencil",
                pen.fill("card"),
                edge,
            );
            for (let y = 0.9 * U; y < h; y += 0.9 * U)
                pen.line(g, 0.1 * U, y, w - 0.1 * U, y, "pencil", ink);
            pen.path(
                g,
                `M${0.5 * U} ${0.3 * U}L${0.3 * U} ${1.2 * U}L${0.65 * U} ${1.9 * U}L${0.35 * U} ${2.8 * U}L${0.6 * U} ${3.6 * U}`,
                "pencil",
                null,
                { ...ink, strokeWidth: 1.4 },
            );
        } else if (kind === "rock") {
            pen.path(
                g,
                `M${0.25 * U} ${1.4 * U}Q${0.1 * U} ${0.6 * U} ${0.8 * U} ${0.3 * U}Q${1.5 * U} ${0.1 * U} ${1.8 * U} ${0.8 * U}Q${1.95 * U} ${1.6 * U} ${1.3 * U} ${1.85 * U}Q${0.5 * U} ${1.95 * U} ${0.25 * U} ${1.4 * U}Z`,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 5 }),
                edge,
            );
            pen.path(
                g,
                `M${0.7 * U} ${0.8 * U}L${0.95 * U} ${0.9 * U}M${1.2 * U} ${1.3 * U}L${1.4 * U} ${1.15 * U}`,
                "pencil",
                null,
                ink,
            );
        } else {
            pen.rect(g, 0.1 * U, 0.35 * U, 0.8 * U, 0.3 * U, "pencil", pen.fill("tang"), edge);
        }
        return { middle: [w / 2, h / 2, "up"], foot: [w / 2, h, "down"] };
    },
    describe: (p) => `${WORDS[kindOf(p.kind)]}.`,
    motion: { still: "A crate, block or rock moves only as the game knocks or pulls it." },
});
