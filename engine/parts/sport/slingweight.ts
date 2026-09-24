import { U } from "../../paper";
import { defineDrawing } from "../drawing";
export const slingWeight = defineDrawing({
    id: "slingweight",
    family: "sport",
    title: "Rolling stone",
    group: "Props",
    about: "A round, heavy grey stone with a curved seam and a pale gleam. The circle fills its two-square box and turns about its centre.",
    params: {},
    settings: {},
    takes: [
        { label: "Round stone", params: {}, seed: 0 },
        { label: "Another stone", params: {}, seed: 391 },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c) => {
        c.pen.circle(c.g, U, U, 2 * U, "pencil", c.pen.fill("grid", "solid"), {
            strokeWidth: 1.8,
            roughness: 0.25,
        });
        c.pen.path(
            c.g,
            `M${0.35 * U} ${0.55 * U}Q${0.8 * U} ${0.65 * U} ${0.9 * U} ${1.3 * U}L${1.3 * U} ${1.65 * U}`,
            "pencil",
            null,
            { strokeWidth: 0.8, stroke: c.t["ink-soft"] },
        );
        c.pen.path(
            c.g,
            `M${0.85 * U} ${0.25 * U}Q${1.4 * U} ${0.15 * U} ${1.7 * U} ${0.7 * U}`,
            "pencil",
            null,
            { strokeWidth: 2.4, stroke: c.t.paper },
        );
        return { centre: [U, U, "up"] };
    },
    describe: () =>
        "A heavy round grey stone, with a curved seam and a pale gleam on its upper edge.",
});
