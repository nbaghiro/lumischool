import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, nameOf, paintFill, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { cap } from "../lettering";
import { MOTIFS, MOTIF_NAMES, motif } from "./kit";

export const stamps = defineDrawing({
    id: "stamps",
    family: "art",
    title: "Print block",
    group: "Props",
    about: "A block with a shape cut into it and the print it makes. The lines cut into the block print as paper, and the print comes out facing the other way from the block, which is the first surprise of printing; a rubbing taken from on top of the block faces the same way as the block. Shown as which, the result is not named, so a question can ask how it was made. The easel's stamps are cut from these shapes.",
    params: { motif: "leaf", show: "both", colour: "blue", flip: false, made: "print" },
    settings: {
        motif: { kind: "one of", of: MOTIF_NAMES },
        show: { kind: "one of", of: ["block", "print", "both", "which"] },
        colour: { kind: "text", most: 24 },
        flip: { kind: "flag" },
        made: { kind: "one of", of: ["print", "rubbing"] },
    },
    takes: [
        {
            label: "Leaf, block and print",
            params: { motif: "leaf", show: "both", colour: "green", flip: false, made: "print" },
        },
        {
            label: "Fish, block and print",
            params: { motif: "fish", show: "both", colour: "blue", flip: false, made: "print" },
        },
        {
            label: "Star, the print",
            params: {
                motif: "star",
                show: "print",
                colour: "red+yellow",
                flip: false,
                made: "print",
            },
        },
        {
            label: "Bird, the block",
            params: { motif: "bird", show: "block", colour: "blue", flip: false, made: "print" },
        },
        {
            label: "Fish, block and a rubbing, unnamed",
            params: { motif: "fish", show: "which", colour: "blue", flip: false, made: "rubbing" },
        },
    ],
    box: (p) => ({ w: p.show === "both" || p.show === "which" ? 17 : 7, h: 8 }),
    draw: (c, p) => {
        const colour = colourOf(p.colour) ?? panColour("blue"),
            a: RawAnchors = {};
        const block = (x: number) => {
            const { pen, g } = c;
            pen.path(
                g,
                roundedRect(x + 0.4 * U, 0.8 * U, 6.2 * U, 6.2 * U, 10),
                "pencil",
                c.pen.fill("tang", "hachure", { hachureGap: 7, hachureAngle: 80 }),
                { strokeWidth: 2 },
            );
            pen.path(
                g,
                roundedRect(x + 0.9 * U, 1.3 * U, 5.2 * U, 5.2 * U, 8),
                "ruler",
                c.pen.fill("card"),
                { strokeWidth: 1.2 },
            );
            // the block is cut the other way round, so it prints the right way
            motif(c, p.motif, x + 3.5 * U, 3.9 * U, 4.4 * U, {
                fill: c.pen.fill("berry"),
                flip: !p.flip,
                carve: c.paper ? c.t.card : c.t.card,
            });
            cap(c, x + 3.5 * U, 7.8 * U, "block", 10);
            a.block = [x + 3.5 * U, 0.8 * U, "up"];
        };
        // a rubbing is taken from on top of the block, so it faces the way the block does; a print is
        // the block turned over onto the paper, so it faces the other way
        const print = (x: number) => {
            c.pen.rect(c.g, x + 0.4 * U, 0.8 * U, 6.2 * U, 6.2 * U, "ruler", c.pen.fill("card"), {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
            });
            motif(c, p.motif, x + 3.5 * U, 3.9 * U, 4.4 * U, {
                fill: paintFill(c, colour, (4.4 * U) / 100),
                flip: p.made === "rubbing" ? !p.flip : p.flip,
                outline: c.paper,
                carve: c.t.card,
            });
            cap(
                c,
                x + 3.5 * U,
                7.8 * U,
                p.show === "which" ? "?" : p.made === "rubbing" ? "rubbing" : "print",
                10,
            );
            a.print = [x + 3.5 * U, 0.8 * U, "up"];
        };
        if (p.show === "block") block(0);
        else if (p.show === "print") print(0);
        else {
            block(0);
            c.pen.arrow(c.g, [7.3 * U, 3.9 * U], [9.8 * U, 3.9 * U], c.t.pen, 0.1);
            print(10 * U);
        }
        return a;
    },
    describe: (p) => {
        const shape = MOTIFS[p.motif] ? p.motif : "leaf";
        const paint = nameOf(colourOf(p.colour) ?? panColour("blue")).name;
        if (p.show === "block")
            return `A square wooden print block with a ${shape} shape cut into its face, its carved lines showing as paper, named block underneath.`;
        if (p.show === "print")
            return `A square of paper with a ${shape} shape printed on it in ${paint} paint, the carved lines left as paper, named print underneath.`;
        return `A wooden print block with a ${shape} cut into it, an arrow, and a square of paper beside it showing the ${shape} in ${paint}${p.show === "which" ? ", marked with a question mark" : ""}.`;
    },
});
