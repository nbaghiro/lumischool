import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { CROPS, CROP_WORDS, drawProduce, isCrop } from "./gardencrop";

const KINDS = ["basket", "crate"] as const;

/** The most produce drawn in a basket or a crate; a fuller one is drawn as full and its count is written beside it. */
export const SHOWN = 12;

/**
 * A harvest basket or a wooden crate seen from the front, with up to a dozen of a crop piled in it, so
 * a count is seen as well as written.
 */
export const gardenBasket = defineDrawing<{ kind: string; crop: string; count: number }>({
    id: "gardenbasket",
    family: "outdoors",
    title: "Harvest basket",
    group: "Props",
    about: "A woven harvest basket or a slatted wooden crate seen from the front, holding a pile of picked carrots, lettuces, strawberries, sunflower heads or pumpkins.",
    params: { kind: "basket", crop: "carrot", count: 5 },
    settings: {
        kind: { kind: "one of", of: KINDS },
        crop: { kind: "one of", of: CROPS },
        count: { kind: "number", min: 0, max: SHOWN, step: 1 },
    },
    takes: [
        { label: "Five carrots in a basket", params: { kind: "basket", crop: "carrot", count: 5 } },
        {
            label: "A crate of strawberries",
            params: { kind: "crate", crop: "strawberry", count: 6 },
        },
        { label: "An empty crate", params: { kind: "crate", crop: "pumpkin", count: 0 } },
    ],
    box: () => ({ w: 4, h: 3 }),
    draw: (c, p) => {
        const crop = isCrop(p.crop) ? p.crop : "carrot",
            n = Math.max(0, Math.min(SHOWN, Math.round(p.count))),
            crate = p.kind === "crate";
        // the pile first, so the front of the basket hides its lower half
        for (let i = 0; i < n; i++) {
            const row = i < 5 ? 0 : i < 9 ? 1 : 2,
                k = row === 0 ? i : row === 1 ? i - 5 : i - 9,
                across = row === 0 ? 5 : row === 1 ? 4 : 3,
                x = 2 * U + (k - (across - 1) / 2) * 0.62 * U,
                y = 1.45 * U - row * 0.42 * U;
            drawProduce(c, crop, x, y, 0.32 * U);
        }
        if (crate) {
            c.pen.rect(
                c.g,
                0.35 * U,
                1.35 * U,
                3.3 * U,
                1.45 * U,
                "pencil",
                c.pen.fill("tang", "hachure"),
                {
                    strokeWidth: 1.5,
                },
            );
            c.pen.line(c.g, 0.35 * U, 2.05 * U, 3.65 * U, 2.05 * U, "pencil", { strokeWidth: 0.9 });
        } else {
            c.pen.path(
                c.g,
                `M${0.3 * U} ${1.35 * U}L${3.7 * U} ${1.35 * U}L${3.3 * U} ${2.8 * U}L${0.7 * U} ${2.8 * U}Z`,
                "pencil",
                c.pen.fill("glow", "cross-hatch"),
                { strokeWidth: 1.5 },
            );
            c.pen.path(
                c.g,
                `M${0.7 * U} ${1.35 * U}Q${2 * U} ${0.15 * U} ${3.3 * U} ${1.35 * U}`,
                "pencil",
                null,
                {
                    strokeWidth: 1.4,
                },
            );
        }
        return {};
    },
    describe: (p) => {
        const crop = isCrop(p.crop) ? p.crop : "carrot",
            n = Math.max(0, Math.min(SHOWN, Math.round(p.count))),
            what = p.kind === "crate" ? "slatted wooden crate" : "woven harvest basket";
        return n === 0
            ? `An empty ${what} seen from the front, waiting to be filled with ${CROP_WORDS[crop].many} from the garden.`
            : `A ${what} seen from the front with a pile of picked ${CROP_WORDS[crop].many} in it, ${n === SHOWN ? "full to the top" : "with room for more"}.`;
    },
});
