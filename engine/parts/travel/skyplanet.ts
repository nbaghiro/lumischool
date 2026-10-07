import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const KINDS = ["ringed", "giant", "small", "earth", "stars"] as const;
type Kind = (typeof KINDS)[number];
const kindOf = (v: string): Kind => KINDS.find((k) => k === v) ?? "ringed";

const WORDS: Record<Kind, string> = {
    ringed: "A pale yellow planet with a tilted ring round it, hanging far off in the sky over one of Bolt's planets",
    giant: "A huge striped gas giant in soft orange and pink bands, hanging far off in the sky over Bolt's planet",
    small: "A small green moon with two craters, floating far off in the sky over one of Bolt's planets",
    earth: "Home seen from far away, a blue and green planet with a wisp of cloud, low in the sky over Bolt's planet",
    stars: "A scatter of little four-pointed stars twinkling in the pale sky above one of Bolt's planets",
};

export const skyPlanet = defineDrawing<{ kind: string }>({
    id: "skyplanet",
    family: "travel",
    title: "Planet in the sky",
    group: "Props",
    about: "What hangs in the sky over Bolt's planets, drawn soft so it stays behind the play: a ringed planet, a striped gas giant, a small moon, home far away, or a scatter of stars.",
    params: { kind: "ringed" },
    settings: { kind: { kind: "one of", of: KINDS } },
    takes: [
        { label: "A ringed planet", params: { kind: "ringed" } },
        { label: "A gas giant", params: { kind: "giant" } },
        { label: "A small moon", params: { kind: "small" } },
        { label: "Home, far away", params: { kind: "earth" } },
        { label: "Stars", params: { kind: "stars" } },
    ],
    box: (p) => (kindOf(p.kind) === "stars" ? { w: 6, h: 3 } : { w: 6, h: 6 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            kind = kindOf(p.kind),
            edge = { strokeWidth: 1.3, roughness: 0.35 },
            soft = { strokeWidth: 1, stroke: c.paper ? c.t.ink : c.t["ink-soft"], roughness: 0.35 };
        if (kind === "stars") {
            for (const [x, y, r] of [
                [0.8, 0.8, 0.35],
                [2.2, 2.1, 0.25],
                [3.4, 0.6, 0.3],
                [4.6, 1.8, 0.4],
                [5.4, 0.7, 0.22],
                [1.5, 2.5, 0.2],
            ] as const) {
                const cx = x * U,
                    cy = y * U,
                    s = r * U;
                pen.path(
                    g,
                    `M${cx} ${cy - s}Q${cx} ${cy} ${cx + s} ${cy}Q${cx} ${cy} ${cx} ${cy + s}Q${cx} ${cy} ${cx - s} ${cy}Q${cx} ${cy} ${cx} ${cy - s}Z`,
                    "pencil",
                    pen.fill("glow"),
                    { strokeWidth: 0.8, roughness: 0.2 },
                );
            }
            return { middle: [3 * U, 1.5 * U, "up"] };
        }
        const cx = 3 * U,
            cy = 3 * U;
        if (kind === "ringed") {
            pen.ellipse(g, cx, cy, 5.6 * U, 1.6 * U, "pencil", null, { ...soft, strokeWidth: 2 });
            pen.circle(g, cx, cy, 3.4 * U, "pencil", pen.fill("glow"), edge);
            pen.path(
                g,
                `M${cx - 2.7 * U} ${cy + 0.2 * U}Q${cx} ${cy + 1.3 * U} ${cx + 2.7 * U} ${cy - 0.2 * U}`,
                "pencil",
                null,
                { ...soft, strokeWidth: 2 },
            );
        } else if (kind === "giant") {
            pen.circle(
                g,
                cx,
                cy,
                5.6 * U,
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 7 }),
                edge,
            );
            for (const dy of [-1.4, -0.3, 0.8, 1.7])
                pen.path(
                    g,
                    `M${cx - Math.sqrt(Math.max(0, 7.6 - dy * dy)) * U} ${cy + dy * U}Q${cx} ${cy + (dy + 0.3) * U} ${cx + Math.sqrt(Math.max(0, 7.6 - dy * dy)) * U} ${cy + dy * U}`,
                    "pencil",
                    null,
                    { ...soft, stroke: c.paper ? c.t.ink : c.t.berry, strokeWidth: 2 },
                );
        } else if (kind === "small") {
            pen.circle(g, cx, cy, 3 * U, "pencil", pen.fill("mint"), edge);
            pen.circle(g, cx - 0.5 * U, cy - 0.3 * U, 0.7 * U, "pencil", null, soft);
            pen.circle(g, cx + 0.6 * U, cy + 0.5 * U, 0.5 * U, "pencil", null, soft);
        } else {
            pen.circle(g, cx, cy, 4 * U, "pencil", pen.fill("sky"), edge);
            pen.path(
                g,
                `M${cx - 1.2 * U} ${cy - 0.8 * U}Q${cx - 0.3 * U} ${cy - 1.4 * U} ${cx + 0.2 * U} ${cy - 0.5 * U}Q${cx - 0.2 * U} ${cy + 0.4 * U} ${cx - 1.2 * U} ${cy - 0.8 * U}Z`,
                "pencil",
                pen.fill("mint"),
                soft,
            );
            pen.path(
                g,
                `M${cx + 0.6 * U} ${cy + 0.4 * U}Q${cx + 1.4 * U} ${cy + 0.2 * U} ${cx + 1.2 * U} ${cy + 1.1 * U}Q${cx + 0.5 * U} ${cy + 1.3 * U} ${cx + 0.6 * U} ${cy + 0.4 * U}Z`,
                "pencil",
                pen.fill("mint"),
                soft,
            );
        }
        return { middle: [cx, cy, "up"] };
    },
    describe: (p) => `${WORDS[kindOf(p.kind)]}.`,
    motion: { still: "Far planets and stars hold still while the game scrolls past them." },
});
