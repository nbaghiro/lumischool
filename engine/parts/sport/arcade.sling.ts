import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const slingFork = defineDrawing({
    id: "arcade.sling",
    family: "sport",
    title: "Sling",
    group: "Props",
    about: "The forked stick of a sling, planted in the ground. The band is not drawn: it is two lines from the tips to wherever the ball is held.",
    params: {},
    settings: {},
    takes: [
        { label: "Take 1", params: {}, seed: 0 },
        { label: "Take 2", params: {}, seed: 2131 },
        { label: "Take 3", params: {}, seed: 4262 },
    ],
    box: () => ({ w: 3, h: 6 }),
    draw: (c) => {
        const { pen, g } = c,
            cx = 1.5 * U,
            tip = 0.5 * U,
            fork = 2.4 * U,
            foot = 5.9 * U;
        const wood = pen.fill("tang", "solid", { hachureGap: 6 });
        pen.path(
            g,
            `M${cx - 5} ${foot}L${cx - 5} ${fork}L${cx - 13} ${tip}L${cx - 6} ${tip - 2}L${cx} ${fork - 10}L${cx + 6} ${tip - 2}L${cx + 13} ${tip}L${cx + 5} ${fork}L${cx + 5} ${foot}Z`,
            "pencil",
            wood,
            { strokeWidth: 2 },
        );
        pen.line(g, cx - 4, fork + 18, cx + 4, fork + 14, "pencil", {
            strokeWidth: 1.1,
            stroke: c.t["ink-soft"],
        });
        return { left: [cx - 11, tip, "up"], right: [cx + 11, tip, "up"] };
    },
    describe: () =>
        "The forked wooden stick of a sling planted upright in the ground, two arms rising from one handle, with no band drawn between its tips.",
});
