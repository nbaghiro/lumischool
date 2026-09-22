import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const tap = defineDrawing({
    id: "tap",
    family: "measuring",
    title: "Tap",
    group: "Props",
    about: "A tap on the wall with its handle on top and its spout turned down, running or off. A jug is filled by holding it under the spout, which is where a game puts the place to fill one.",
    params: { running: false },
    settings: { running: { kind: "flag" } },
    takes: [
        { label: "Off", params: { running: false } },
        { label: "Running", params: { running: true } },
    ],
    box: () => ({ w: 6, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const metal = pen.fill("grid", "solid", { hachureGap: 5 });
        pen.path(
            g,
            `M${0.3 * U} ${0.9 * U}H${1.3 * U}V${3.1 * U}H${0.3 * U}Z`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.8 },
        );
        pen.line(g, 2.6 * U, 1.35 * U, 2.6 * U, 0.75 * U, "pencil", { strokeWidth: 2.4 });
        pen.line(g, 1.9 * U, 0.7 * U, 3.3 * U, 0.7 * U, "pencil", { strokeWidth: 3 });
        for (const x of [1.9, 3.3])
            pen.circle(g, x * U, 0.7 * U, 0.45 * U, "pencil", pen.fill("berry", "solid"), {
                strokeWidth: 1.2,
            });
        pen.path(
            g,
            `M${1.3 * U} ${1.35 * U}H${4.3 * U}Q${5 * U} ${1.35 * U} ${5 * U} ${2.05 * U}V${3.1 * U}H${4.3 * U}V${2.05 * U}H${1.3 * U}Z`,
            "pencil",
            metal,
            { strokeWidth: 1.8 },
        );
        if (p.running) {
            pen.rect(g, 4.45 * U, 3.1 * U, 0.4 * U, 3.7 * U, "pencil", pen.fill("sky", "solid"), {
                strokeWidth: 0.8,
                stroke: c.t["ink-soft"],
            });
            for (const [dx, dy] of [
                [-0.35, 5.6],
                [0.45, 6.1],
            ] as const)
                pen.circle(
                    g,
                    (4.65 + dx) * U,
                    dy * U,
                    0.25 * U,
                    "pencil",
                    pen.fill("sky", "solid"),
                    { strokeWidth: 0.6, stroke: c.t["ink-soft"] },
                );
        }
        return { spout: [4.65 * U, 3.1 * U, "down"], under: [4.65 * U, 6.8 * U, "down"] };
    },
    describe: (p) =>
        `A grey metal tap on a wall with a red handle on top and its spout turned down, ${p.running ? "water running from the spout in a blue stream" : "turned off with nothing running from it"}.`,
});
