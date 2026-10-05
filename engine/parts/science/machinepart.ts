import { type Ctx, type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const MACHINE_PARTS = [
    "domino",
    "ball",
    "weight",
    "spring",
    "fan",
    "bell",
    "bag",
    "wheel",
    "boat",
    "handle",
] as const;
export type MachinePart = (typeof MACHINE_PARTS)[number];

interface MachinePartParams {
    part: MachinePart;
    label: string;
    colour: Marker;
}

/** Each part's box in squares; a game draws it at the size its body is, its middle on the body's middle. */
export function machineBox(p: Pick<MachinePartParams, "part">): { w: number; h: number } {
    switch (p.part) {
        case "domino":
            return { w: 1, h: 3 };
        case "ball":
        case "weight":
        case "wheel":
        case "handle":
            return { w: 1, h: 1 };
        case "spring":
            return { w: 2, h: 1 };
        case "fan":
        case "bell":
            return { w: 2, h: 3 };
        case "bag":
            return { w: 2, h: 2 };
        case "boat":
            return { w: 3, h: 2 };
    }
}

/** A number on a white tag, so print's hatching never crosses it. */
function tag<G>(c: Ctx<G>, x: number, y: number, text: string): void {
    if (!text) return;
    const w = Math.max(18, text.length * 9 + 10);
    c.pen.rect(c.g, x - w / 2, y - 9, w, 17, "ruler", c.pen.fill("card"), {
        strokeWidth: 1.1,
        disableMultiStroke: true,
        preserveVertices: true,
    });
    patch(c, x, y - 1, w, 17);
    num(c, x, y + 5, text, 14);
}

export const machinePart = defineDrawing<MachinePartParams>({
    id: "machinepart",
    family: "science",
    title: "Chain-reaction machine parts",
    group: "Props",
    about: "The wooden toy parts of a chain-reaction machine a child builds on a toy-room floor: dominoes that topple in a row, a striped ball, an iron weight, a spring pad, a little desk fan, a bell on a stand that rings at the end, a bag of marbles, a pulley wheel, a paper boat, and the round grip a part is turned or stretched by.",
    params: { part: "domino", label: "", colour: "tang" },
    settings: {
        part: { kind: "one of", of: MACHINE_PARTS },
        label: { kind: "text", most: 4 },
        colour: { kind: "one of", of: MARKERS },
    },
    takes: [
        { label: "A domino", params: { part: "domino", label: "", colour: "tang" } },
        { label: "A striped ball", params: { part: "ball", label: "", colour: "berry" } },
        { label: "An iron weight", params: { part: "weight", label: "", colour: "sky" } },
        { label: "A spring pad", params: { part: "spring", label: "", colour: "mint" } },
        { label: "A desk fan", params: { part: "fan", label: "", colour: "sky" } },
        { label: "A bell on a stand", params: { part: "bell", label: "", colour: "glow" } },
        { label: "A bag of seven marbles", params: { part: "bag", label: "7", colour: "mint" } },
        { label: "A pulley wheel", params: { part: "wheel", label: "", colour: "sky" } },
        { label: "A paper boat", params: { part: "boat", label: "", colour: "sky" } },
        { label: "A grip", params: { part: "handle", label: "", colour: "sky" } },
    ],
    box: machineBox,
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            box = machineBox(p),
            w = box.w * U,
            h = box.h * U;
        const wood = pen.fill("tang", "hachure", {
            hachureGap: 4.5,
            hachureAngle: 90,
            fillWeight: 0.6,
        });
        switch (p.part) {
            case "domino": {
                // a slab as thick as the body, 0.45 of a square, standing the 2.6 squares it is tall
                const x0 = w / 2 - 0.225 * U,
                    y0 = h / 2 - 1.3 * U;
                pen.rect(g, x0, y0, 0.45 * U, 2.6 * U, "ruler", pen.fill(p.colour), calm(c, 1.4));
                pen.line(g, x0 + 2, h / 2, x0 + 0.45 * U - 2, h / 2, "ruler", calm(c, 1));
                for (const dy of [-0.75, 0.45, 0.85])
                    pen.circle(g, w / 2, h / 2 + dy * U, 0.12 * U, "ruler", pen.fill("card"), {
                        strokeWidth: 0.6,
                        disableMultiStroke: true,
                    });
                return { foot: [w / 2, y0 + 2.6 * U, "down"] };
            }
            case "ball":
                pen.circle(g, w / 2, h / 2, 0.92 * U, "ruler", pen.fill(p.colour), calm(c, 1.4));
                pen.path(
                    g,
                    `M${0.12 * U} ${h / 2}Q${w / 2} ${h * 0.82} ${w - 0.12 * U} ${h / 2}`,
                    "ruler",
                    null,
                    calm(c, 1.2),
                );
                return {};
            case "weight":
                pen.path(
                    g,
                    `M${0.1 * U} ${h - 0.06 * U}L${0.22 * U} ${0.3 * U}H${w - 0.22 * U}L${w - 0.1 * U} ${h - 0.06 * U}Z`,
                    "ruler",
                    pen.fill(p.colour),
                    calm(c, 1.5),
                );
                pen.path(
                    g,
                    `M${0.35 * U} ${0.3 * U}Q${w / 2} ${-0.02 * U} ${0.65 * U} ${0.3 * U}`,
                    "ruler",
                    null,
                    calm(c, 1.4),
                );
                return { foot: [w / 2, h, "down"] };
            case "spring": {
                pen.rect(
                    g,
                    1,
                    0.08 * U,
                    w - 2,
                    0.24 * U,
                    "ruler",
                    pen.fill(p.colour),
                    calm(c, 1.4),
                );
                for (let k = 0; k < 3; k++) {
                    const x = 0.45 * U + k * 0.55 * U;
                    pen.path(
                        g,
                        `M${x} ${0.34 * U}l${0.16 * U} ${0.12 * U}l${-0.32 * U} ${0.12 * U}l${0.32 * U} ${0.12 * U}l${-0.16 * U} ${0.12 * U}`,
                        "ruler",
                        null,
                        { strokeWidth: 1, disableMultiStroke: true },
                    );
                }
                pen.rect(g, 1, h - 0.24 * U, w - 2, 0.2 * U, "ruler", wood, calm(c, 1.2));
                return { top: [w / 2, 0.08 * U, "up"] };
            }
            case "fan": {
                // a round cage on a short neck and a heavy foot, blowing to the right
                pen.rect(
                    g,
                    0.35 * U,
                    h - 0.3 * U,
                    w - 0.7 * U,
                    0.24 * U,
                    "ruler",
                    wood,
                    calm(c, 1.2),
                );
                pen.line(g, 0.8 * U, h - 0.3 * U, 0.8 * U, 1.7 * U, "ruler", calm(c, 1.6));
                pen.circle(g, w / 2, 1.1 * U, 1.7 * U, "ruler", pen.fill("card"), calm(c, 1.5));
                for (const a of [0, 2.1, 4.2]) {
                    const x = w / 2 + Math.cos(a) * 0.55 * U,
                        y = 1.1 * U + Math.sin(a) * 0.55 * U;
                    pen.path(
                        g,
                        `M${w / 2} ${1.1 * U}Q${x + 0.2 * U} ${y - 0.2 * U} ${x} ${y}`,
                        "ruler",
                        pen.fill(p.colour),
                        calm(c, 1.1),
                    );
                }
                pen.circle(g, w / 2, 1.1 * U, 0.3 * U, "ruler", pen.fill(p.colour), calm(c, 1));
                return { mouth: [w, 1.1 * U, "right"] };
            }
            case "bell":
                pen.line(g, w / 2, 0.15 * U, w / 2, 0.5 * U, "ruler", calm(c, 1.4));
                pen.path(
                    g,
                    `M${0.3 * U} ${2.1 * U}Q${0.45 * U} ${0.55 * U} ${w / 2} ${0.5 * U}Q${w - 0.45 * U} ${0.55 * U} ${w - 0.3 * U} ${2.1 * U}Z`,
                    "ruler",
                    pen.fill(p.colour),
                    calm(c, 1.6),
                );
                pen.circle(g, w / 2, 2.3 * U, 0.4 * U, "ruler", pen.fill("card"), calm(c, 1.2));
                pen.line(g, 0.2 * U, 2.75 * U, w - 0.2 * U, 2.75 * U, "ruler", calm(c, 1.4));
                return { ring: [w / 2, 1.4 * U, "up"] };
            case "bag":
                pen.path(
                    g,
                    `M${0.55 * U} ${0.35 * U}L${0.2 * U} ${h - 0.25 * U}Q${w / 2} ${h - 0.02 * U} ${w - 0.2 * U} ${h - 0.25 * U}L${w - 0.55 * U} ${0.35 * U}Z`,
                    "ruler",
                    pen.fill(p.colour),
                    calm(c, 1.5),
                );
                pen.line(g, 0.5 * U, 0.35 * U, w - 0.5 * U, 0.35 * U, "ruler", calm(c, 1.6));
                tag(c, w / 2, 1.2 * U, p.label);
                return { spout: [w / 2, h, "down"] };
            case "wheel":
                pen.circle(g, w / 2, h / 2, 0.86 * U, "ruler", pen.fill("card"), calm(c, 1.4));
                pen.circle(g, w / 2, h / 2, 0.22 * U, "ruler", pen.fill(p.colour), calm(c, 1));
                return { axle: [w / 2, h / 2, "up"] };
            case "boat":
                pen.path(
                    g,
                    `M${0.05 * U} ${h - 0.95 * U}H${w - 0.05 * U}L${w - 0.5 * U} ${h - 0.05 * U}H${0.5 * U}Z`,
                    "ruler",
                    pen.fill(p.colour),
                    calm(c, 1.5),
                );
                pen.path(
                    g,
                    `M${w / 2} ${0.1 * U}L${w / 2 + 0.8 * U} ${h - 0.95 * U}H${w / 2 - 0.8 * U}Z`,
                    "ruler",
                    pen.fill("card"),
                    calm(c, 1.3),
                );
                return { stern: [0, h - 0.5 * U, "left"] };
            case "handle":
                pen.circle(g, w / 2, h / 2, 0.8 * U, "ruler", pen.fill("card"), calm(c, 1.6));
                pen.circle(g, w / 2, h / 2, 0.3 * U, "ruler", pen.fill(p.colour), calm(c, 1));
                return {};
        }
    },
    describe: (p) => {
        const colour = MARKER_WORD[p.colour];
        switch (p.part) {
            case "domino":
                return `A ${colour} wooden domino standing on its end with white spots, one of a row that topples one after another when the first is pushed.`;
            case "ball":
                return `A ${colour} wooden ball with a curved stripe round it, from a toy chain-reaction machine, that rolls down ramps and knocks things over.`;
            case "weight":
                return `A heavy ${colour} iron weight with a handle on top, from a toy chain-reaction machine, that drops onto a see-saw to flip it.`;
            case "spring":
                return `A ${colour} spring pad on coiled springs and a wooden base, from a toy chain-reaction machine, that bounces a falling ball back up.`;
            case "fan":
                return `A small desk fan on a wooden foot with ${colour} blades in a round cage, blowing a breeze to the right across a toy machine.`;
            case "bell":
                return `A ${colour} bell hanging on a short post with its round clapper below, which rings when the last part of a chain-reaction machine reaches it.`;
            case "bag":
                return `A ${colour} cloth bag of marbles from a toy machine, tied at the top, with the number of marbles it lets go written on a white tag.`;
            case "wheel":
                return `A round pulley wheel with a ${colour} hub, from a toy machine, that a rope runs over so a bucket going down lifts a weight up.`;
            case "boat":
                return `A ${colour} paper boat with a white triangle sail, from a toy chain-reaction machine, that a fan's breeze blows across a pond.`;
            case "handle":
                return `A round white grip with a ${colour} middle that a child drags to turn a ramp or to stretch a row of dominoes longer or shorter.`;
        }
    },
    motion: {
        still: "A game moves, topples and rings these parts itself; on the shelf they hold still so they can be looked at.",
    },
});
