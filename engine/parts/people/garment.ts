// One thing to wear, off the body: a top or a dress on a coat hanger, a skirt, shorts or trousers on
// a clip hanger, or a pair of shoes or wellies standing on the floor. It is cut and coloured from the
// same kit as the figure, so a thing on the rail and the same thing on Charlie are one look.
import { type RawAnchors } from "../../ink/surface";
import { MARKER_WORD, U } from "../../paper";
import { defineDrawing, type Box } from "../drawing";
import {
    CLOTH,
    FIRM,
    PATTERNS,
    PRINTS,
    SLEEVES,
    calm,
    cloth,
    garment as patterned,
    lookOf,
    pick,
    printOn,
    soft,
    type Cloth,
    type Look,
    type Pattern,
    type Print,
    type Sleeves,
} from "./figure";

const GARMENTS = ["top", "dress", "skirt", "shorts", "trousers", "shoes", "boots"] as const;
export type Garment = (typeof GARMENTS)[number];

type Pt = [number, number];

interface GarmentParams {
    kind: string;
    colour: string;
    sleeves: string;
    print: string;
    pattern: string;
}

interface Read {
    kind: Garment;
    colour: Cloth;
    sleeves: Sleeves;
    print: Print;
    pattern: Pattern;
}

const read = (p: GarmentParams): Read => ({
    kind: pick(GARMENTS, p.kind, "top"),
    colour: pick(CLOTH, p.colour, "sky"),
    sleeves: pick(SLEEVES, p.sleeves, "short"),
    print: pick(PRINTS, p.print, "none"),
    pattern: pick(PATTERNS, p.pattern, "plain"),
});

/** The figure kit's look for a thing on its own: its colour worn as a top and as a bottom, with its pattern and print. */
const lookFor = (r: Read): Look =>
    lookOf({
        pose: "stand",
        age: "child",
        tone: 2,
        hair: "short",
        colour: "brown",
        top: r.colour,
        sleeves: r.sleeves,
        print: r.print,
        wear: r.kind === "dress" ? "dress" : "skirt",
        bottom: r.colour,
        pattern: r.pattern,
        legs: "bare",
        feet: "shoes",
        glasses: false,
        hearing: "none",
        aid: "none",
        mood: "happy",
        dir: 1,
        holding: "",
    });

const boxOf = (kind: Garment): Box =>
    kind === "shoes" ? { w: 5, h: 3 } : kind === "boots" ? { w: 5, h: 4 } : { w: 5, h: 6 };

/** The shoulders and sleeves of a top or a dress, down to the waist, clockwise from the neck. */
const SHOULDERS: Record<Sleeves, { from: Pt[]; to: Pt[] }> = {
    long: {
        from: [
            [41, 30],
            [50, 36],
            [59, 30],
            [72, 31],
            [90, 64],
            [80, 69],
            [68, 48],
        ],
        to: [
            [32, 48],
            [20, 69],
            [10, 64],
            [28, 31],
        ],
    },
    short: {
        from: [
            [41, 30],
            [50, 36],
            [59, 30],
            [72, 31],
            [84, 46],
            [73, 52],
            [68, 48],
        ],
        to: [
            [32, 48],
            [27, 52],
            [16, 46],
            [28, 31],
        ],
    },
    none: {
        from: [
            [43, 30],
            [50, 38],
            [57, 30],
            [63, 30],
            [66, 42],
            [68, 50],
        ],
        to: [
            [32, 50],
            [34, 42],
            [37, 30],
        ],
    },
};

const colourWord = (c: Cloth): string => (c === "white" ? "white" : MARKER_WORD[c]);

function words(r: Read): string {
    const c = colourWord(r.colour);
    const look =
        r.pattern === "stripes"
            ? `${c} striped`
            : r.pattern === "spots"
              ? `${c} spotty`
              : r.pattern === "rainbow"
                ? "rainbow striped"
                : c;
    const print = r.print === "none" ? "" : ` with a ${r.print} on the front`;
    const top = r.sleeves === "long" ? "jumper" : r.sleeves === "short" ? "T-shirt" : "vest top";
    if (r.kind === "top") return `${c} ${top}${print}`;
    if (r.kind === "dress") {
        const arms = r.sleeves === "none" ? "no sleeves" : `${r.sleeves} sleeves`;
        return `${look} dress with ${arms}${print}`;
    }
    if (r.kind === "trousers") return `pair of ${c} trousers`;
    return r.kind === "skirt" ? `${look} skirt` : `pair of ${look} shorts`;
}

export const garmentDrawing = defineDrawing<GarmentParams>({
    id: "garment",
    family: "people",
    title: "Something to wear",
    group: "Props",
    about: "One thing to wear off the body: a top or a dress on a coat hanger, a skirt, shorts or trousers on a clip hanger, or a pair of shoes or wellies. It is cut from the figure's own clothes, so what hangs on a rail is what a person in a picture can put on.",
    params: { kind: "top", colour: "sky", sleeves: "short", print: "star", pattern: "plain" },
    settings: {
        kind: { kind: "one of", of: GARMENTS },
        colour: { kind: "one of", of: CLOTH },
        sleeves: { kind: "one of", of: SLEEVES },
        print: { kind: "one of", of: PRINTS },
        pattern: { kind: "one of", of: PATTERNS },
    },
    takes: [
        {
            label: "A T-shirt with a star",
            params: {
                kind: "top",
                colour: "sky",
                sleeves: "short",
                print: "star",
                pattern: "plain",
            },
        },
        {
            label: "A jumper with a flower",
            params: {
                kind: "top",
                colour: "tang",
                sleeves: "long",
                print: "flower",
                pattern: "plain",
            },
        },
        {
            label: "A vest top with a heart",
            params: {
                kind: "top",
                colour: "mint",
                sleeves: "none",
                print: "heart",
                pattern: "plain",
            },
        },
        {
            label: "A spotty dress",
            params: {
                kind: "dress",
                colour: "berry",
                sleeves: "short",
                print: "none",
                pattern: "spots",
            },
        },
        {
            label: "A striped dress with a bear",
            params: {
                kind: "dress",
                colour: "white",
                sleeves: "long",
                print: "bear",
                pattern: "stripes",
            },
        },
        {
            label: "A rainbow skirt",
            params: {
                kind: "skirt",
                colour: "sky",
                sleeves: "short",
                print: "none",
                pattern: "rainbow",
            },
        },
        {
            label: "Striped shorts",
            params: {
                kind: "shorts",
                colour: "mint",
                sleeves: "short",
                print: "none",
                pattern: "stripes",
            },
        },
        {
            label: "Trousers",
            params: {
                kind: "trousers",
                colour: "sky",
                sleeves: "short",
                print: "none",
                pattern: "plain",
            },
        },
        {
            label: "Shoes",
            params: {
                kind: "shoes",
                colour: "white",
                sleeves: "none",
                print: "none",
                pattern: "plain",
            },
        },
        {
            label: "Wellies",
            params: {
                kind: "boots",
                colour: "white",
                sleeves: "none",
                print: "none",
                pattern: "plain",
            },
        },
    ],
    box: (p) => boxOf(read(p).kind),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            r = read(p),
            look = lookFor(r);
        const W = boxOf(r.kind).w * U;
        const hook = (y: number): void =>
            pen.path(g, `M50 ${y}V11C50 5 57 3 60 6C62 9 60 12 57 12`, "pencil", null, {
                strokeWidth: 1.8,
                ...FIRM,
            });
        if (r.kind === "shoes" || r.kind === "boots") {
            const welly = r.kind === "boots";
            for (const x of [6, 50]) {
                const d = welly
                    ? `M${x} 16H${x + 24}V56Q${x + 26} 60 ${x + 36} 62Q${x + 44} 64 ${x + 44} 74H${x}Z`
                    : `M${x} 54Q${x} 38 ${x + 12} 36L${x + 24} 36Q${x + 30} 44 ${x + 40} 46Q${x + 44} 48 ${x + 44} 54Z`;
                pen.path(
                    g,
                    d,
                    "pencil",
                    welly ? pen.fill("glow") : { fill: c.t.ink, fillStyle: "solid" },
                    calm(c, 1.6),
                );
                if (welly) pen.line(g, x, 22, x + 24, 22, "ruler", { strokeWidth: 1.2, ...FIRM });
                else
                    for (const k of [0, 5])
                        pen.line(g, x + 15 + k, 39, x + 19 + k, 44, "ruler", {
                            strokeWidth: 1.4,
                            stroke: c.t.card,
                            ...FIRM,
                        });
            }
            return { sole: [W / 2, welly ? 74 : 54, "down"] };
        }
        const top = r.kind === "top" || r.kind === "dress";
        if (top) {
            hook(17);
            pen.path(g, "M50 17L21 31H79Z", "ruler", null, { strokeWidth: 1.8, ...FIRM });
            const s = SHOULDERS[r.sleeves];
            const hem = r.kind === "dress" ? 116 : 86,
                flare = r.kind === "dress" ? 16 : 0;
            const body: Pt[] = [...s.from, [68 + flare, hem], [32 - flare, hem], ...s.to];
            if (r.kind === "dress") patterned(c, soft(body, 0.2), look, r.colour, 30, hem, 10, 90);
            else pen.path(g, soft(body, 0.2), "pencil", cloth(c, r.colour), calm(c, 1.7));
            const neck = s.from[0] ?? [41, 30],
                dip = s.from[1] ?? [50, 36],
                back = s.from[2] ?? [59, 30];
            pen.curve(
                g,
                [
                    [neck[0] + 0.5, neck[1] + 0.5],
                    [dip[0], dip[1] + 0.5],
                    [back[0] - 0.5, back[1] + 0.5],
                ],
                "ruler",
                { strokeWidth: 1.1, ...FIRM },
            );
            printOn(c, look, 50, 58, 8);
            return { hook: [57, 3, "up"], chest: [50, 58, "right"], hem: [50, hem, "down"] };
        }
        hook(22);
        pen.line(g, 24, 22, 76, 22, "ruler", { strokeWidth: 2, ...FIRM });
        const hem = r.kind === "skirt" ? 84 : r.kind === "shorts" ? 76 : 116;
        const pts: Pt[] =
            r.kind === "skirt"
                ? [
                      [32, 30],
                      [68, 30],
                      [84, hem],
                      [16, hem],
                  ]
                : [
                      [32, 30],
                      [68, 30],
                      [72, hem],
                      [53, hem],
                      [50, r.kind === "shorts" ? 54 : 58],
                      [47, hem],
                      [28, hem],
                  ];
        if (r.kind === "trousers")
            pen.path(g, soft(pts, 0.12), "pencil", cloth(c, r.colour), calm(c, 1.7));
        else
            patterned(
                c,
                soft(pts, r.kind === "skirt" ? 0.18 : 0.14),
                look,
                r.colour,
                30,
                hem,
                14,
                86,
            );
        pen.line(g, 33, 34, 67, 34, "ruler", { strokeWidth: 0.9, ...FIRM });
        for (const x of [30, 66])
            pen.rect(g, x, 20, 5, 13, "ruler", pen.fill("grid"), { strokeWidth: 1.2, ...FIRM });
        return { hook: [57, 3, "up"], waist: [50, 30, "up"], hem: [50, hem, "down"] };
    },
    describe: (p) => {
        const r = read(p);
        if (r.kind === "shoes")
            return "A pair of black shoes with round toes and white laces, standing side by side and facing the same way.";
        if (r.kind === "boots")
            return "A pair of yellow wellington boots with a band round the top, standing side by side and facing the same way.";
        const hanger =
            r.kind === "top" || r.kind === "dress"
                ? "from a coat hanger by its shoulders, with the hook at the top"
                : "from a clip hanger by its waistband, with the hook at the top";
        return `A ${words(r)}, hanging ${hanger}.`;
    },
    // it swings a little from its hook, as a thing on a hanger does when the rail is touched
    motion: { body: { is: "sway", deg: 2.2, period: 4.6, pivot: [0.5, 0] } },
});
