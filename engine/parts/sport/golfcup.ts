import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const golfCup = defineDrawing({
    id: "golfcup",
    family: "sport",
    title: "Garden golf hole",
    group: "Props",
    about: "A dark circular putting hole centred exactly in its box. A little yellow flag stands at its upper-right edge, keeping the opening clear.",
    params: { flag: true },
    settings: { flag: { kind: "flag" } },
    takes: [
        { label: "With a flag", params: { flag: true } },
        { label: "Just the cup", params: { flag: false } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p) => {
        c.pen.circle(c.g, U, U, 1.2 * U, "pencil", c.pen.fill("ink", "solid"), {
            strokeWidth: 1.3,
            roughness: 0.2,
        });
        if (p.flag) {
            c.pen.line(c.g, 1.52 * U, 0.87 * U, 1.52 * U, 0.06 * U, "pencil", { strokeWidth: 1.7 });
            c.pen.polygon(
                c.g,
                [
                    [1.52 * U, 0.06 * U],
                    [1.96 * U, 0.13 * U],
                    [1.82 * U, 0.28 * U],
                    [1.96 * U, 0.41 * U],
                    [1.52 * U, 0.39 * U],
                ],
                "pencil",
                c.pen.fill("glow", "solid"),
                { strokeWidth: 1.2, roughness: 0.3 },
            );
        }
        return { hole: [U, U, "up"] };
    },
    describe: (p) =>
        p.flag
            ? "A dark circular putting hole seen from above, with a small yellow flag standing beside its upper-right edge and leaving the opening clear."
            : "A dark circular putting hole seen from above, its round opening centred in a small patch of clear space on the course.",
});
