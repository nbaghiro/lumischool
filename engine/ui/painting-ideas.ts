import { MOTIFS } from "../parts/art/kit";

export type { Activity } from "../painting";
interface Piece {
    motif: string;
    x: number;
    y: number;
    size: number;
    colours: string[];
}
export interface Idea {
    id: string;
    name: string;
    hint: string;
    pieces: Piece[];
    steps: string[];
}
const berry = "#ed9bc0",
    sky = "#8ac5e6",
    glow = "#ffda53",
    leaf = "#93ceb0",
    orange = "#f8a551";
export const IDEAS: [Idea, ...Idea[]] = [
    {
        id: "butterfly",
        name: "A butterfly",
        hint: "Give every wing a colour of its own.",
        pieces: [
            {
                motif: "butterfly",
                x: 70,
                y: 12,
                size: 165,
                colours: [berry, sky, glow, orange, leaf],
            },
        ],
        steps: [
            "A big wing on the left",
            "A big wing on the right",
            "A little wing below",
            "One more little wing",
            "A long body in the middle",
            "Add your own patterns",
        ],
    },
    {
        id: "flower",
        name: "A happy flower",
        hint: "What colours grow in your garden?",
        pieces: [
            {
                motif: "flower",
                x: 78,
                y: 20,
                size: 140,
                colours: [berry, glow, berry, glow, berry, glow, orange],
            },
        ],
        steps: [
            "A petal at the top",
            "A petal beside it",
            "Keep going round",
            "A petal at the bottom",
            "Another on the left",
            "One last petal",
            "A circle in the middle",
            "Add the little lines",
        ],
    },
    {
        id: "fish",
        name: "Under the sea",
        hint: "Make a fish that nobody has seen before.",
        pieces: [
            { motif: "fish", x: 45, y: 28, size: 175, colours: [sky, orange, glow] },
            { motif: "shell", x: 212, y: 117, size: 54, colours: [berry, glow] },
        ],
        steps: [
            "Draw your fish",
            "Add its other shapes",
            "A shell on the seabed",
            "Little details, then bubbles of your own",
        ],
    },
    {
        id: "bird",
        name: "A little bird",
        hint: "A bird, a cloud, and a sky to invent.",
        pieces: [
            { motif: "bird", x: 57, y: 45, size: 165, colours: [glow] },
            { motif: "cloud", x: 195, y: 2, size: 74, colours: [sky] },
        ],
        steps: [
            "The bird’s round body and tail",
            "A soft cloud above",
            "Its eye and its wing",
            "Add somewhere for it to land",
        ],
    },
    {
        id: "garden",
        name: "A tiny garden",
        hint: "Choose a different colour for each little thing.",
        pieces: [
            {
                motif: "flower",
                x: 22,
                y: 67,
                size: 85,
                colours: [berry, glow, berry, glow, berry, glow, orange],
            },
            {
                motif: "butterfly",
                x: 157,
                y: 14,
                size: 100,
                colours: [sky, berry, glow, orange, leaf],
            },
            { motif: "leaf", x: 110, y: 119, size: 65, colours: [leaf] },
        ],
        steps: [
            "Begin with a flower",
            "Give it all its petals",
            "A butterfly above",
            "A leaf on the ground",
            "Add your own tiny creatures",
        ],
    },
    {
        id: "night",
        name: "A sleepy sky",
        hint: "Stars can be any colour in your sky.",
        pieces: [
            { motif: "moon", x: 34, y: 13, size: 159, colours: [glow] },
            { motif: "star", x: 159, y: 24, size: 60, colours: [orange] },
            { motif: "star", x: 217, y: 102, size: 45, colours: [berry] },
            { motif: "cloud", x: 97, y: 132, size: 72, colours: [sky] },
        ],
        steps: [
            "A curved moon",
            "A big star",
            "A smaller star",
            "A cloud below",
            "Add the little details",
        ],
    },
];
export const ideaOf = (id: string): Idea => IDEAS.find((idea) => idea.id === id) ?? IDEAS[0];
export function regions(idea: Idea) {
    return idea.pieces.flatMap((piece, i) =>
        (MOTIFS[piece.motif]?.fill ?? []).map((d, j) => ({
            id: `${i}-${j}`,
            d,
            transform: `translate(${piece.x} ${piece.y}) scale(${piece.size / 100})`,
            colour: piece.colours[j % piece.colours.length],
            name: `${piece.motif} shape ${j + 1}`,
        })),
    );
}
export function pictureSvg(
    idea: Idea,
    options: {
        w?: number;
        h?: number;
        fills?: Record<string, string>;
        reference?: boolean;
        outlines?: boolean;
        ghost?: boolean;
        step?: number;
        hit?: boolean;
        fillOnly?: boolean;
    } = {},
) {
    const w = (options.w ?? 30) * 10,
        h = (options.h ?? 20) * 10;
    const k = Math.min(w / 300, h / 200);
    const shapes = regions(idea);
    const upto =
        options.step === undefined
            ? shapes.length
            : idea.id === "garden"
              ? Math.ceil(((options.step + 1) * shapes.length) / idea.steps.length)
              : Math.min(shapes.length, options.step + 1);
    const paths = shapes
        .map((shape, index) => {
            if (options.step !== undefined && index >= upto) return "";
            const colour = options.reference ? shape.colour : options.fills?.[shape.id];
            const fill = options.hit
                ? "transparent"
                : options.outlines || options.ghost
                  ? "none"
                  : colour && /^#[a-f0-9]{6}$/i.test(colour)
                    ? colour
                    : "white";
            const stroke =
                options.fillOnly || options.hit ? "none" : options.ghost ? "#7385c9" : "#30353d";
            return `<path d="${shape.d}" transform="${shape.transform}" fill="${fill}" stroke="${stroke}" stroke-width="${options.ghost ? 1.6 : 1.4}" vector-effect="non-scaling-stroke" ${options.ghost ? 'stroke-dasharray="5 5" opacity=".5"' : ""} ${options.hit ? `data-region="${shape.id}" role="button" tabindex="0" aria-label="Colour ${shape.name}"` : ""}/>`;
        })
        .join("");
    const details =
        options.fillOnly ||
        options.hit ||
        (options.step !== undefined && options.step < idea.steps.length - 1)
            ? ""
            : idea.pieces
                  .map((piece) =>
                      (MOTIFS[piece.motif]?.carve ?? [])
                          .map(
                              (d) =>
                                  `<path d="${d}" transform="translate(${piece.x} ${piece.y}) scale(${piece.size / 100})" fill="none" stroke="${options.ghost ? "#7385c9" : "#30353d"}" ${options.ghost ? 'stroke-dasharray="4 4" opacity=".5"' : ""} stroke-width="1.3" vector-effect="non-scaling-stroke"/>`,
                          )
                          .join(""),
                  )
                  .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 3.2}" height="${h * 3.2}" stroke-linecap="round" stroke-linejoin="round" ${options.hit ? 'aria-label="Colouring shapes"' : 'aria-hidden="true"'}><g transform="translate(${(w - 300 * k) / 2} ${(h - 200 * k) / 2}) scale(${k})">${paths}${details}</g></svg>`;
}
