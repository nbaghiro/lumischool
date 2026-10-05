import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const HATS = ["red", "blue"] as const;

export const golfGnome = defineDrawing<{ hat: string }>({
    id: "golfgnome",
    family: "sport",
    title: "Garden gnome",
    group: "Props",
    about: "A small garden gnome standing on a putting course, with a tall red hat, a round face and a white beard, who walks a track and blocks a ball.",
    params: { hat: "red" },
    settings: { hat: { kind: "one of", of: HATS } },
    takes: [
        { label: "Red hat", params: { hat: "red" } },
        { label: "Blue hat", params: { hat: "blue" } },
    ],
    box: () => ({ w: 2, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c;
        pen.ellipse(g, U, 2.35 * U, 1.5 * U, 0.6 * U, "pencil", pen.fill("mint", "solid"), {
            strokeWidth: 1.2,
            roughness: 0.3,
        });
        pen.path(
            g,
            `M${0.45 * U} ${2.35 * U}Q${U} ${1.45 * U} ${1.55 * U} ${2.35 * U}Z`,
            "pencil",
            pen.fill("sky", "solid"),
            { strokeWidth: 1.3, roughness: 0.3 },
        );
        pen.circle(g, U, 1.42 * U, 0.7 * U, "pencil", pen.fill("glow", "solid"), {
            strokeWidth: 1.2,
            roughness: 0.2,
        });
        pen.path(
            g,
            `M${0.7 * U} ${1.5 * U}Q${U} ${2.15 * U} ${1.3 * U} ${1.5 * U}Z`,
            "pencil",
            pen.fill("paper", "solid"),
            { strokeWidth: 1, roughness: 0.3 },
        );
        pen.polygon(
            g,
            [
                [0.62 * U, 1.25 * U],
                [U, 0.38 * U],
                [1.38 * U, 1.25 * U],
            ],
            "pencil",
            pen.fill(p.hat === "blue" ? "sky" : "berry", "solid"),
            { strokeWidth: 1.3, roughness: 0.3 },
        );
        return { hat: [U, 0.38 * U, "up"] };
    },
    describe: (p) =>
        `A small garden gnome on a putting course with a tall ${p.hat === "blue" ? "blue" : "red"} pointed hat, a round face, a white beard and a coat, standing on a green base.`,
});
