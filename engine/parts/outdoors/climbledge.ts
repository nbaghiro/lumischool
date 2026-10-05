import type { RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const KINDS = [
    "grass",
    "plank",
    "roof",
    "branch",
    "cloud",
    "stone",
    "mushroom",
    "crate",
    "stall",
    "button",
] as const;
type Kind = (typeof KINDS)[number];

export interface LedgeParams {
    kind: string;
    /** Squares across. */
    w: number;
    /** Squares deep, for the ground, a roof's wall or a stone block; a ledge is drawn at its own depth. */
    h: number;
}

const kindOf = (v: unknown): Kind => KINDS.find((k) => k === v) ?? "grass";
const size = (v: unknown, least: number, most: number, d: number): number =>
    Math.max(least, Math.min(most, Math.round((Number(v) || d) * 2) / 2));

/** The pieces that are a ledge's own depth whatever is asked, as a plank or a cloud is. */
export const DEPTH: Partial<Record<Kind, number>> = {
    plank: 1,
    branch: 1,
    cloud: 2,
    mushroom: 1,
    button: 1,
};

const boxOf = (p: LedgeParams) => {
    const k = kindOf(p.kind);
    return { w: size(p.w, 1, 12, 4), h: DEPTH[k] ?? size(p.h, 1, 12, 3) };
};

const WORDS: Record<Kind, string> = {
    grass: "a strip of grass with tufts along its top over hatched brown earth",
    plank: "a wooden plank with two nails, laid flat as a ledge to stand on",
    roof: "a roof of red tiles in rows over a pale brick wall",
    branch: "a brown branch with a few green leaves, strong enough to stand on",
    cloud: "a soft white cloud with a flat top to stand on",
    stone: "grey stone blocks laid in courses, as a castle or a tower is built",
    mushroom: "a big red mushroom cap with white spots that bounces whoever lands on it",
    crate: "a wooden crate with a cross brace, to climb up on",
    stall: "a market stall's counter under a striped awning edge",
    button: "a round yellow coin button set in the ground",
};

/**
 * What a runner stands on in a climb, seen from the side: the ground, a plank, a roof, a branch, a
 * cloud, stone, a bouncy mushroom, a crate, a market stall and a coin box's button, each drawn to
 * the width it is laid at.
 */
export const climbLedge = defineDrawing<LedgeParams>({
    id: "climbledge",
    family: "outdoors",
    title: "Climbing ledge",
    group: "Structures",
    about: "The ground, planks, roofs, branches, clouds, stone, a bouncy mushroom, crates, a stall and a coin button that a climber runs and jumps across, seen from the side.",
    params: { kind: "grass", w: 4, h: 3 },
    settings: {
        kind: { kind: "one of", of: KINDS },
        w: { kind: "number", min: 1, max: 12, step: 0.5 },
        h: { kind: "number", min: 1, max: 12, step: 0.5 },
    },
    takes: KINDS.map((kind) => ({ label: kind, params: { kind, w: 4, h: 3 } })),
    box: boxOf,
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        const k = kindOf(p.kind),
            b = boxOf(p),
            w = b.w * U,
            h = b.h * U,
            m = 0.15 * U;
        const line = { strokeWidth: 1.4, roughness: 0.4 };
        if (k === "grass") {
            pen.rect(
                g,
                m,
                0.6 * U,
                w - 2 * m,
                h - 0.6 * U - m,
                "pencil",
                pen.fill("tang", "hachure"),
                line,
            );
            pen.rect(g, m, m, w - 2 * m, 0.6 * U, "pencil", pen.fill("mint", "solid"), line);
            for (let x = 0.6 * U; x < w - 0.4 * U; x += 1.4 * U)
                pen.linear(
                    g,
                    [
                        [x - 0.15 * U, 0.2 * U],
                        [x, 0.55 * U],
                        [x + 0.15 * U, 0.2 * U],
                    ],
                    "pencil",
                    { strokeWidth: 1, stroke: c.t.ink },
                );
        } else if (k === "roof") {
            pen.rect(g, m, 0.9 * U, w - 2 * m, h - 0.9 * U - m, "pencil", pen.fill("card"), line);
            for (let y = 1.8 * U; y < h - 0.3 * U; y += 0.8 * U)
                pen.line(g, m, y, w - m, y, "ruler", { strokeWidth: 0.8, stroke: c.t["ink-soft"] });
            pen.rect(g, m, m, w - 2 * m, 0.9 * U, "pencil", pen.fill("berry", "solid"), line);
            for (let x = 0.7 * U; x < w - 0.3 * U; x += 0.7 * U)
                pen.line(g, x, 0.3 * U, x, 0.95 * U, "pencil", {
                    strokeWidth: 0.8,
                    stroke: c.t.ink,
                });
        } else if (k === "stone") {
            pen.rect(g, m, m, w - 2 * m, h - 2 * m, "pencil", pen.fill("grid", "solid"), line);
            for (let y = 0.9 * U, r = 0; y < h - 0.2 * U; y += 0.9 * U, r++) {
                pen.line(g, m, y, w - m, y, "ruler", { strokeWidth: 0.8, stroke: c.t["ink-soft"] });
                for (let x = (r % 2 ? 0.9 : 1.6) * U; x < w - 0.3 * U; x += 1.6 * U)
                    pen.line(g, x, y - 0.9 * U, x, y, "ruler", {
                        strokeWidth: 0.8,
                        stroke: c.t["ink-soft"],
                    });
            }
        } else if (k === "plank") {
            pen.path(
                g,
                roundedRect(m, 0.2 * U, w - 2 * m, 0.6 * U, 4),
                "pencil",
                pen.fill("tang", "solid"),
                line,
            );
            pen.circle(g, 0.6 * U, 0.5 * U, 0.15 * U, "ruler", pen.fill("ink"), {
                strokeWidth: 0.6,
            });
            pen.circle(g, w - 0.6 * U, 0.5 * U, 0.15 * U, "ruler", pen.fill("ink"), {
                strokeWidth: 0.6,
            });
        } else if (k === "branch") {
            pen.path(
                g,
                `M${m} ${0.35 * U}Q${w / 2} ${0.15 * U} ${w - m} ${0.35 * U}L${w - m} ${0.75 * U}Q${w / 2} ${0.6 * U} ${m} ${0.75 * U}Z`,
                "pencil",
                pen.fill("tang", "solid"),
                line,
            );
            for (let x = 0.9 * U; x < w - 0.5 * U; x += 1.5 * U)
                pen.ellipse(g, x, 0.85 * U, 0.6 * U, 0.3 * U, "pencil", pen.fill("mint", "solid"), {
                    strokeWidth: 0.9,
                    roughness: 0.3,
                });
        } else if (k === "cloud") {
            const d = `M${m} ${0.4 * U}H${w - m}Q${w - 0.1 * U} ${1.3 * U} ${w - 0.8 * U} ${1.3 * U}Q${w / 2} ${1.45 * U} ${0.8 * U} ${1.3 * U}Q${0.1 * U} ${1.3 * U} ${m} ${0.4 * U}Z`;
            pen.path(g, d, "pencil", pen.fill("card"), line);
            for (let x = 0.9 * U; x < w - 0.6 * U; x += 1.3 * U)
                pen.path(
                    g,
                    `M${x - 0.3 * U} ${0.42 * U}Q${x} ${0.15 * U} ${x + 0.3 * U} ${0.42 * U}`,
                    "pencil",
                    null,
                    {
                        strokeWidth: 1,
                        stroke: c.t["ink-soft"],
                    },
                );
        } else if (k === "mushroom") {
            pen.rect(
                g,
                w / 2 - 0.35 * U,
                0.5 * U,
                0.7 * U,
                0.4 * U,
                "pencil",
                pen.fill("card"),
                line,
            );
            pen.path(
                g,
                `M${m} ${0.6 * U}Q${w / 2} ${-0.1 * U} ${w - m} ${0.6 * U}Z`,
                "pencil",
                pen.fill("berry", "solid"),
                line,
            );
            for (const f of [0.3, 0.55, 0.75])
                pen.circle(g, w * f, 0.42 * U, 0.18 * U, "ruler", pen.fill("paper"), {
                    strokeWidth: 0.5,
                });
        } else if (k === "crate") {
            pen.rect(g, m, m, w - 2 * m, h - 2 * m, "pencil", pen.fill("tang", "solid"), line);
            pen.line(g, m, m, w - m, h - m, "pencil", { strokeWidth: 1.2 });
            pen.line(g, w - m, m, m, h - m, "pencil", { strokeWidth: 1.2 });
        } else if (k === "stall") {
            pen.rect(g, m, 0.7 * U, w - 2 * m, h - 0.7 * U - m, "pencil", pen.fill("card"), line);
            for (let x = m, i = 0; x < w - m - 1e-6; x += 0.5 * U, i++)
                pen.rect(
                    g,
                    x,
                    m,
                    Math.min(0.5 * U, w - m - x),
                    0.6 * U,
                    "ruler",
                    pen.fill(i % 2 ? "card" : "glow", "solid"),
                    {
                        strokeWidth: 0.8,
                    },
                );
        } else {
            pen.path(
                g,
                roundedRect(m, 0.05 * U, w - 2 * m, 0.4 * U, 5),
                "pencil",
                pen.fill("glow", "solid"),
                line,
            );
        }
        return { top: [w / 2, 0, "up"] };
    },
    describe: (p) => {
        const k = kindOf(p.kind),
            b = boxOf(p);
        return `Seen from the side, ${WORDS[k]}, ${b.w} squares across, for a climber to run and jump on.`;
    },
    motion: { still: "A ledge stays where it is laid, unless the game moves it to and fro." },
});
