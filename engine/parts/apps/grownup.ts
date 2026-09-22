// A grown-up's own portrait for the bar and the account page: head and shoulders in the sketchbook
// line, friendly and simple, on a square 3-square box with the head in the middle and room either
// side. The ten kinds differ in what a line can honestly vary, hair, glasses, a beard, a headscarf, a
// cap and an age, and in nothing else: every face is the paper and every head of hair the one grey,
// so no kind reads as a colour. It stands on the postage stamp with its quiet ground, as the objects
// in portrait.ts did before it.
import { plain, type Ctx } from "../../ink/surface";
import { defineDrawing } from "../drawing";

export const GROWNUPS = [
    "short",
    "long",
    "curly",
    "bun",
    "braids",
    "glasses",
    "beard",
    "headscarf",
    "cap",
    "grey",
] as const;
export type GrownupKind = (typeof GROWNUPS)[number];

/** The word a picker shows under each, which says what is drawn and nothing about who. */
export const GROWNUP_WORD: Record<GrownupKind, string> = {
    short: "Short hair",
    long: "Long hair",
    curly: "Curly hair",
    bun: "A bun",
    braids: "Braids",
    glasses: "Glasses",
    beard: "A beard",
    headscarf: "A headscarf",
    cap: "A cap",
    grey: "Grey hair",
};

/** The outline's weight in the 60-unit box: about 1.5 px at the bar's 34 px and 6.5 px on the picker's 150. */
const W = 2.6;
const line = <G>(c: Ctx<G>, w = W) => ({
    strokeWidth: w,
    roughness: 0.5 * c.pen.o.roughness,
    bowing: 0.6 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** Hair is one flat grey, laid without the pen so it is the same shape at every size and prints as it looks. */
const hair = <G>(c: Ctx<G>, d: string): void =>
    plain(c, { kind: "path", d, fill: c.t["ink-soft"], stroke: "none" });

/** The head's middle and size, which every kind shares. */
const CX = 30,
    CY = 26,
    R = 13;

const circle = (cx: number, cy: number, r: number) =>
    `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;

/** The shoulders, up to the neck, on the paper. */
function shoulders<G>(c: Ctx<G>): void {
    c.pen.path(
        c.g,
        "M4 60Q5 48 20 45Q25 44 25 40H35Q35 44 40 45Q55 48 56 60Z",
        "pencil",
        c.pen.fill("card"),
        line(c),
    );
}

/** The face on the paper, with its ears, and the features every kind has: two eyes, a nose and a smile. */
function head<G>(c: Ctx<G>, o: { older?: boolean } = {}): void {
    const { pen, g } = c;
    for (const s of [-1, 1])
        pen.path(
            g,
            `M${CX + s * (R - 1)} ${CY - 3}Q${CX + s * (R + 4)} ${CY - 2} ${CX + s * (R + 3)} ${CY + 3}Q${CX + s * (R + 1)} ${CY + 5} ${CX + s * (R - 1)} ${CY + 3}`,
            "pencil",
            pen.fill("card"),
            line(c, 1.8),
        );
    pen.path(g, circle(CX, CY, R), "pencil", pen.fill("card"), line(c));
    for (const s of [-1, 1]) {
        plain(c, { kind: "circle", cx: CX + s * 5, cy: CY - 1, r: 1.7, fill: c.t.ink });
        pen.path(
            g,
            `M${CX + s * 7.5} ${CY - 6}Q${CX + s * 5} ${CY - 7.5} ${CX + s * 2.5} ${CY - 6}`,
            "pencil",
            null,
            line(c, 1.4),
        );
        if (o.older)
            for (const dy of [-1.5, 1.5])
                pen.line(
                    g,
                    CX + s * 8,
                    CY - 1 + dy,
                    CX + s * 10.5,
                    CY - 1 + dy * 1.8,
                    "pencil",
                    line(c, 1.1),
                );
    }
    pen.path(
        g,
        `M${CX} ${CY}Q${CX + 1.5} ${CY + 3.5} ${CX - 1} ${CY + 4}`,
        "pencil",
        null,
        line(c, 1.4),
    );
    pen.path(
        g,
        `M${CX - 4.5} ${CY + 6.5}Q${CX} ${CY + 10} ${CX + 4.5} ${CY + 6.5}`,
        "pencil",
        null,
        line(c, 1.7),
    );
}

/** Short hair: a cap over the top of the head with its edge at the forehead. */
const shortHair = <G>(c: Ctx<G>): void => {
    hair(
        c,
        `M${CX - 12.5} ${CY - 2}Q${CX - 13} ${CY - 15} ${CX} ${CY - 14}Q${CX + 13} ${CY - 15} ${CX + 12.5} ${CY - 2}Q${CX + 10} ${CY - 9} ${CX} ${CY - 9.5}Q${CX - 10} ${CY - 9} ${CX - 12.5} ${CY - 2}Z`,
    );
};

function short<G>(c: Ctx<G>): void {
    shoulders(c);
    head(c);
    shortHair(c);
}

function long<G>(c: Ctx<G>): void {
    shoulders(c);
    // the hair behind the head, falling past the shoulders, then the face over it, then the fringe
    hair(
        c,
        `M${CX - 16} 54Q${CX - 17} 10 ${CX} 9Q${CX + 17} 10 ${CX + 16} 54Q${CX + 8} 56 ${CX + 6} 50L${CX + 6} 40Q${CX} 42 ${CX - 6} 40L${CX - 6} 50Q${CX - 8} 56 ${CX - 16} 54Z`,
    );
    head(c);
    hair(
        c,
        `M${CX - 13} ${CY - 2}Q${CX - 13} ${CY - 15} ${CX} ${CY - 14}Q${CX + 13} ${CY - 15} ${CX + 13} ${CY - 2}Q${CX + 12} ${CY - 8} ${CX + 4} ${CY - 9}Q${CX - 6} ${CY - 6} ${CX - 13} ${CY - 2}Z`,
    );
}

function curly<G>(c: Ctx<G>): void {
    shoulders(c);
    // a ring of curls round the top and sides, behind the face
    for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI,
            r = i % 2 ? 4.5 : 5.5;
        hair(c, circle(CX + Math.cos(a) * (R + 1), CY + Math.sin(a) * (R + 1), r));
    }
    for (const s of [-1, 1]) {
        hair(c, circle(CX + s * (R + 3), CY + 5, 4.5));
        hair(c, circle(CX + s * (R + 2), CY + 12, 4));
    }
    head(c);
    hair(
        c,
        `M${CX - 12} ${CY - 3}Q${CX - 8} ${CY - 11} ${CX} ${CY - 10}Q${CX + 8} ${CY - 11} ${CX + 12} ${CY - 3}Q${CX + 6} ${CY - 6} ${CX} ${CY - 6}Q${CX - 6} ${CY - 6} ${CX - 12} ${CY - 3}Z`,
    );
}

function bun<G>(c: Ctx<G>): void {
    shoulders(c);
    hair(c, circle(CX, CY - R - 5, 6.5));
    head(c);
    hair(
        c,
        `M${CX - 13} ${CY - 2}Q${CX - 13} ${CY - 15} ${CX} ${CY - 14}Q${CX + 13} ${CY - 15} ${CX + 13} ${CY - 2}Q${CX + 9} ${CY - 8} ${CX} ${CY - 8.5}Q${CX - 9} ${CY - 8} ${CX - 13} ${CY - 2}Z`,
    );
}

function braids<G>(c: Ctx<G>): void {
    shoulders(c);
    // a braid either side, behind the shoulders' line, as a run of small lumps
    for (const s of [-1, 1])
        for (let k = 0; k < 5; k++)
            hair(c, circle(CX + s * (R + 3 + k * 0.6), CY + 6 + k * 5.5, 3.2 - k * 0.15));
    head(c);
    hair(
        c,
        `M${CX - 13} ${CY - 2}Q${CX - 13} ${CY - 15} ${CX} ${CY - 14}Q${CX + 13} ${CY - 15} ${CX + 13} ${CY - 2}Q${CX + 9} ${CY - 8} ${CX} ${CY - 8.5}Q${CX - 9} ${CY - 8} ${CX - 13} ${CY - 2}Z`,
    );
    c.pen.line(c.g, CX, CY - 14, CX, CY - 8.5, "pencil", { ...line(c, 1.2), stroke: c.t.card });
}

function glasses<G>(c: Ctx<G>): void {
    shoulders(c);
    head(c);
    shortHair(c);
    const { pen, g } = c;
    for (const s of [-1, 1])
        pen.path(g, circle(CX + s * 5.5, CY - 1, 4.6), "pencil", null, line(c, 1.8));
    pen.path(
        g,
        `M${CX - 1} ${CY - 2}Q${CX} ${CY - 3.5} ${CX + 1} ${CY - 2}`,
        "pencil",
        null,
        line(c, 1.5),
    );
    for (const s of [-1, 1])
        pen.line(g, CX + s * 10, CY - 1.5, CX + s * (R + 1), CY - 3, "pencil", line(c, 1.5));
}

function beard<G>(c: Ctx<G>): void {
    shoulders(c);
    head(c);
    shortHair(c);
    // the beard leaves the mouth clear, so the smile is drawn again over it in ink
    hair(
        c,
        `M${CX - 12} ${CY + 1}Q${CX - 13} ${CY + 19} ${CX} ${CY + 21}Q${CX + 13} ${CY + 19} ${CX + 12} ${CY + 1}Q${CX + 9} ${CY + 11} ${CX} ${CY + 12}Q${CX - 9} ${CY + 11} ${CX - 12} ${CY + 1}Z`,
    );
    c.pen.path(
        c.g,
        `M${CX - 4.5} ${CY + 6.5}Q${CX} ${CY + 10} ${CX + 4.5} ${CY + 6.5}`,
        "pencil",
        null,
        line(c, 1.7),
    );
}

function headscarf<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    shoulders(c);
    // the scarf round the head and down to the shoulders, behind the face, then its edge over the forehead
    pen.path(
        g,
        `M${CX - 17} 52Q${CX - 19} 8 ${CX} 7Q${CX + 19} 8 ${CX + 17} 52Q${CX} 50 ${CX - 17} 52Z`,
        "pencil",
        pen.fill("card"),
        line(c),
    );
    head(c);
    pen.path(
        g,
        `M${CX - 13} ${CY - 1}Q${CX - 12} ${CY - 12} ${CX} ${CY - 12}Q${CX + 12} ${CY - 12} ${CX + 13} ${CY - 1}`,
        "pencil",
        null,
        line(c, 1.8),
    );
    pen.path(
        g,
        `M${CX - 14} ${CY + 1}Q${CX - 13} ${CY + 12} ${CX - 4} ${CY + 19}`,
        "pencil",
        null,
        line(c, 1.5),
    );
    pen.path(
        g,
        `M${CX + 14} ${CY + 1}Q${CX + 13} ${CY + 12} ${CX + 4} ${CY + 19}`,
        "pencil",
        null,
        line(c, 1.5),
    );
}

function cap<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    shoulders(c);
    head(c);
    pen.path(
        g,
        `M${CX - 14} ${CY - 3}Q${CX - 14} ${CY - 17} ${CX} ${CY - 17}Q${CX + 14} ${CY - 17} ${CX + 14} ${CY - 3}Z`,
        "pencil",
        pen.fill("card"),
        line(c),
    );
    pen.path(
        g,
        `M${CX + 8} ${CY - 5}L${CX + 27} ${CY - 2}Q${CX + 19} ${CY + 2} ${CX + 10} ${CY + 0.5}Z`,
        "pencil",
        pen.fill("card"),
        line(c, 1.8),
    );
    pen.line(g, CX, CY - 17, CX, CY - 10, "pencil", line(c, 1.3));
}

function grey<G>(c: Ctx<G>): void {
    const { pen, g } = c;
    shoulders(c);
    head(c, { older: true });
    // the hair on the paper rather than in grey, with its edge drawn, which is what makes it white
    pen.path(
        g,
        `M${CX - 12.5} ${CY - 2}Q${CX - 13} ${CY - 15} ${CX} ${CY - 14}Q${CX + 13} ${CY - 15} ${CX + 12.5} ${CY - 2}Q${CX + 10} ${CY - 9} ${CX} ${CY - 9.5}Q${CX - 10} ${CY - 9} ${CX - 12.5} ${CY - 2}Z`,
        "pencil",
        pen.fill("card"),
        line(c, 1.8),
    );
    for (const s of [-1, 1])
        pen.path(
            g,
            `M${CX + s * 4} ${CY - 13}Q${CX + s * 6} ${CY - 11} ${CX + s * 9} ${CY - 11}`,
            "pencil",
            null,
            line(c, 1.2),
        );
}

const DRAW: Record<GrownupKind, <G>(c: Ctx<G>) => void> = {
    short,
    long,
    curly,
    bun,
    braids,
    glasses,
    beard,
    headscarf,
    cap,
    grey,
};

const SAID: Record<GrownupKind, string> = {
    short: "A grown-up's head and shoulders drawn in pencil, smiling, with short hair over the top of the head, the face left as paper.",
    long: "A grown-up's head and shoulders drawn in pencil, smiling, with long hair falling past the shoulders and a fringe swept to one side.",
    curly: "A grown-up's head and shoulders drawn in pencil, smiling, with a ring of tight curls all round the top and sides of the head.",
    bun: "A grown-up's head and shoulders drawn in pencil, smiling, with the hair drawn back into a round bun on top of the head.",
    braids: "A grown-up's head and shoulders drawn in pencil, smiling, with a parting down the middle and a braid hanging down either side.",
    glasses:
        "A grown-up's head and shoulders drawn in pencil, smiling, with short hair and a pair of round glasses on the nose.",
    beard: "A grown-up's head and shoulders drawn in pencil, smiling, with short hair and a full beard round the chin and jaw.",
    headscarf:
        "A grown-up's head and shoulders drawn in pencil, smiling, with a headscarf round the head and over the hair, falling to the shoulders.",
    cap: "A grown-up's head and shoulders drawn in pencil, smiling, with a cap on the head, its peak out to the right, and no hair showing.",
    grey: "An older grown-up's head and shoulders drawn in pencil, smiling, with short white hair and two small lines at the corner of each eye.",
};

export const grownup = defineDrawing<{ kind: GrownupKind }>({
    id: "grownup",
    family: "apps",
    title: "A grown-up",
    group: "Characters",
    about: "The picture a grown-up chooses for themselves on the bar and the account page: head and shoulders in the sketchbook line, friendly and simple, one of ten that differ only in what a line can honestly vary, the hair, glasses, a beard, a headscarf, a cap and an age. Every face is the paper and every head of hair the one grey, so none is a colour, and each stands on the postage stamp with its quiet ground.",
    params: { kind: "short" },
    settings: { kind: { kind: "one of", of: GROWNUPS } },
    takes: GROWNUPS.map((kind) => ({ label: GROWNUP_WORD[kind], params: { kind } })),
    box: () => ({ w: 3, h: 3 }),
    draw: (c, p) => {
        DRAW[p.kind](c);
        return { head: [CX, CY - R, "up"], face: [CX, CY, "up"] };
    },
    describe: (p) => SAID[p.kind],
    motion: {
        still: "A grown-up's own picture is a mark on the bar, and holds still as the icons do.",
    },
});
