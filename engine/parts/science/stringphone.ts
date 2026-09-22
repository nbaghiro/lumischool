import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect, type Fill } from "../../ink/pen";
import { SKIN, U } from "../../paper";
import { defineDrawing } from "../drawing";
import { placePerson, type PersonParams } from "../people/figure";

type Pt = [number, number];

const CHILD: PersonParams = {
    pose: "think",
    age: "child",
    tone: 3,
    hair: "short",
    colour: "brown",
    top: "sky",
    wear: "trousers",
    glasses: false,
    hearing: "none",
    aid: "none",
    mood: "happy",
    dir: 1,
    holding: "",
};

/** What a tap travels through to the ear, in the order `through` counts them. */
const MEDIA = ["air", "wood", "water"] as const;

/** What each of them is called in the words a screen reader says. */
const BETWEEN: Record<(typeof MEDIA)[number], string> = {
    air: "nothing but air",
    wood: "a wooden table",
    water: "a tank of water",
};

const skinOf = <G>(c: Ctx<G>, tone: number): Fill => {
    const t = SKIN[tone - 1] ?? { screen: "#D5AB86", print: "#E4E4E4" };
    return { fill: c.paper ? t.print : t.screen, fillStyle: "solid" };
};

/** A cup lying on its side with its base at `x`, open along `dir`: the far end is the mouth. */
function cupAt<G>(c: Ctx<G>, x: number, y: number, dir: 1 | -1): void {
    const { pen, g } = c,
        L = 0.9 * U,
        base = 0.28 * U,
        mouth = 0.45 * U;
    pen.path(
        g,
        `M${x} ${y - base}L${x + dir * L} ${y - mouth}V${y + mouth}L${x} ${y + base}Z`,
        "ruler",
        pen.fill("glow"),
        { strokeWidth: 1.5 },
    );
}

/** Sound as short arcs across a line, at points along it, each facing the way the sound goes. */
function arcsAlong<G>(c: Ctx<G>, at: (t: number) => Pt, ts: readonly number[]): void {
    for (const t of ts) {
        const [x, y] = at(t),
            [x2, y2] = at(t + 0.01),
            turn = Math.atan2(y2 - y, x2 - x);
        c.pen.arc(
            c.g,
            x - 0.35 * U * Math.cos(turn),
            y - 0.35 * U * Math.sin(turn),
            0.9 * U,
            0.9 * U,
            turn - 0.7,
            turn + 0.7,
            "pencil",
            {
                strokeWidth: 1.6,
                stroke: c.t.pen,
            },
        );
    }
}

/** Two children with cups on a string between them; the left one speaks. */
function phone<G>(c: Ctx<G>, taut: boolean, pinch: boolean, rings: boolean): RawAnchors {
    const { pen, g } = c,
        base = 7.6 * U,
        left = placePerson(c, { ...CHILD, dir: 1 }, 2.4 * U, base),
        right = placePerson(
            c,
            { ...CHILD, dir: -1, tone: 5, hair: "puffs", colour: "black", top: "mint" },
            17.6 * U,
            base,
            { seed: 2 },
        ),
        hl = left.hand ?? [3.2 * U, 3 * U, "up"],
        hr = right.hand ?? [16.8 * U, 3 * U, "up"],
        a: Pt = [hl[0] + 0.9 * U, hl[1]],
        b: Pt = [hr[0] - 0.9 * U, hr[1]],
        droop = taut ? 0 : 2.4 * U,
        mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + droop];
    cupAt(c, a[0], a[1], -1);
    cupAt(c, b[0], b[1], 1);
    // a slack string is a curve through the middle point it sags to
    const at = (t: number): Pt => [
        (1 - t) * (1 - t) * a[0] +
            2 * t * (1 - t) * (2 * mid[0] - (a[0] + b[0]) / 2) +
            t * t * b[0],
        (1 - t) * (1 - t) * a[1] +
            2 * t * (1 - t) * (2 * mid[1] - (a[1] + b[1]) / 2) +
            t * t * b[1],
    ];
    const [qx, qy] = [2 * mid[0] - (a[0] + b[0]) / 2, 2 * mid[1] - (a[1] + b[1]) / 2];
    pen.path(
        g,
        taut ? `M${a[0]} ${a[1]}L${b[0]} ${b[1]}` : `M${a[0]} ${a[1]}Q${qx} ${qy} ${b[0]} ${b[1]}`,
        "ruler",
        null,
        {
            strokeWidth: 1.4,
        },
    );
    if (pinch) {
        const [px, py] = at(0.5),
            hand = skinOf(c, 2);
        pen.path(
            g,
            `M${px - 0.35 * U} ${base + 0.3 * U}L${px - 0.3 * U} ${py + 1.2 * U}H${px + 0.35 * U}L${px + 0.4 * U} ${base + 0.3 * U}`,
            "ruler",
            pen.fill("berry"),
            { strokeWidth: 1.4 },
        );
        pen.path(g, roundedRect(px - 0.5 * U, py + 0.35 * U, 1 * U, 0.95 * U, 7), "ruler", hand, {
            strokeWidth: 1.4,
        });
        pen.path(
            g,
            `M${px - 0.35 * U} ${py + 0.45 * U}Q${px - 0.5 * U} ${py - 0.3 * U} ${px - 0.05 * U} ${py - 0.25 * U}Q${px + 0.05 * U} ${py + 0.1 * U} ${px - 0.12 * U} ${py + 0.45 * U}Z`,
            "ruler",
            hand,
            { strokeWidth: 1.2 },
        );
        pen.path(
            g,
            `M${px + 0.35 * U} ${py + 0.45 * U}Q${px + 0.5 * U} ${py + 0.1 * U} ${px + 0.05 * U} ${py + 0.05 * U}Q${px - 0.02 * U} ${py + 0.2 * U} ${px + 0.12 * U} ${py + 0.45 * U}Z`,
            "ruler",
            hand,
            { strokeWidth: 1.2 },
        );
    }
    // sound travels only along a tight string, and no further than a pinch
    if (rings && taut) arcsAlong(c, at, pinch ? [0.15, 0.3] : [0.15, 0.32, 0.5, 0.68, 0.85]);
    return {
        speaker: left.head ?? [2.4 * U, 2 * U, "up"],
        listener: right.head ?? [17.6 * U, 2 * U, "up"],
        string: [mid[0], mid[1], "down"],
    };
}

/** A fist knocking at the left, an ear at the right, and air, a table or a tank of water between. */
function through<G>(c: Ctx<G>, medium: (typeof MEDIA)[number], rings: boolean): RawAnchors {
    const { pen, g } = c,
        y = 4.2 * U,
        x0 = 4.2 * U,
        x1 = 15.8 * U;
    if (medium === "wood") {
        pen.rect(
            g,
            x0,
            y - 0.7 * U,
            x1 - x0,
            1.4 * U,
            "ruler",
            pen.fill("tang", "hachure", { hachureGap: c.paper ? 12 : 7, fillWeight: 0.6 }),
            { strokeWidth: 2 },
        );
        for (const x of [x0 + 1.2 * U, x1 - 1.6 * U])
            pen.rect(g, x, y + 0.7 * U, 0.5 * U, 2.8 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.6,
            });
    } else if (medium === "water") {
        pen.path(g, `M${x0} ${y - 1.9 * U}V${y + 1.9 * U}H${x1}V${y - 1.9 * U}`, "ruler", null, {
            strokeWidth: 2.2,
        });
        pen.path(
            g,
            `M${x0} ${y - 1.3 * U}Q${x0 + 1.5 * U} ${y - 1.6 * U} ${x0 + 3 * U} ${y - 1.3 * U}T${x0 + 6 * U} ${y - 1.3 * U}T${x0 + 9 * U} ${y - 1.3 * U}T${x1} ${y - 1.3 * U}V${y + 1.9 * U}H${x0}Z`,
            "ruler",
            pen.fill("sky", "hachure", { hachureGap: c.paper ? 14 : 8, fillWeight: 0.6 }),
            { strokeWidth: 1.2 },
        );
    } else {
        pen.rect(
            g,
            x0 - 0.4 * U,
            y - 0.9 * U,
            1.4 * U,
            1.8 * U,
            "ruler",
            pen.fill("tang", "hachure", { hachureGap: 6 }),
            { strokeWidth: 1.8 },
        );
    }
    // the knocking fist, its arm coming in from the left edge, knuckles to the knock
    const fx = x0 - 0.4 * U;
    pen.path(g, `M0 ${y - 0.35 * U}H${fx - 1.2 * U}V${y + 0.55 * U}H0`, "ruler", pen.fill("sky"), {
        strokeWidth: 1.6,
    });
    pen.path(
        g,
        roundedRect(fx - 1.4 * U, y - 0.75 * U, 1.4 * U, 1.5 * U, 8),
        "ruler",
        skinOf(c, 4),
        { strokeWidth: 1.6 },
    );
    for (const k of [-0.4, 0, 0.4])
        pen.path(
            g,
            `M${fx - 0.45 * U} ${y + k * U - 0.17 * U}q${0.3 * U} 0 ${0.3 * U} ${0.17 * U}t${-0.3 * U} ${0.17 * U}`,
            "ruler",
            null,
            { strokeWidth: 1 },
        );
    pen.path(
        g,
        `M${fx - 1.2 * U} ${y - 1.3 * U}l${0.15 * U} ${-0.5 * U}M${fx - 0.5 * U} ${y - 1.2 * U}l${0.2 * U} ${-0.6 * U}`,
        "pencil",
        null,
        { strokeWidth: 1.2, stroke: c.t.pen },
    );
    // the listener stands at the far end with the side of their head against it
    const ex = x1;
    const listener = placePerson(
        c,
        { ...CHILD, pose: "stand", dir: -1, tone: 5, hair: "puffs", colour: "black", top: "mint" },
        ex + 0.62 * U,
        7.8 * U,
        { size: 0.9, seed: 3 },
    );
    if (rings) {
        const from = medium === "air" ? x0 + 1.4 * U : x0 + 0.6 * U;
        arcsAlong(c, (t) => [from + t * (x1 - 0.4 * U - from), y], [0.12, 0.36, 0.6, 0.84]);
    }
    return {
        knock: [fx, y, "up"],
        ear: listener.head ?? [ex, y - 1.2 * U, "up"],
        medium: [(x0 + x1) / 2, y - (medium === "water" ? 1.9 : 0.9) * U, "up"],
    };
}

export const stringPhone = defineDrawing({
    id: "stringphone",
    family: "science",
    title: "String telephone",
    group: "Structures",
    about: "Two children with a paper cup each and a string between the cups: the one on the left speaks and the one on the right listens. `taut` pulls the string tight or lets it droop, `pinch` puts a hand pinching it halfway, and `rings` draws the sound as arcs along the string, only as far as the string can carry it, so none past a pinch and none on a slack string. With `mode` through the picture is a fist knocking at one end and an ear pressed to the other, with air, a wooden table or a tank of water between (`through` 0, 1 or 2), and the same number of arcs whatever it goes through.",
    params: { mode: "phone", taut: 1, pinch: 0, rings: 1, through: 1 },
    settings: {
        mode: { kind: "one of", of: ["phone", "through"] },
        taut: { kind: "whole", min: 0, max: 1 },
        pinch: { kind: "whole", min: 0, max: 1 },
        rings: { kind: "whole", min: 0, max: 1 },
        through: { kind: "whole", min: 0, max: 2 },
    },
    takes: [
        {
            label: "Pulled tight",
            params: { mode: "phone", taut: 1, pinch: 0, rings: 1, through: 1 },
        },
        { label: "Slack", params: { mode: "phone", taut: 0, pinch: 0, rings: 1, through: 1 } },
        { label: "Pinched", params: { mode: "phone", taut: 1, pinch: 1, rings: 1, through: 1 } },
        {
            label: "Through a table",
            params: { mode: "through", taut: 1, pinch: 0, rings: 1, through: 1 },
        },
        {
            label: "Through water",
            params: { mode: "through", taut: 1, pinch: 0, rings: 1, through: 2 },
        },
        {
            label: "Through the air, no arcs",
            params: { mode: "through", taut: 1, pinch: 0, rings: 0, through: 0 },
        },
    ],
    box: () => ({ w: 20, h: 8 }),
    draw: (c, p) =>
        p.mode === "through"
            ? through(
                  c,
                  MEDIA[Math.max(0, Math.min(2, Math.round(p.through)))] ?? "air",
                  p.rings > 0,
              )
            : phone(c, p.taut > 0, p.pinch > 0, p.rings > 0),
    describe: (p) =>
        p.mode === "through"
            ? // which of the three is drawn, since a question asks what the sound went through and a
              // child on a screen reader has only these words to answer it from
              `A fist knocking at one end and a child's ear pressed to the other, with ${BETWEEN[MEDIA[Math.max(0, Math.min(2, Math.round(p.through)))] ?? "air"]} between them.`
            : `Two children each holding a paper cup to their face, a string ${p.taut > 0 ? "pulled tight" : "hanging slack"} between the cups${p.pinch > 0 ? ", pinched halfway by a hand" : ""}.`,
});
