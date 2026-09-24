import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const golfRail = defineDrawing({
    id: "golfrail",
    family: "sport",
    title: "Putting rail",
    group: "Props",
    about: "A low wooden rail viewed from above, whose inked rectangle matches the face a rolling ball bounces against.",
    params: { width: 1, height: 8 },
    settings: {
        width: { kind: "number", min: 0.5, max: 30, step: 0.5 },
        height: { kind: "number", min: 0.5, max: 30, step: 0.5 },
    },
    takes: [
        { label: "Upright rail", params: { width: 1, height: 8 } },
        { label: "Across the lawn", params: { width: 8, height: 1 } },
    ],
    box: (p) => ({ w: p.width, h: p.height }),
    draw: (c, p) => {
        const w = p.width * U,
            h = p.height * U;
        c.pen.rect(c.g, 0, 0, w, h, "pencil", c.pen.fill("tang", "solid"), {
            strokeWidth: 2,
            roughness: 0.35,
        });
        if (w > h)
            c.pen.line(c.g, 0.3 * U, h * 0.6, w - 0.3 * U, h * 0.6, "pencil", { strokeWidth: 0.8 });
        else
            c.pen.line(c.g, w * 0.6, 0.3 * U, w * 0.6, h - 0.3 * U, "pencil", { strokeWidth: 0.8 });
        return {};
    },
    describe: () =>
        "A low orange wooden putting rail seen from above, with a dark rectangular outline and a thin line of grain along its length.",
});
