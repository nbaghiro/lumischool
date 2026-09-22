import { part, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { patch } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const lampPost = defineDrawing({
    id: "lamppost",
    family: "places",
    title: "Street lamp and pillar box",
    group: "Props",
    about: "A street lamp on an iron post with a bar for a ladder under its lantern, and beside it a red pillar box with a slot for letters. Lit, the lantern glows yellow; unlit, its glass is clear, so a question can ask which lamps are lit.",
    params: { lit: 1, letterbox: 1 },
    settings: {
        lit: { kind: "whole", min: 0, max: 1 },
        letterbox: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Lit, with a pillar box", params: { lit: 1, letterbox: 1 } },
        { label: "Unlit, with a pillar box", params: { lit: 0, letterbox: 1 } },
        { label: "Lit, the lamp on its own", params: { lit: 1, letterbox: 0 } },
    ],
    box: (p) => ({ w: p.letterbox > 0 ? 5 : 3, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const lit = p.lit > 0;
        const x = 1.5 * U;
        const ground = 8.8 * U;
        const glass = 1.95 * U;
        const a: RawAnchors = {};
        const iron = pen.fill("ink-soft", "hachure", { hachureGap: 3.2, fillWeight: 0.7 });
        const dark = pen.fill("ink-soft");
        // glow prints as dots, which in and round a lantern read as specks, so on paper the light is drawn as rays
        if (lit && c.paper)
            for (let k = 0; k < 7; k++) {
                const t = Math.PI * (0.62 + k * 0.29);
                pen.line(
                    g,
                    x + Math.cos(t) * 0.85 * U,
                    glass + Math.sin(t) * 0.85 * U,
                    x + Math.cos(t) * 1.25 * U,
                    glass + Math.sin(t) * 1.25 * U,
                    "ruler",
                    calm(c, 1.2),
                );
            }
        else if (lit)
            pen.circle(
                part(c, "glow", [x, glass]).g,
                x,
                glass,
                2.8 * U,
                "pencil",
                pen.fill("glow", "hachure", { hachureGap: 6, fillWeight: 0.6 }),
                { strokeWidth: 0, stroke: "none" },
            );
        pen.polygon(
            g,
            [
                [x - 0.5 * U, ground],
                [x + 0.5 * U, ground],
                [x + 0.5 * U, ground - 0.3 * U],
                [x + 0.36 * U, ground - 0.42 * U],
                [x + 0.25 * U, ground - 1.5 * U],
                [x - 0.25 * U, ground - 1.5 * U],
                [x - 0.36 * U, ground - 0.42 * U],
                [x - 0.5 * U, ground - 0.3 * U],
            ],
            "pencil",
            iron,
            calm(c, 1.7),
        );
        pen.polygon(
            g,
            [
                [x - 0.15 * U, ground - 1.6 * U],
                [x + 0.15 * U, ground - 1.6 * U],
                [x + 0.1 * U, 3.4 * U],
                [x - 0.1 * U, 3.4 * U],
            ],
            "pencil",
            iron,
            calm(c, 1.7),
        );
        pen.rect(
            g,
            x - 0.32 * U,
            ground - 1.72 * U,
            0.64 * U,
            0.24 * U,
            "pencil",
            dark,
            calm(c, 1.4),
        );
        pen.line(g, x - 0.78 * U, 3.35 * U, x + 0.78 * U, 3.35 * U, "ruler", calm(c, 1.7));
        for (const s of [-1, 1])
            pen.circle(g, x + s * 0.82 * U, 3.35 * U, 0.2 * U, "ruler", dark, calm(c, 1.1));
        pen.rect(g, x - 0.2 * U, 3.28 * U, 0.4 * U, 0.2 * U, "pencil", dark, calm(c, 1.2));
        pen.rect(g, x - 0.08 * U, 2.85 * U, 0.16 * U, 0.45 * U, "pencil", dark, calm(c, 1.2));
        pen.polygon(
            g,
            [
                [x - 0.4 * U, 2.62 * U],
                [x + 0.4 * U, 2.62 * U],
                [x + 0.14 * U, 2.9 * U],
                [x - 0.14 * U, 2.9 * U],
            ],
            "pencil",
            iron,
            calm(c, 1.4),
        );
        pen.polygon(
            g,
            [
                [x - 0.3 * U, 2.62 * U],
                [x + 0.3 * U, 2.62 * U],
                [x + 0.52 * U, 1.36 * U],
                [x - 0.52 * U, 1.36 * U],
            ],
            "ruler",
            lit && !c.paper ? pen.fill("glow") : pen.fill("card"),
            calm(c, 1.7),
        );
        for (const s of [-1, 1])
            pen.line(g, x + s * 0.1 * U, 2.62 * U, x + s * 0.18 * U, 1.36 * U, "ruler", calm(c, 1));
        if (lit)
            pen.path(
                g,
                `M${x} ${2.4 * U}Q${x - 0.16 * U} ${2.1 * U} ${x} ${1.72 * U}Q${x + 0.16 * U} ${2.1 * U} ${x} ${2.4 * U}Z`,
                "pencil",
                pen.fill("card"),
                calm(c, 1),
            );
        pen.path(
            g,
            `M${x - 0.56 * U} ${1.22 * U}Q${x - 0.46 * U} ${0.66 * U} ${x} ${0.62 * U}Q${x + 0.46 * U} ${0.66 * U} ${x + 0.56 * U} ${1.22 * U}Z`,
            "pencil",
            iron,
            calm(c, 1.6),
        );
        pen.rect(g, x - 0.66 * U, 1.18 * U, 1.32 * U, 0.2 * U, "pencil", dark, calm(c, 1.4));
        pen.line(g, x, 0.62 * U, x, 0.42 * U, "pencil", calm(c, 1.3));
        pen.circle(g, x, 0.36 * U, 0.2 * U, "pencil", dark, calm(c, 1.1));
        a.top = [x, 0.26 * U, "up"];
        a.lamp = [x + 0.55 * U, glass, "right"];
        if (p.letterbox > 0) {
            const px = 3.75 * U;
            const slot = 5.77 * U;
            const red = pen.fill("berry");
            pen.rect(
                g,
                px - 0.86 * U,
                ground - 0.3 * U,
                1.72 * U,
                0.3 * U,
                "pencil",
                iron,
                calm(c, 1.6),
            );
            pen.rect(
                g,
                px - 0.72 * U,
                5.25 * U,
                1.44 * U,
                ground - 0.3 * U - 5.25 * U,
                "pencil",
                red,
                calm(c, 1.8),
            );
            pen.path(
                g,
                `M${px - 0.8 * U} ${5.05 * U}Q${px - 0.74 * U} ${4.36 * U} ${px} ${4.3 * U}Q${px + 0.74 * U} ${4.36 * U} ${px + 0.8 * U} ${5.05 * U}Z`,
                "pencil",
                red,
                calm(c, 1.7),
            );
            pen.rect(g, px - 0.88 * U, 5.02 * U, 1.76 * U, 0.26 * U, "pencil", red, calm(c, 1.6));
            pen.rect(g, px - 0.52 * U, 6.95 * U, 1.04 * U, 1.3 * U, "pencil", null, {
                ...calm(c, 0.9),
                stroke: c.t["ink-soft"],
            });
            patch(c, px, slot, 1.2 * U, 0.5 * U);
            pen.line(
                g,
                px - 0.52 * U,
                slot - 0.17 * U,
                px + 0.52 * U,
                slot - 0.17 * U,
                "ruler",
                calm(c, 1.4),
            );
            pen.rect(
                g,
                px - 0.42 * U,
                slot - 0.08 * U,
                0.84 * U,
                0.17 * U,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                calm(c, 1.1),
            );
            pen.rect(
                g,
                px - 0.36 * U,
                6.18 * U,
                0.72 * U,
                0.46 * U,
                "pencil",
                pen.fill("card"),
                calm(c, 1.1),
            );
            for (const y of [6.34, 6.48])
                pen.line(g, px - 0.22 * U, y * U, px + 0.22 * U, y * U, "ruler", {
                    ...calm(c, 0.8),
                    stroke: c.t["ink-soft"],
                });
            a.slot = [px + 0.42 * U, slot, "right"];
        }
        pen.line(g, 0.1 * U, ground, (p.letterbox > 0 ? 4.9 : 2.9) * U, ground, "pencil", {
            strokeWidth: 1.8,
        });
        return a;
    },
    describe: (p) =>
        `A street lamp on an iron post with a bar under its lantern, ${p.lit > 0 ? "lit and glowing yellow" : "its glass clear and unlit"}${p.letterbox > 0 ? ", and beside it a red pillar box with a slot for letters" : ""}.`,
    motion: { parts: { glow: { is: "twinkle", dim: 0.35, amt: 0.05, period: 2.6 } } },
});
