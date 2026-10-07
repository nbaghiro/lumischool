import type { RawAnchors } from "../../ink/surface";
import { U, type TokenName } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

const COLOURS = ["sky", "mint", "berry", "tang", "glow"] as const;
type Colour = (typeof COLOURS)[number];
const colourOf = (v: string): Colour => COLOURS.find((k) => k === v) ?? "sky";

const MOODS = ["awake", "asleep", "cheer"] as const;
type Mood = (typeof MOODS)[number];
const moodOf = (v: string): Mood => MOODS.find((k) => k === v) ?? "awake";

const NAMES: Record<Colour, string> = {
    sky: "blue",
    mint: "green",
    berry: "pink",
    tang: "orange",
    glow: "yellow",
};

export const crewBot = defineDrawing<{ colour: string; mood: string; n: number }>({
    id: "crewbot",
    family: "travel",
    title: "Crew robot",
    group: "Characters",
    about: "One of the lost crew Bolt rescues: a small round robot in a bright colour with a big eye screen, stubby arms and a number on its tummy, awake, asleep or cheering.",
    params: { colour: "sky", mood: "awake", n: 1 },
    settings: {
        colour: { kind: "one of", of: COLOURS },
        mood: { kind: "one of", of: MOODS },
        n: { kind: "whole", min: 0, max: 9 },
    },
    takes: [
        { label: "A blue one waiting", params: { colour: "sky", mood: "awake", n: 1 } },
        { label: "A green one asleep", params: { colour: "mint", mood: "asleep", n: 2 } },
        { label: "A pink one cheering", params: { colour: "berry", mood: "cheer", n: 5 } },
        { label: "An orange one", params: { colour: "tang", mood: "awake", n: 1 } },
        { label: "A yellow one with no number", params: { colour: "glow", mood: "awake", n: 0 } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            colour: TokenName = colourOf(p.colour),
            mood = moodOf(p.mood),
            edge = { strokeWidth: 1.3, roughness: 0.25 },
            ink = { strokeWidth: 1.5, stroke: c.t.ink, roughness: 0.2 },
            cx = U;
        // stubby arms behind the body: down at the sides, or up for a cheer
        for (const side of [-1, 1]) {
            const up = mood === "cheer";
            pen.line(
                g,
                cx + side * 0.55 * U,
                1.15 * U,
                cx + side * 0.85 * U,
                up ? 0.55 * U : 1.45 * U,
                "pencil",
                ink,
            );
            pen.circle(
                g,
                cx + side * 0.85 * U,
                up ? 0.5 * U : 1.5 * U,
                0.4 * U,
                "pencil",
                pen.fill(colour),
                edge,
            );
        }
        for (const side of [-1, 1])
            pen.ellipse(
                g,
                cx + side * 0.3 * U,
                1.88 * U,
                0.38 * U,
                0.2 * U,
                "pencil",
                pen.fill("ink-soft"),
                edge,
            );
        pen.path(
            g,
            `M${0.35 * U} ${0.9 * U}Q${0.35 * U} ${0.35 * U} ${cx} ${0.35 * U}Q${1.65 * U} ${0.35 * U} ${1.65 * U} ${0.9 * U}V${1.45 * U}Q${1.65 * U} ${1.82 * U} ${cx} ${1.82 * U}Q${0.35 * U} ${1.82 * U} ${0.35 * U} ${1.45 * U}Z`,
            "pencil",
            pen.fill(colour),
            edge,
        );
        pen.line(g, cx, 0.35 * U, cx, 0.12 * U, "pencil", ink);
        pen.circle(g, cx, 0.14 * U, 0.26 * U, "pencil", pen.fill("glow"), edge);
        pen.rect(g, 0.55 * U, 0.55 * U, 0.9 * U, 0.5 * U, "pencil", pen.fill("card"), edge);
        if (mood === "asleep")
            for (const dx of [-0.2, 0.2])
                pen.path(
                    g,
                    `M${cx + (dx - 0.1) * U} ${0.8 * U}Q${cx + dx * U} ${0.9 * U} ${cx + (dx + 0.1) * U} ${0.8 * U}`,
                    "pencil",
                    null,
                    ink,
                );
        else
            for (const dx of [-0.2, 0.2])
                pen.circle(g, cx + dx * U, 0.8 * U, 0.2 * U, "pencil", pen.fill("ink"), {
                    strokeWidth: 0.5,
                    roughness: 0.1,
                });
        const n = Math.max(0, Math.min(9, Math.round(p.n)));
        if (n > 0) {
            pen.circle(g, cx, 1.4 * U, 0.72 * U, "pencil", pen.fill("card"), edge);
            num(c, cx, 1.4 * U + 5, n, 14, "middle", c.t.ink);
        }
        return { feet: [cx, 2 * U, "down"], tummy: [cx, 1.42 * U, "right"] };
    },
    describe: (p) => {
        const mood = moodOf(p.mood),
            n = Math.round(p.n);
        return `A small round ${NAMES[colourOf(p.colour)]} crew robot with an eye screen and stubby arms${n > 0 ? `, the number ${n} on its tummy` : ""}, ${mood === "asleep" ? "fast asleep with its eyes shut" : mood === "cheer" ? "cheering with its arms up" : "waiting to be rescued"}.`;
    },
    motion: { still: "A crew robot moves only as the game walks it after Bolt." },
});
