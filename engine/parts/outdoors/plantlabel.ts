import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { CROPS, CROP_WORDS, isCrop } from "./gardencrop";

/** A garden label on a stick, pushed into a bed's corner to say what is sown there. */
export const plantLabel = defineDrawing<{ crop: string }>({
    id: "plantlabel",
    family: "outdoors",
    title: "Plant label",
    group: "Props",
    about: "A small white label on a wooden stick, pushed into the corner of a garden bed, with a little picture of what is sown there drawn on it.",
    params: { crop: "carrot" },
    settings: { crop: { kind: "one of", of: CROPS } },
    takes: [
        { label: "Carrots", params: { crop: "carrot" } },
        { label: "Strawberries", params: { crop: "strawberry" } },
    ],
    box: () => ({ w: 2, h: 3 }),
    draw: (c, p) => {
        const crop = isCrop(p.crop) ? p.crop : "carrot";
        c.pen.line(c.g, U, 1.6 * U, U, 2.8 * U, "pencil", { strokeWidth: 1.6, stroke: c.t.tang });
        c.pen.rect(
            c.g,
            0.25 * U,
            0.2 * U,
            1.5 * U,
            1.4 * U,
            "pencil",
            c.pen.fill("paper", "solid"),
            {
                strokeWidth: 1.1,
            },
        );
        const tone =
            crop === "carrot" || crop === "pumpkin"
                ? "tang"
                : crop === "strawberry"
                  ? "berry"
                  : crop === "sunflower"
                    ? "glow"
                    : "mint";
        c.pen.circle(c.g, U, 0.9 * U, 0.75 * U, "pencil", c.pen.fill(tone, "solid"), {
            strokeWidth: 0.8,
        });
        return {};
    },
    describe: (p) =>
        `A small white garden label on a wooden stick, pushed into the soil, with a round picture of ${CROP_WORDS[isCrop(p.crop) ? p.crop : "carrot"].many} drawn on it.`,
    motion: { still: "A label marks a bed; it stays where it was pushed in." },
});
