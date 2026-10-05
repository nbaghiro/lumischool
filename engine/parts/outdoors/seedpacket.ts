import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { CROPS, CROP_WORDS, drawProduce, isCrop } from "./gardencrop";

/** A paper packet of seeds with its crop drawn on the front and the top folded over. */
export const seedPacket = defineDrawing<{ crop: string }>({
    id: "seedpacket",
    family: "outdoors",
    title: "Seed packet",
    group: "Props",
    about: "A small paper packet of seeds with its top folded over and a picture of the crop on the front: carrots, lettuces, strawberries, sunflowers or pumpkins.",
    params: { crop: "carrot" },
    settings: { crop: { kind: "one of", of: CROPS } },
    takes: [
        { label: "Carrot seeds", params: { crop: "carrot" } },
        { label: "Sunflower seeds", params: { crop: "sunflower" } },
        { label: "Pumpkin seeds", params: { crop: "pumpkin" } },
    ],
    box: () => ({ w: 3, h: 4 }),
    draw: (c, p) => {
        const crop = isCrop(p.crop) ? p.crop : "carrot",
            x = 0.2 * U,
            y = 0.3 * U,
            w = 2.6 * U,
            h = 3.45 * U;
        c.pen.rect(c.g, x, y, w, h, "pencil", c.pen.fill("card", "solid"), { strokeWidth: 1.5 });
        // the folded-over top
        c.pen.rect(c.g, x, y, w, 0.7 * U, "pencil", c.pen.fill("glow", "hachure"), {
            strokeWidth: 1,
        });
        c.pen.ellipse(
            c.g,
            x + w / 2,
            y + 2 * U,
            1.9 * U,
            1.9 * U,
            "pencil",
            c.pen.fill("mint", "hachure"),
            {
                strokeWidth: 0.8,
                stroke: c.t["ink-soft"],
            },
        );
        drawProduce(c, crop, x + w / 2, y + 2 * U, 0.6 * U);
        return {};
    },
    describe: (p) => {
        const crop = isCrop(p.crop) ? p.crop : "carrot";
        return `A paper packet of ${CROP_WORDS[crop].one} seeds with its top folded over and a picture of a ripe ${CROP_WORDS[crop].one} on the front.`;
    },
});
