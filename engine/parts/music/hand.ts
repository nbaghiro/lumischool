import { plain, group, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

interface HandParams {
    side: "left" | "right" | "both";
    /** Whose numbers: the pianist's, thumb 1 to little finger 5, or the guitarist's, pointer 1 to little finger 4. */
    numbers: "piano" | "guitar" | "none";
    /** A finger to ring, by its number in the numbering shown, or 0 for none. */
    ring: number;
    /** Colour the guitarist's four fingers the way the finger dots on a chord box are coloured. */
    colours: boolean;
}

/** Finger outlines for a left hand seen from above, fingers up: centre, top and width in squares. */
const DIGITS = [
    { name: "little", cx: 1.9, top: 4.0, w: 1.05 },
    { name: "ring", cx: 3.15, top: 2.4, w: 1.15 },
    { name: "middle", cx: 4.45, top: 1.7, w: 1.2 },
    { name: "pointer", cx: 5.75, top: 2.5, w: 1.15 },
] as const;

const PALM_TOP = 6.2,
    WRIST = 10.6;

const HAND_W = 9;

const pianoNumber: Record<string, string> = {
    thumb: "1",
    pointer: "2",
    middle: "3",
    ring: "4",
    little: "5",
};

const guitarNumber: Record<string, string> = {
    thumb: "T",
    pointer: "1",
    middle: "2",
    ring: "3",
    little: "4",
};

const GUITAR_MARK: Record<string, "sky" | "mint" | "berry" | "tang"> = {
    pointer: "sky",
    middle: "mint",
    ring: "berry",
    little: "tang",
};

/** A capsule, the shape of a finger: a rectangle with a round end at the top. */
const fingerPath = (x: number, top: number, w: number, bottom: number): string => {
    const r = w / 2;
    return `M${x - r} ${bottom}V${top + r}A${r} ${r} 0 0 1 ${x + r} ${top + r}V${bottom}Z`;
};

function oneHand<G>(
    c: Ctx<G>,
    p: HandParams,
    side: "left" | "right",
    dx: number,
    a: RawAnchors,
): void {
    const { pen, g } = c;
    const X = (x: number) => (dx + (side === "left" ? x : HAND_W - x)) * U;
    const numbering =
        p.numbers === "guitar" ? guitarNumber : p.numbers === "piano" ? pianoNumber : null;
    // The palm, then the thumb reaching out to the side, then the fingers over both.
    pen.path(
        g,
        `M${X(1.3)} ${PALM_TOP * U}Q${X(1.2)} ${WRIST * U} ${X(2.2)} ${WRIST * U}H${X(5.6)}Q${X(6.9)} ${WRIST * U} ${X(6.8)} ${(PALM_TOP + 1.2) * U}L${X(6.4)} ${PALM_TOP * U}Z`,
        "pencil",
        pen.fill("card"),
        { strokeWidth: 1.8 },
    );
    const thumbBase: [number, number] = [X(6.1), (PALM_TOP + 2.9) * U];
    const thumbTip: [number, number] = [X(8.2), (PALM_TOP - 0.9) * U];
    const ang = Math.atan2(thumbTip[1] - thumbBase[1], thumbTip[0] - thumbBase[0]);
    const deg = (ang * 180) / Math.PI + 90;
    const len = Math.hypot(thumbTip[0] - thumbBase[0], thumbTip[1] - thumbBase[1]);
    const tg = group(c, {
        turn: [
            ["translate", thumbBase[0], thumbBase[1]],
            ["rotate", deg],
        ],
    }).g;
    pen.path(tg, fingerPath(0, -len, 1.25 * U, 0.3 * U), "pencil", pen.fill("card"), {
        strokeWidth: 1.8,
    });
    const all = [
        ...DIGITS.map((d) => ({ ...d, tip: [X(d.cx), d.top * U] as [number, number] })),
        { name: "thumb", tip: thumbTip },
    ];
    for (const d of DIGITS) {
        const fill =
            p.colours && p.numbers === "guitar" ? pen.fill(GUITAR_MARK[d.name]) : pen.fill("card");
        pen.path(g, fingerPath(X(d.cx), d.top * U, d.w * U, (PALM_TOP + 0.6) * U), "pencil", fill, {
            strokeWidth: 1.8,
        });
        // A nail, which is what says this is the back of the hand rather than the palm.
        pen.ellipse(g, X(d.cx), (d.top + 0.75) * U, d.w * U * 0.55, 0.7 * U, "pencil", null, {
            strokeWidth: 1.1,
            stroke: c.t["ink-soft"],
        });
    }
    for (const d of all) {
        const label2 = numbering?.[d.name] ?? "";
        const [tx, ty] =
            d.name === "thumb"
                ? [d.tip[0] + (side === "left" ? 0.4 : -0.4) * U, d.tip[1] - 0.9 * U]
                : [d.tip[0], d.tip[1] - 0.95 * U];
        if (label2) {
            if (c.paper) plain(c, { kind: "circle", cx: tx, cy: ty - 5, r: 9, fill: c.t.card });
            say(c, tx, ty, label2, 16);
        }
        // The ring is counted in the numbering shown, or the pianist's when none is, so a question can
        // ring a finger and ask for its number.
        if (String(p.ring) === (numbering ?? pianoNumber)[d.name])
            pen.circle(g, tx, ty - 5, 1.5 * U, "doodle", null, {
                strokeWidth: 2.4,
                stroke: c.t.pen,
            });
        a[`${side}-${d.name}`] = [tx, ty - 12, "up"];
    }
    say(
        c,
        X(4),
        (WRIST + 0.2) * U + 14,
        side === "left" ? "left" : "right",
        13,
        "middle",
        c.t["ink-soft"],
    );
}

/**
 * Hands seen from above, the backs of them, fingers pointing away: how a child sees their own hands
 * over a keyboard or looking at the fretting hand. The two numberings are the trap worth drawing
 * side by side: a pianist's thumb is 1 and a guitarist's pointer finger is 1.
 */
export const hands = defineDrawing<HandParams>({
    id: "hand",
    family: "music",
    title: "Hands and finger numbers",
    group: "Structures",
    about:
        "Hands seen from above, fingers pointing away, with each finger's number over it: a pianist's " +
        "numbers, thumb 1 to little finger 5 on both hands, or a guitarist's, pointer 1 to little finger " +
        "4 with the thumb as T. The guitarist's fingers can carry the four colours the chord boxes use.",
    params: { side: "right", numbers: "piano", ring: 0, colours: false },
    settings: {
        side: { kind: "one of", of: ["left", "right", "both"] },
        numbers: { kind: "one of", of: ["piano", "guitar", "none"] },
        ring: { kind: "whole", min: 0, max: 5 },
        colours: { kind: "flag" },
    },
    takes: [
        {
            label: "A pianist's numbers",
            params: { side: "both", numbers: "piano", ring: 0, colours: false },
        },
        {
            label: "A guitarist's fretting hand",
            params: { side: "left", numbers: "guitar", ring: 0, colours: true },
        },
        {
            label: "Which finger is 3",
            params: { side: "right", numbers: "piano", ring: 3, colours: false },
        },
    ],
    box: (p) => ({ w: p.side === "both" ? HAND_W * 2 : HAND_W, h: 12 }),
    draw: (c, p) => {
        const a: RawAnchors = {};
        if (p.side === "both") {
            oneHand(c, p, "left", 0, a);
            oneHand(c, p, "right", HAND_W, a);
        } else oneHand(c, p, p.side === "left" ? "left" : "right", 0, a);
        return a;
    },
    describe: (p) =>
        `${p.side === "both" ? "Two hands" : `A ${p.side} hand`} seen from above with the fingers pointing away, a number written over each finger${p.colours ? ", the fingers coloured" : ""}.`,
});
