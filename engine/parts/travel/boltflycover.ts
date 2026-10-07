import { plain, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

export const boltFlyCover = defineDrawing<{ stars: number }>({
    id: "boltflycover",
    family: "travel",
    title: "Bolt's sky flight",
    group: "Props",
    about: "The robot flying game in one picture: Bolt jetting straight up past soft clouds on two long flames, a ringed planet waiting high above, and numbered stars to catch on the way.",
    params: { stars: 2 },
    settings: { stars: { kind: "whole", min: 1, max: 2 } },
    takes: [
        { label: "Two stars to catch", params: { stars: 2 } },
        { label: "One star left", params: { stars: 1 } },
    ],
    box: () => ({ w: 12, h: 14 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            edge = { strokeWidth: 1.3, roughness: 0.3 },
            ink = { strokeWidth: 1.5, stroke: c.t.ink, roughness: 0.2 },
            soft = { strokeWidth: 1, stroke: c.paper ? c.t.ink : c.t["ink-soft"], roughness: 0.3 };
        if (!c.paper)
            plain(c, {
                kind: "path",
                d: `M${0.5 * U} ${5 * U}C${3 * U} ${3.6 * U} ${6 * U} ${6.2 * U} ${11.5 * U} ${4.4 * U}`,
                fill: "none",
                stroke: c.t.mint,
                width: 1.1 * U,
                cap: "round",
                opacity: 0.3,
            });
        // the ringed planet high above
        pen.ellipse(g, 8.6 * U, 2.2 * U, 5.4 * U, 1.3 * U, "pencil", null, {
            ...soft,
            strokeWidth: 1.8,
        });
        pen.circle(g, 8.6 * U, 2.2 * U, 3.2 * U, "pencil", pen.fill("glow"), edge);
        // clouds below, which Bolt has just climbed out of
        for (const [x, y, w] of [
            [2.4, 12.4, 4.4],
            [8.8, 12.9, 5.4],
        ] as const)
            pen.path(
                g,
                `M${(x - w / 2) * U} ${y * U}Q${(x - w / 2) * U} ${(y - 1) * U} ${(x - w / 4) * U} ${(y - 1) * U}Q${(x - w / 6) * U} ${(y - 1.8) * U} ${x * U} ${(y - 1.4) * U}Q${(x + w / 5) * U} ${(y - 1.9) * U} ${(x + w / 3) * U} ${(y - 1) * U}Q${(x + w / 2) * U} ${(y - 1) * U} ${(x + w / 2) * U} ${y * U}Z`,
                "pencil",
                pen.fill("card"),
                edge,
            );
        // the stars still to catch
        const stars = Math.max(1, Math.min(2, Math.round(p.stars)));
        const spots: readonly (readonly [number, number, number])[] = [
            [2.2, 3.4, 5],
            [9.8, 7.4, 10],
        ];
        for (const [x, y, n] of spots.slice(0, stars)) {
            const pts = Array.from({ length: 10 }, (_, i): [number, number] => {
                const a = -Math.PI / 2 + (i * Math.PI) / 5,
                    d = (i % 2 ? 0.45 : 0.85) * U;
                return [x * U + Math.cos(a) * d, y * U + Math.sin(a) * d];
            });
            pen.polygon(g, pts, "pencil", pen.fill("glow", "solid"), edge);
            num(c, x * U, (y + 0.25) * U, n, 13, "middle", c.t.ink);
        }
        // Bolt, flying straight up on two long flames, its arms reaching high
        const bx = 5.2 * U,
            by = 5.6 * U;
        for (const dx of [-0.3, 0.3]) {
            pen.path(
                g,
                `M${bx + (dx - 0.22) * U} ${by + 2.9 * U}Q${bx + dx * U} ${by + 5 * U} ${bx + (dx + 0.22) * U} ${by + 2.9 * U}Z`,
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
                by + 1.4 * U,
                bx + side * 0.9 * U,
                by + 0.2 * U,
                "pencil",
                ink,
            );
            pen.circle(
                g,
                bx + side * 0.95 * U,
                by + 0.1 * U,
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
                {
                    strokeWidth: 0.5,
                    roughness: 0.1,
                },
            );
        return { bolt: [bx, by + U, "up"] };
    },
    describe: (p) =>
        `Bolt the little white robot jetting straight up past soft clouds on two long flames, a ringed planet above, and ${Math.round(p.stars) === 1 ? "one numbered star" : "two numbered stars"} to catch.`,
    motion: { still: "A cover picture holds still on the games list." },
});
