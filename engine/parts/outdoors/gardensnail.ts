import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** A garden snail side on, its spiral shell on its back and its feelers up, facing right. */
export const gardenSnail = defineDrawing<{ hiding: boolean }>({
    id: "gardensnail",
    family: "outdoors",
    title: "Garden snail",
    group: "Characters",
    about: "A garden snail seen from the side with a spiral shell on its back, a soft body and two feelers up, or tucked inside its shell when shooed away.",
    params: { hiding: false },
    settings: { hiding: { kind: "flag" } },
    takes: [
        { label: "Out, feelers up", params: { hiding: false } },
        { label: "Hiding in its shell", params: { hiding: true } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p) => {
        const base = 1.75 * U;
        if (!p.hiding) {
            c.pen.path(
                c.g,
                `M${0.2 * U} ${base}L${1.75 * U} ${base}Q${1.9 * U} ${base - 0.5 * U} ${1.55 * U} ${base - 0.45 * U}L${0.4 * U} ${base - 0.3 * U}Z`,
                "pencil",
                c.pen.fill("glow", "hachure"),
                { strokeWidth: 1.1 },
            );
            for (const dx of [0, 0.22])
                c.pen.line(
                    c.g,
                    (1.5 + dx) * U,
                    base - 0.45 * U,
                    (1.6 + dx * 1.6) * U,
                    base - 1.05 * U,
                    "pencil",
                    {
                        strokeWidth: 1,
                    },
                );
        }
        c.pen.circle(
            c.g,
            0.95 * U,
            base - 0.65 * U,
            1.15 * U,
            "pencil",
            c.pen.fill("tang", "solid"),
            {
                strokeWidth: 1.3,
            },
        );
        c.pen.path(
            c.g,
            `M${0.95 * U} ${base - 0.65 * U}m${0.15 * U} 0a${0.15 * U} ${0.15 * U} 0 1 0 ${-0.3 * U} 0a${0.32 * U} ${0.32 * U} 0 1 0 ${0.6 * U} 0`,
            "pencil",
            null,
            { strokeWidth: 0.9 },
        );
        return {};
    },
    describe: (p) =>
        p.hiding
            ? "A garden snail tucked right inside its round spiral shell, seen from the side, after being shooed off a plant."
            : "A garden snail seen from the side, its spiral shell on its back, its soft body stretched out and two feelers up.",
});
