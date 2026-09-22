import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, blade, eye } from "./nature";

export const manta = defineDrawing({
    id: "manta",
    family: "animals",
    title: "Manta ray",
    group: "Characters",
    about: "A manta ray gliding, its wide flat wings longer from tip to tip than a grown-up is tall, two curled fins at the front of its head and a thin tail behind. It flies through the water rather than swimming, and it eats only the tiniest things in the sea.",
    params: { bank: 0 },
    settings: { bank: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Gliding", params: { bank: 0 } },
        { label: "Banking", params: { bank: 1 } },
    ],
    box: () => ({ w: 14, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            b = p.bank > 0 ? 1 : 0,
            cx = 7 * U;
        const lt: Pt = [0.4 * U, (2.3 - b * 1.2) * U],
            rt: Pt = [13.6 * U, (2.3 + b * 1.1) * U];
        const wing =
            `M${cx} ${1.9 * U}C${4.6 * U} ${1.2 * U} ${2 * U} ${(1.4 - b) * U} ${lt[0]} ${lt[1]}C${2.6 * U} ${(3.1 - b * 0.6) * U} ${4.4 * U} ${3.9 * U} ${5.8 * U} ${4.5 * U}` +
            `L${cx} ${4.9 * U}L${8.2 * U} ${4.5 * U}C${9.6 * U} ${(3.9 + b * 0.3) * U} ${11.4 * U} ${(3.1 + b * 0.7) * U} ${rt[0]} ${rt[1]}C${12 * U} ${(1.5 + b * 0.8) * U} ${9.4 * U} ${1.2 * U} ${cx} ${1.9 * U}Z`;
        pen.path(
            g,
            wing,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 4, fillWeight: 0.8 }),
            { strokeWidth: 2 },
        );
        // pale crescents on the shoulders, and the ridge of the body down the middle
        for (const sx of [-1, 1])
            pen.path(
                g,
                `M${cx + sx * 1.1 * U} ${2.75 * U}Q${cx + sx * 2.2 * U} ${2.55 * U} ${cx + sx * 2.7 * U} ${2.95 * U}Q${cx + sx * 2 * U} ${2.9 * U} ${cx + sx * 1.2 * U} ${3.15 * U}Z`,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1 },
            );
        pen.curve(
            g,
            [
                [cx, 2.1 * U],
                [cx - 3, 3.4 * U],
                [cx, 4.8 * U],
            ],
            "pencil",
            { strokeWidth: 1.2 },
        );
        for (const sx of [-1, 1])
            pen.curve(
                g,
                [
                    [cx + sx * 3.4 * U, (2.6 + sx * b * 0.35) * U],
                    [cx + sx * 5.6 * U, (2.55 + sx * b * 0.7) * U],
                ],
                "pencil",
                { strokeWidth: 1, stroke: c.t["ink-soft"] },
            );
        for (const sx of [-1, 1]) {
            pen.polygon(
                g,
                blade(cx + sx * 0.55 * U, 1.95 * U, 1.2 * U, 0.5 * U, sx < 0 ? -1.95 : -1.19),
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 1.3 },
            );
            eye(c, cx + sx * 1.05 * U, 2.25 * U, 4);
        }
        pen.curve(
            g,
            [
                [cx, 4.85 * U],
                [cx + 0.3 * U, 5.8 * U],
                [cx + 0.9 * U, 6.7 * U],
            ],
            "pencil",
            { strokeWidth: 1.6 },
        );
        return {
            head: [cx, 1.7 * U, "up"],
            left: [lt[0], lt[1], "left"],
            right: [rt[0], rt[1], "right"],
            tail: [cx + 0.9 * U, 6.7 * U, "down"],
        };
    },
    describe: () =>
        "A manta ray gliding with its wide flat blue wings spread, pale crescents on its shoulders, two curled fins at its head and a thin tail.",
});
