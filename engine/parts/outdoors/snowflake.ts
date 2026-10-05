import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const KINDS = ["star", "dot"] as const;

export const snowflake = defineDrawing<{ kind: string }>({
    id: "snowflake",
    family: "outdoors",
    title: "Snowflake",
    group: "Props",
    about: "A single falling snowflake, a small six-armed star or a soft round flake, drawn pale so many of them can drift over a winter scene without hiding it.",
    params: { kind: "star" },
    settings: { kind: { kind: "one of", of: KINDS } },
    takes: [
        { label: "A six-armed flake", params: { kind: "star" } },
        { label: "A soft round flake", params: { kind: "dot" } },
    ],
    box: () => ({ w: 1, h: 1 }),
    draw: (c, p) => {
        const cx = 0.5 * U,
            cy = 0.5 * U,
            stroke = c.paper ? c.t.ink : c.t.sky;
        if (p.kind === "dot") {
            if (!c.paper)
                plain(c, { kind: "circle", cx, cy, r: 0.3 * U, fill: c.t.card, opacity: 1 });
            plain(c, {
                kind: "circle",
                cx,
                cy,
                r: 0.3 * U,
                fill: "none",
                stroke,
                width: 0.9,
                opacity: 0.7,
            });
            return {};
        }
        for (let i = 0; i < 3; i++) {
            const a = (i * Math.PI) / 3,
                dx = Math.cos(a) * 0.38 * U,
                dy = Math.sin(a) * 0.38 * U;
            plain(c, {
                kind: "path",
                d: `M${cx - dx} ${cy - dy}L${cx + dx} ${cy + dy}`,
                fill: "none",
                stroke,
                width: 1.1,
                cap: "round",
                opacity: 0.85,
            });
        }
        return {};
    },
    describe: (p) =>
        p.kind === "dot"
            ? "A single soft round snowflake, white with a pale blue rim, small enough to drift over a winter scene in their dozens."
            : "A single small snowflake with six pale blue arms meeting in the middle, small enough to drift over a winter scene in their dozens.",
    motion: { still: "A flake is moved by the scene it falls in, never by itself." },
});
