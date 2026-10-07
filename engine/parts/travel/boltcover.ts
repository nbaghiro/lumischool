import type { RawAnchors } from "../../ink/surface";
import { U, type TokenName } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

export const boltCover = defineDrawing<{ crew: number }>({
    id: "boltcover",
    family: "travel",
    title: "Bolt's rescue",
    group: "Props",
    about: "The robot rescue game in one picture: Bolt hovering on two little jet flames over a grey moon, a ringed planet in the sky, and numbered crew robots waiting below.",
    params: { crew: 3 },
    settings: { crew: { kind: "whole", min: 1, max: 3 } },
    takes: [
        { label: "Three crew waiting", params: { crew: 3 } },
        { label: "One left to find", params: { crew: 1 } },
    ],
    box: () => ({ w: 14, h: 10 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            edge = { strokeWidth: 1.3, roughness: 0.3 },
            ink = { strokeWidth: 1.5, stroke: c.t.ink, roughness: 0.2 },
            soft = { strokeWidth: 1, stroke: c.paper ? c.t.ink : c.t["ink-soft"], roughness: 0.3 };
        // the ringed planet far off
        pen.ellipse(g, 10.6 * U, 2.2 * U, 4.6 * U, 1.2 * U, "pencil", null, {
            ...soft,
            strokeWidth: 1.8,
        });
        pen.circle(g, 10.6 * U, 2.2 * U, 2.8 * U, "pencil", pen.fill("glow"), edge);
        // the moon's ground, with its craters
        pen.rect(
            g,
            0.1 * U,
            8 * U,
            13.8 * U,
            1.9 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 6 }),
            edge,
        );
        pen.rect(g, 0.1 * U, 8 * U, 13.8 * U, 0.45 * U, "pencil", pen.fill("card"), edge);
        for (const x of [2, 7.5, 12])
            pen.ellipse(g, x * U, 9.2 * U, 1 * U, 0.35 * U, "pencil", null, soft);
        // the crew waiting below
        const tones: TokenName[] = ["mint", "berry", "tang"];
        for (let k = 0; k < Math.max(1, Math.min(3, Math.round(p.crew))); k++) {
            const x = (8.2 + k * 1.8) * U,
                y = 7.2 * U,
                tone = tones[k] ?? "mint";
            pen.path(
                g,
                `M${x - 0.7 * U} ${y - 0.2 * U}Q${x - 0.7 * U} ${y - 1 * U} ${x} ${y - 1 * U}Q${x + 0.7 * U} ${y - 1 * U} ${x + 0.7 * U} ${y - 0.2 * U}V${y + 0.3 * U}Q${x + 0.7 * U} ${y + 0.75 * U} ${x} ${y + 0.75 * U}Q${x - 0.7 * U} ${y + 0.75 * U} ${x - 0.7 * U} ${y + 0.3 * U}Z`,
                "pencil",
                pen.fill(tone),
                edge,
            );
            pen.circle(g, x, y + 0.15 * U, 0.75 * U, "pencil", pen.fill("card"), edge);
            num(c, x, y + 0.15 * U + 5, [1, 2, 5][k] ?? 1, 14, "middle", c.t.ink);
            pen.rect(
                g,
                x - 0.4 * U,
                y - 0.8 * U,
                0.8 * U,
                0.4 * U,
                "pencil",
                pen.fill("card"),
                edge,
            );
        }
        // Bolt, hovering on two jets
        const bx = 4.2 * U,
            by = 3.4 * U;
        for (const dx of [-0.3, 0.3]) {
            pen.path(
                g,
                `M${bx + (dx - 0.2) * U} ${by + 2.9 * U}Q${bx + dx * U} ${by + 4.1 * U} ${bx + (dx + 0.2) * U} ${by + 2.9 * U}Z`,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1, stroke: c.paper ? c.t.ink : c.t["glow-ink"], roughness: 0.3 },
            );
            pen.line(g, bx + dx * 0.5 * U, by + 2.2 * U, bx + dx * U, by + 2.8 * U, "pencil", ink);
        }
        for (const side of [-1, 1]) {
            pen.line(
                g,
                bx + side * 0.5 * U,
                by + 1.5 * U,
                bx + side * 1.3 * U,
                by + 1.5 * U,
                "pencil",
                ink,
            );
            pen.circle(
                g,
                bx + side * 1.4 * U,
                by + 1.5 * U,
                0.4 * U,
                "pencil",
                pen.fill("card"),
                edge,
            );
        }
        pen.rect(g, bx - 0.5 * U, by + 1.3 * U, U, 0.95 * U, "pencil", pen.fill("card"), edge);
        pen.circle(g, bx, by + 1.75 * U, 0.4 * U, "pencil", pen.fill("sky"), edge);
        pen.line(g, bx, by - 0.2 * U, bx, by + 0.1 * U, "pencil", ink);
        pen.circle(g, bx, by - 0.3 * U, 0.32 * U, "pencil", pen.fill("glow"), edge);
        pen.ellipse(g, bx, by + 0.7 * U, 1.4 * U, 1.2 * U, "pencil", pen.fill("card"), edge);
        pen.ellipse(g, bx, by + 0.75 * U, 1 * U, 0.65 * U, "pencil", pen.fill("ink-soft"), edge);
        for (const dx of [-0.2, 0.2])
            pen.ellipse(
                g,
                bx + dx * U,
                by + 0.75 * U,
                0.15 * U,
                0.25 * U,
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 0.5, roughness: 0.1 },
            );
        return { bolt: [bx, by + U, "up"] };
    },
    describe: (p) =>
        `Bolt the little white robot hovering on two jet flames over a grey moon, a ringed planet behind, and ${Math.round(p.crew) === 1 ? "one numbered crew robot" : `${Math.round(p.crew)} numbered crew robots`} waiting below.`,
    motion: { still: "A cover picture holds still on the games list." },
});
