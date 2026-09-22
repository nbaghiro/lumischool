import { group, plain, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, paintFill } from "../../pigment";
import { defineDrawing } from "../drawing";
import { BOAT, COLLAGES, MOTIFS, motif } from "./kit";

export const collage = defineDrawing({
    id: "collage",
    family: "art",
    title: "A cut-paper picture",
    group: "Props",
    about: "A picture made only of shapes cut from painted paper and laid on a sheet: a boat, a fish or a house. Some shapes are geometric, with straight edges or a perfect curve, and some are organic, like a leaf or a cloud, so the pieces can be counted and sorted.",
    params: { scene: "boat" },
    settings: {
        scene: { kind: "one of", of: Object.keys(COLLAGES) },
    },
    takes: [
        { label: "A boat", params: { scene: "boat" } },
        { label: "A fish", params: { scene: "fish" } },
        { label: "A house", params: { scene: "house" } },
    ],
    box: () => ({ w: 15, h: 10 }),
    draw: (c, p) => {
        const a: RawAnchors = {};
        c.pen.rect(c.g, 0.4 * U, 0.4 * U, 14.2 * U, 9.2 * U, "pencil", c.pen.fill("card"), {
            strokeWidth: 1.8,
        });
        (COLLAGES[p.scene] ?? BOAT).forEach((piece, i) => {
            const t = group(c, { turn: [["rotate", piece.turn, piece.x * U, piece.y * U]] });
            if (!c.paper)
                plain(t, {
                    kind: "path",
                    d: MOTIFS[piece.shape]?.fill.join(" ") ?? "",
                    turn: [
                        [
                            "translate",
                            piece.x * U - (piece.size * U) / 2 + 2,
                            piece.y * U - (piece.size * U) / 2 + 3,
                        ],
                        ["scale", (piece.size * U) / 100],
                    ],
                    fill: "#1B254022",
                });
            motif(t, piece.shape, piece.x * U, piece.y * U, piece.size * U, {
                fill: paintFill(c, colourOf(piece.colour) ?? "#FFFFFF", (piece.size * U) / 100),
                level: "ruler",
            });
            a[`piece(${i})`] = [piece.x * U, (piece.y - piece.size / 2) * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A picture of a ${COLLAGES[p.scene] ? p.scene : "boat"} made of shapes cut from painted paper and laid on a white sheet, some with straight edges and some with curved.`,
});
