import { letter } from "../../ink/surface";
import { starPoints } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";

export const mapTitle = defineDrawing({
    id: "maptitle",
    family: "travel",
    title: "Map title",
    group: "Marks",
    about: "The scroll a map's name is written on, with its ends rolled up and a line under the name for whose map it is and when it was begun. It is the first thing read on a map, so the name is written large, in the hand.",
    params: { title: "The map", sub: "Drawn as we go", width: 22 },
    settings: {
        title: { kind: "text", most: 24 },
        sub: { kind: "text", most: 30 },
        width: { kind: "whole", min: 12, max: 36 },
    },
    takes: [
        {
            label: "A child's map",
            params: { title: "Maya's map", sub: "Begun on the third of August", width: 22 },
        },
        {
            label: "Short and narrow",
            params: { title: "Our island", sub: "Drawn as we go", width: 14 },
        },
    ],
    box: (p) => ({ w: Math.max(12, Math.min(36, Math.round(p.width))), h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            W = Math.max(12, Math.min(36, Math.round(p.width))) * U,
            x0 = 1.5 * U,
            x1 = W - 1.5 * U,
            y0 = 1.3 * U,
            y1 = 5.7 * U;
        const sag = 0.25 * U;
        pen.path(
            g,
            `M${x0} ${y0}Q${W / 2} ${y0 - sag * 2} ${x1} ${y0}L${x1} ${y1}Q${W / 2} ${y1 - sag * 2} ${x0} ${y1}Z`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 2.2 },
        );
        // the rolled ends, shaded on the inside of the roll
        for (const [x, s] of [
            [x0, -1],
            [x1, 1],
        ] as const) {
            pen.ellipse(
                g,
                x,
                (y0 + y1) / 2,
                1.1 * U,
                y1 - y0 + 0.5 * U,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1.8 },
            );
            pen.path(
                g,
                `M${x - s * 0.1 * U} ${y0 - 0.1 * U}Q${x + s * 0.5 * U} ${(y0 + y1) / 2} ${x - s * 0.1 * U} ${y1 + 0.1 * U}`,
                "pencil",
                null,
                { strokeWidth: 1, stroke: c.t["ink-soft"] },
            );
            pen.arc(
                g,
                x + s * 0.05 * U,
                y0 + 0.1 * U,
                0.6 * U,
                0.5 * U,
                Math.PI * 0.1,
                Math.PI * 1.7,
                "pencil",
                { strokeWidth: 1.3 },
            );
            pen.arc(
                g,
                x + s * 0.05 * U,
                y1 - 0.1 * U,
                0.6 * U,
                0.5 * U,
                Math.PI * 1.1,
                Math.PI * 2.6,
                "pencil",
                { strokeWidth: 1.3 },
            );
        }
        // a name that is too long for the scroll is written smaller rather than running off it
        const stars = W >= 18 * U,
            room = x1 - x0 - (stars ? 4.4 : 1.6) * U,
            size = Math.max(16, Math.min(38, room / Math.max(1, p.title.length * 0.62)));
        letter(c, {
            x: W / 2,
            y: 3.35 * U + size * 0.36,
            s: p.title,
            face: "hand",
            weight: 760,
            size: Number(size.toFixed(1)),
            informal: 100,
            bounce: 30,
            fill: c.t.ink,
            anchor: "middle",
        });
        if (p.sub) soft(c, W / 2, 5.05 * U, p.sub, 13);
        if (stars)
            for (const x of [x0 + 1.1 * U, x1 - 1.1 * U])
                pen.polygon(g, starPoints(x, 3.2 * U, 9, 5, 0.45), "pencil", pen.fill("glow"), {
                    strokeWidth: 1.1,
                });
        return { title: [W / 2, y0, "up"], below: [W / 2, y1, "down"] };
    },
    describe: (p) =>
        `A scroll with rolled yellow ends and a name written large across it in a hand face${p.sub ? ", with a smaller line written underneath" : ""}.`,
});
