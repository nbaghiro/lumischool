import { plain, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { PIGMENTS, paintFill, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import {
    MOTIFS,
    MOTIF_NAMES,
    SHEET_GUIDES,
    SHEET_OUTLINES,
    pigmentsIn,
    sheetLines,
    sheetPaper,
} from "./kit";

export const paintSheet = defineDrawing({
    id: "paintsheet",
    family: "art",
    title: "Sheet to paint on",
    group: "Inputs",
    about: "The sheet a lesson asks for a painting on: squared or plain paper in a frame, with the lines the question needs printed on it (a mirror line, both middles, the three layers of a landscape, a row for a repeat) and an outline to paint in. The paints the question gives are named under it. On screen the easel lays its canvas on the paper; printed, it is the sheet the child paints with real paint.",
    params: {
        w: 20,
        h: 12,
        paper: "squared",
        guide: "none",
        outline: "none",
        pots: ["red", "yellow", "blue", "white"],
        stamps: [] as string[],
        stencils: [] as string[],
    },
    settings: {
        w: { kind: "whole", min: 4, max: 30 },
        h: { kind: "whole", min: 3, max: 30 },
        paper: { kind: "one of", of: ["squared", "plain"] },
        guide: { kind: "one of", of: SHEET_GUIDES },
        outline: { kind: "one of", of: SHEET_OUTLINES },
        pots: { kind: "words", of: PIGMENTS, most: 10 },
        stamps: { kind: "words", of: MOTIF_NAMES, most: 6 },
        stencils: { kind: "words", of: MOTIF_NAMES, most: 8 },
    },
    takes: [
        {
            label: "A butterfly half, mirror line",
            params: {
                w: 20,
                h: 12,
                paper: "squared",
                guide: "mirror",
                outline: "butterfly",
                pots: ["red", "yellow", "blue", "white"],
                stamps: [],
                stencils: [],
            },
        },
        {
            label: "Three layers, plain paper",
            params: {
                w: 22,
                h: 12,
                paper: "plain",
                guide: "layers",
                outline: "none",
                pots: ["blue", "green", "yellow", "white"],
                stamps: [],
                stencils: ["leaf", "fern"],
            },
        },
        {
            label: "A row for a repeat",
            params: {
                w: 24,
                h: 8,
                paper: "squared",
                guide: "row",
                outline: "none",
                pots: ["red", "blue"],
                stamps: ["leaf", "star"],
                stencils: [],
            },
        },
    ],
    box: (p) => {
        const s = sheetPaper(p);
        return { w: s.w + 2, h: s.h + (pigmentsIn(p.pots).length ? 4 : 2) };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            s = sheetPaper(p),
            x = s.x * U,
            y = s.y * U,
            w = s.w * U,
            h = s.h * U;
        pen.rect(g, x - 6, y - 6, w + 12, h + 12, "pencil", null, { strokeWidth: 2.2 });
        if (p.paper === "plain") plain(c, { kind: "rect", x, y, w, h, fill: c.t.card });
        sheetLines(c, p, x, y);
        const pots = pigmentsIn(p.pots),
            a: RawAnchors = { sheet: [x + w / 2, y, "up"], centre: [x + w / 2, y + h / 2, "up"] };
        if (pots.length) {
            const base = y + h + 1.9 * U;
            pots.forEach((pig, i) => {
                const px = x + 0.6 * U + i * 4 * U;
                pen.circle(g, px, base - 5, 0.9 * U, "ruler", paintFill(c, panColour(pig)), {
                    strokeWidth: 1.4,
                });
                say(c, px + 0.7 * U, base, pig, 13, "start");
            });
        }
        return a;
    },
    describe: (p) => {
        const half = p.guide === "mirror" || p.guide === "four";
        const guide =
            p.guide === "mirror"
                ? ", a dashed mirror line down it"
                : p.guide === "four"
                  ? ", dashed lines across both middles"
                  : p.guide === "layers"
                    ? ", two faint wavy lines across it"
                    : p.guide === "row"
                      ? ", a row of dashed cells across it"
                      : "";
        const outline =
            p.outline !== "none" && MOTIFS[p.outline]
                ? half
                    ? `, half a ${p.outline} outline at the line`
                    : `, the outline of a ${p.outline} to paint in`
                : "";
        const pots = pigmentsIn(p.pots).length;
        const bare = guide === "" && outline === "" ? ", with nothing printed on it yet" : "";
        return `A sheet of ${p.paper === "plain" ? "plain" : "squared"} paper inside a pencil frame${bare}${guide}${outline}${pots ? `, ${pots} pots of paint named under it` : ""}.`;
    },
});
