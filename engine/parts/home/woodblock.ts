import { type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

const FACES = ["plain", "star", "window", "door"] as const;
// The openings are the shares the pups' game builds its bodies to (school/games/blocks.ts): an arch
// is open under half its width and two thirds of its height, a door frame under half and five sixths.
const SHAPES = ["block", "roof", "arch", "frame"] as const;
const NOUN = { block: "block", roof: "roof piece", arch: "arch", frame: "door frame" } as const;

interface BlockParams {
    w: number;
    h: number;
    colour: Marker;
    face: (typeof FACES)[number];
    shape: (typeof SHAPES)[number];
}

export const woodBlock = defineDrawing<BlockParams>({
    id: "woodblock",
    family: "home",
    title: "Wooden block",
    group: "Props",
    about: "A painted wooden toy block seen from the side, from a cube to a long plank, a pointed roof piece, an arch or a door frame with its door open, with a bevelled edge and sometimes a star, a window or a door painted on its face, for building a house that is tested by the weather.",
    params: { w: 2, h: 2, colour: "tang", face: "star", shape: "block" },
    settings: {
        w: { kind: "whole", min: 1, max: 12 },
        h: { kind: "whole", min: 1, max: 8 },
        colour: { kind: "one of", of: MARKERS },
        face: { kind: "one of", of: FACES },
        shape: { kind: "one of", of: SHAPES },
    },
    takes: [
        {
            label: "A cube with a star",
            params: { w: 2, h: 2, colour: "tang", face: "star", shape: "block" },
        },
        {
            label: "A brick with a window",
            params: { w: 4, h: 2, colour: "berry", face: "window", shape: "block" },
        },
        {
            label: "A long plank",
            params: { w: 8, h: 1, colour: "mint", face: "plain", shape: "block" },
        },
        {
            label: "A tall block with a door",
            params: { w: 2, h: 4, colour: "sky", face: "door", shape: "block" },
        },
        {
            label: "A pointed roof",
            params: { w: 8, h: 4, colour: "berry", face: "plain", shape: "roof" },
        },
        { label: "An arch", params: { w: 8, h: 6, colour: "glow", face: "plain", shape: "arch" } },
        {
            label: "A door frame",
            params: { w: 4, h: 6, colour: "sky", face: "plain", shape: "frame" },
        },
    ],
    box: (p) => ({ w: whole(p.w, 1, 12, 2), h: whole(p.h, 1, 8, 2) }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = whole(p.w, 1, 12, 2) * U,
            h = whole(p.h, 1, 8, 2) * U,
            edge = Math.min(4, Math.min(w, h) * 0.18);
        const firm = { disableMultiStroke: true, preserveVertices: true } as const;
        if (p.shape === "roof") {
            pen.polygon(
                g,
                [
                    [1, h - 1],
                    [w / 2, 1],
                    [w - 1, h - 1],
                ],
                "ruler",
                pen.fill(p.colour),
                { strokeWidth: 1.7, ...firm },
            );
            // a row of tiles along each slope, as a toy roof is painted
            for (let k = 1; k < 4; k++) {
                const y = 1 + ((h - 2) * k) / 4,
                    half = ((w - 2) / 2) * (k / 4);
                pen.line(g, w / 2 - half + 3, y, w / 2 + half - 3, y, "ruler", {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                    ...firm,
                });
            }
            return { top: [w / 2, 1, "up"], bottom: [w / 2, h - 1, "down"] };
        }
        if (p.shape === "arch" || p.shape === "frame") {
            const ow = w / 2,
                oh = p.shape === "arch" ? (h * 2) / 3 : (h * 5) / 6,
                l = w / 2 - ow / 2,
                r = w / 2 + ow / 2,
                top = h - 1 - oh;
            const inner =
                p.shape === "arch"
                    ? `V${top + ow / 2}A${ow / 2} ${ow / 2} 0 0 0 ${l} ${top + ow / 2}`
                    : `V${top}H${l}`;
            pen.path(
                g,
                `M1 ${h - 1}V1H${w - 1}V${h - 1}H${r}${inner}V${h - 1}Z`,
                "ruler",
                pen.fill(p.colour),
                { strokeWidth: 1.7, ...firm },
            );
            if (p.shape === "frame")
                pen.polygon(
                    g,
                    [
                        [r, top + 1],
                        [r + ow * 0.35, top + oh * 0.12],
                        [r + ow * 0.35, h - 1 - oh * 0.04],
                        [r, h - 1],
                    ],
                    "ruler",
                    pen.fill("card"),
                    { strokeWidth: 1.1, ...firm },
                );
            return { top: [w / 2, 1, "up"], bottom: [w / 2, h - 1, "down"] };
        }
        pen.rect(g, 1, 1, w - 2, h - 2, "ruler", pen.fill(p.colour), { strokeWidth: 1.7, ...firm });
        if (w > 12 && h > 12)
            pen.rect(g, 1 + edge, 1 + edge, w - 2 - edge * 2, h - 2 - edge * 2, "ruler", null, {
                strokeWidth: 0.9,
                stroke: c.paper ? c.t.ink : c.t["ink-soft"],
                ...firm,
            });
        const cx = w / 2,
            cy = h / 2,
            r = Math.min(w, h) * 0.3;
        if (p.face === "star" && r > 3) {
            const pts: [number, number][] = Array.from({ length: 10 }, (_, i) => {
                const a = -Math.PI / 2 + (i * Math.PI) / 5,
                    rr = i % 2 ? r * 0.45 : r;
                return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
            });
            pen.polygon(g, pts, "ruler", pen.fill("card"), { strokeWidth: 1, ...firm });
        } else if (p.face === "window" && r > 3) {
            pen.rect(g, cx - r, cy - r * 0.8, r * 2, r * 1.6, "ruler", pen.fill("card"), {
                strokeWidth: 1.1,
                ...firm,
            });
            pen.line(g, cx, cy - r * 0.8, cx, cy + r * 0.8, "ruler", { strokeWidth: 0.9, ...firm });
            pen.line(g, cx - r, cy, cx + r, cy, "ruler", { strokeWidth: 0.9, ...firm });
        } else if (p.face === "door" && r > 3) {
            const dw = Math.min(w * 0.5, 16),
                top = h * 0.3;
            pen.path(
                g,
                `M${cx - dw / 2} ${h - 2}V${top + dw / 2}A${dw / 2} ${dw / 2} 0 0 1 ${cx + dw / 2} ${top + dw / 2}V${h - 2}Z`,
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.1, ...firm },
            );
            pen.circle(
                g,
                cx + dw * 0.25,
                h * 0.7,
                2.4,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                {
                    strokeWidth: 0.5,
                    ...firm,
                },
            );
        }
        return { top: [w / 2, 1, "up"], bottom: [w / 2, h - 1, "down"] };
    },
    describe: (p) =>
        p.shape === "block"
            ? `A ${MARKER_WORD[p.colour]} wooden toy block seen from the side${p.face === "plain" ? "" : `, with a ${p.face} painted on its face`}, its edge bevelled like a block from a building set.`
            : `A ${MARKER_WORD[p.colour]} wooden toy ${NOUN[p.shape]} seen from the side, ${p.shape === "roof" ? "pointed, with rows of tiles painted along its slopes" : p.shape === "arch" ? "with a rounded opening a pup can walk under" : "with its door swung open for the family to walk in"}, from a building set.`,
    motion: {
        still: "A game stacks it and the weather tests it; on the shelf it holds still like a block on a table.",
    },
});
