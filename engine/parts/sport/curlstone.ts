import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const TEAMS = ["ours", "theirs"] as const;

export const curlStone = defineDrawing<{ team: string }>({
    id: "curlstone",
    family: "sport",
    title: "Curling stone",
    group: "Props",
    about: "A curling stone seen from above: a round granite body with a speckled top and a darker band, a soft shadow on the ice, and a handle across it in its team's colour.",
    params: { team: "ours" },
    settings: { team: { kind: "one of", of: TEAMS } },
    takes: [
        { label: "Charlie's team", params: { team: "ours" } },
        { label: "The blue team", params: { team: "theirs" } },
    ],
    box: () => ({ w: 1, h: 1 }),
    draw: (c, p) => {
        const cx = 0.5 * U,
            cy = 0.5 * U,
            r = 0.4 * U,
            tint = p.team === "theirs" ? "sky" : "tang";
        if (!c.paper) {
            plain(c, {
                kind: "circle",
                cx: cx + 0.05 * U,
                cy: cy + 0.06 * U,
                r,
                fill: c.t.ink,
                opacity: 0.16,
            });
            plain(c, { kind: "circle", cx, cy, r, fill: c.t["ink-soft"], opacity: 0.32 });
            plain(c, { kind: "circle", cx, cy, r: r * 0.72, fill: c.t.card, opacity: 0.55 });
            for (let i = 0; i < 7; i++) {
                const a = i * 2.39,
                    d = r * (0.25 + (i % 3) * 0.17);
                plain(c, {
                    kind: "circle",
                    cx: cx + Math.cos(a) * d,
                    cy: cy + Math.sin(a) * d,
                    r: 0.025 * U,
                    fill: c.t["ink-soft"],
                    opacity: 0.6,
                });
            }
        }
        // the band of the team's colour round the granite, so a stone's side reads from across the pond
        if (!c.paper)
            plain(c, {
                kind: "circle",
                cx,
                cy,
                r: r * 0.86,
                fill: "none",
                stroke: c.t[tint],
                width: 2.6,
                opacity: 0.7,
            });
        c.pen.circle(c.g, cx, cy, r * 2, "ruler", null, { strokeWidth: 1.3, roughness: 0.2 });
        // the handle runs across the stone's middle, so its turn on the ice can be seen
        c.pen.path(
            c.g,
            `M${cx - r * 0.62} ${cy + 0.06 * U}Q${cx} ${cy - 0.18 * U} ${cx + r * 0.62} ${cy + 0.06 * U}`,
            "ruler",
            null,
            { strokeWidth: 3.2, stroke: c.paper ? c.t.ink : c.t[tint], roughness: 0.15 },
        );
        return { handle: [cx, cy, "up"] };
    },
    describe: (p) =>
        `A round granite curling stone seen from above, speckled grey with a ${p.team === "theirs" ? "blue" : "orange"} handle across its top and a soft shadow on the ice beside it.`,
});
