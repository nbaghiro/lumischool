import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, sayOn, wide } from "../lettering";
import { price } from "./price";

export const priceTag = defineDrawing({
    id: "pricetag",
    family: "money",
    title: "Price tag",
    group: "Props",
    about: "A swing tag with a hole and a price on it, and room for the old price crossed out. The crossed-out price is what turns one number into a two-step question.",
    params: { now: 450, was: 0 },
    settings: {
        now: { kind: "whole", min: 1, max: 99999 },
        was: { kind: "whole", min: 0, max: 99999 },
    },
    takes: [
        { label: "$4.50", params: { now: 450, was: 0 } },
        { label: "Reduced", params: { now: 299, was: 450 } },
        { label: "Under a dollar", params: { now: 65, was: 0 } },
        { label: "A big number", params: { now: 1299, was: 1800 } },
    ],
    box: (p) => ({ w: Math.max(8, Math.ceil(wide(price(p.now), 26) / U) + 5), h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            h = 3 * U,
            y = U;
        const w = Math.max(8, Math.ceil(wide(price(p.now), 26) / U) + 5) * U - U;
        const nose = 1.2 * U;
        pen.path(
            g,
            `M${U / 2 + nose} ${y}H${U / 2 + w}Q${U / 2 + w + 10} ${y} ${U / 2 + w + 10} ${y + 10}` +
                `V${y + h - 10}Q${U / 2 + w + 10} ${y + h} ${U / 2 + w} ${y + h}H${U / 2 + nose}L${U / 2} ${y + h / 2}Z`,
            "ruler",
            pen.fill("glow", "solid", { hachureGap: 8, fillWeight: 0.6 }),
            { strokeWidth: 2.2 },
        );
        pen.circle(g, U / 2 + nose + 12, y + h / 2, 13, "ruler", pen.fill("card"), {
            strokeWidth: 1.4,
        });
        const textX = U / 2 + nose + 30;
        if (p.was) {
            sayOn(c, textX, y + h / 2 - 12, price(p.was), 15, "start");
            pen.line(
                g,
                textX - 2,
                y + h / 2 - 17,
                textX + wide(price(p.was), 15) + 2,
                y + h / 2 - 17,
                "pencil",
                { strokeWidth: 2, stroke: c.t.pen },
            );
            patch(
                c,
                textX + wide(price(p.now), 22) / 2,
                y + h / 2 + 12,
                wide(price(p.now), 22) + 10,
                26,
            );
            num(c, textX, y + h / 2 + 20, price(p.now), 22, "start");
        } else {
            patch(
                c,
                textX + wide(price(p.now), 26) / 2,
                y + h / 2 - 2,
                wide(price(p.now), 26) + 10,
                30,
            );
            num(c, textX, y + h / 2 + 9, price(p.now), 26, "start");
        }
        return {
            hole: [U / 2 + nose + 12, y + h / 2, "left"],
            tag: [U / 2 + w / 2, y, "up"],
        };
    },
    describe: () =>
        "A yellow swing tag with a hole at its pointed end and a price written on it in large figures.",
    reads: true,
});
