import { group, type Ctx, type RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";

const TANK_FISH = ["neon", "goldfish", "angelfish", "guppy", "catfish"] as const;
export type TankFishKind = (typeof TANK_FISH)[number];
/** The colours a fish comes in, the markers', for a game that names a fish by its colour. */
export type FishTone = Marker;

interface TankFishParams {
    kind: TankFishKind;
    tone: Marker;
    /** A happy fish holds its fins up and its eyes wide; an unhappy one droops. */
    happy: boolean;
    facing: number;
}

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.55 * c.pen.o.roughness,
    bowing: 0.7 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const kindOf = (v: unknown): TankFishKind => TANK_FISH.find((k) => k === v) ?? "guppy";
const toneOf = (v: unknown): Marker => MARKERS.find((m) => m === v) ?? "glow";

/** Each kind's box in squares: a neon and a guppy are small, an angelfish is as tall as it is long. */
export const tankFishBox = (kind: TankFishKind): { w: number; h: number } =>
    kind === "goldfish"
        ? { w: 3, h: 2 }
        : kind === "angelfish"
          ? { w: 3, h: 3 }
          : kind === "catfish"
            ? { w: 3, h: 1 }
            : { w: 2, h: 1 };

const WORDS: Record<TankFishKind, string> = {
    neon: "a slim neon fish with a bright blue stripe along its side and a pink belly",
    goldfish: "a round goldfish with a flowing double tail",
    angelfish: "a tall angelfish with long sweeping fins and dark stripes",
    guppy: "a little guppy with a big fan of a tail",
    catfish: "a long low catfish with whiskers and a spotted back",
};

export const tankFish = defineDrawing<TankFishParams>({
    id: "tankfish",
    family: "animals",
    title: "Aquarium fish",
    group: "Characters",
    about: "The fish of an aquarium seen from the side, facing either way: a neon with its blue stripe, a round goldfish, a tall angelfish, a guppy with a fan tail and a whiskered catfish. A happy fish holds its fins up with bright eyes, and an unhappy one droops.",
    params: { kind: "guppy", tone: "berry", happy: true, facing: 1 },
    settings: {
        kind: { kind: "one of", of: TANK_FISH },
        tone: { kind: "one of", of: MARKERS },
        happy: { kind: "flag" },
        facing: { kind: "one of", of: [-1, 1] },
    },
    takes: [
        { label: "A neon", params: { kind: "neon", tone: "sky", happy: true, facing: 1 } },
        {
            label: "A goldfish facing left",
            params: { kind: "goldfish", tone: "tang", happy: true, facing: -1 },
        },
        {
            label: "An angelfish",
            params: { kind: "angelfish", tone: "glow", happy: true, facing: 1 },
        },
        { label: "A pink guppy", params: { kind: "guppy", tone: "berry", happy: true, facing: 1 } },
        { label: "A blue guppy", params: { kind: "guppy", tone: "sky", happy: true, facing: -1 } },
        {
            label: "A catfish",
            params: { kind: "catfish", tone: "tang", happy: true, facing: 1 },
        },
        {
            label: "A droopy goldfish",
            params: { kind: "goldfish", tone: "glow", happy: false, facing: 1 },
        },
    ],
    box: (p) => tankFishBox(kindOf(p.kind)),
    draw: (c, p): RawAnchors => {
        const kind = kindOf(p.kind),
            tone = toneOf(p.tone),
            box = tankFishBox(kind),
            W = box.w * U,
            H = box.h * U,
            left = Number(p.facing) < 0,
            happy = p.happy !== false;
        // a fish facing left is the same fish drawn in a mirrored group
        const g = left
                ? group(c, {
                      turn: [
                          ["translate", W, 0],
                          ["scale", -1, 1],
                      ],
                  }).g
                : c.g,
            pen = c.pen;
        const cy = H / 2,
            droop = happy ? 0 : H * 0.12;
        const body = (nose: number, root: number, b: number, fill: Marker | "card") => {
            pen.path(
                g,
                `M${nose} ${cy}C${nose - (nose - root) * 0.2} ${cy - b * 1.15} ${root + (nose - root) * 0.25} ${cy - b * 1.1} ${root} ${cy}C${root + (nose - root) * 0.25} ${cy + b * 1.1} ${nose - (nose - root) * 0.2} ${cy + b * 1.15} ${nose} ${cy}Z`,
                "ruler",
                pen.fill(fill),
                calm(c, 1.3),
            );
        };
        const tail = (root: number, end: number, spread: number, fill: Marker, fan = false) => {
            const d = fan
                ? `M${root + 2} ${cy}L${end} ${cy - spread + droop}Q${end - 3} ${cy + droop} ${end} ${cy + spread + droop}Z`
                : `M${root + 2} ${cy}L${end} ${cy - spread + droop}L${end + (root - end) * 0.25} ${cy + droop * 0.5}L${end} ${cy + spread + droop}Z`;
            pen.path(g, d, "ruler", pen.fill(fill, "hachure", { hachureGap: 3 }), calm(c, 1.1));
        };
        const eye = (x: number, y: number, r: number) => {
            pen.circle(g, x, y, r * 2, "ruler", pen.fill("card"), calm(c, 0.9));
            pen.circle(
                g,
                x + r * 0.2,
                y + (happy ? 0 : r * 0.3),
                r * 0.95,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.4 },
            );
            if (!happy)
                pen.line(g, x - r * 1.1, y - r * 0.3, x + r * 1.1, y - r * 0.5, "ruler", {
                    strokeWidth: 1,
                    disableMultiStroke: true,
                });
        };
        const mouth = (x: number) =>
            pen.path(
                g,
                happy
                    ? `M${x - 3} ${cy + 1.5}Q${x - 1.5} ${cy + 3} ${x} ${cy + 1.2}`
                    : `M${x - 3} ${cy + 2.6}Q${x - 1.5} ${cy + 1.2} ${x} ${cy + 2.6}`,
                "ruler",
                null,
                { strokeWidth: 0.9, disableMultiStroke: true },
            );
        let nose = W - 2;
        switch (kind) {
            case "neon": {
                const root = W * 0.26,
                    b = H * 0.3;
                tail(root, 2, H * 0.32, "sky");
                body(nose, root, b, "sky");
                // the pink belly towards the tail, and the stripe along the side
                pen.path(
                    g,
                    `M${root + 3} ${cy + 1}Q${W * 0.5} ${cy + b * 1.05} ${W * 0.62} ${cy + 1.5}Z`,
                    "ruler",
                    pen.fill("berry"),
                    { strokeWidth: 0.6, disableMultiStroke: true },
                );
                pen.line(g, root + 3, cy - 1, nose - 6, cy - 2, "ruler", {
                    strokeWidth: 2.2,
                    stroke: c.paper ? c.t.ink : c.t.pen,
                    disableMultiStroke: true,
                });
                eye(nose - 6, cy - 2, 2.6);
                mouth(nose);
                break;
            }
            case "goldfish": {
                const root = W * 0.3,
                    b = H * 0.36;
                tail(root, 3, H * 0.42, tone, true);
                tail(root, 7, H * 0.28, tone, true);
                pen.path(
                    g,
                    `M${W * 0.45} ${cy - b * 0.9}Q${W * 0.55} ${cy - b * 1.6 + droop} ${W * 0.7} ${cy - b * 0.95}Z`,
                    "ruler",
                    pen.fill(tone, "hachure", { hachureGap: 3 }),
                    calm(c, 1),
                );
                body(nose, root, b, tone);
                for (const k of [0.5, 0.62])
                    pen.arc(g, W * k, cy, b * 0.5, b * 1.4, -1.1, 1.1, "ruler", {
                        strokeWidth: 0.7,
                        disableMultiStroke: true,
                    });
                eye(nose - 9, cy - 3, 3.4);
                mouth(nose);
                break;
            }
            case "angelfish": {
                const root = W * 0.3,
                    b = H * 0.22;
                // the long fins above and below make it as tall as it is long
                pen.path(
                    g,
                    `M${W * 0.4} ${cy - b * 0.8}L${W * 0.3} ${4 + droop}L${W * 0.72} ${cy - b * 0.9}Z`,
                    "ruler",
                    pen.fill(tone, "hachure", { hachureGap: 3 }),
                    calm(c, 1),
                );
                pen.path(
                    g,
                    `M${W * 0.4} ${cy + b * 0.8}L${W * 0.3} ${H - 4 + droop * 0.5}L${W * 0.72} ${cy + b * 0.9}Z`,
                    "ruler",
                    pen.fill(tone, "hachure", { hachureGap: 3 }),
                    calm(c, 1),
                );
                tail(root, 4, H * 0.16, tone);
                pen.path(
                    g,
                    `M${nose} ${cy}Q${W * 0.62} ${cy - b * 1.9} ${root} ${cy}Q${W * 0.62} ${cy + b * 1.9} ${nose} ${cy}Z`,
                    "ruler",
                    pen.fill(tone),
                    calm(c, 1.3),
                );
                for (const k of [0.48, 0.64])
                    pen.line(g, W * k, cy - b * 1.2, W * k + 1, cy + b * 1.2, "ruler", {
                        strokeWidth: 2,
                        stroke: c.t.ink,
                        disableMultiStroke: true,
                    });
                eye(nose - 9, cy - 2, 3);
                mouth(nose);
                break;
            }
            case "guppy": {
                const root = W * 0.42,
                    b = H * 0.24;
                // the big fan of a tail is where a guppy's colour is
                pen.path(
                    g,
                    `M${root + 2} ${cy}L${2} ${1 + droop}Q${-1} ${cy + droop} ${2} ${H - 1 + droop}Z`,
                    "ruler",
                    pen.fill(tone),
                    calm(c, 1.1),
                );
                for (const k of [0.25, 0.5, 0.75])
                    pen.line(g, root, cy, 3, 1 + (H - 2) * k + droop, "ruler", {
                        strokeWidth: 0.6,
                        disableMultiStroke: true,
                    });
                nose = W - 3;
                body(nose, root, b, "card");
                pen.path(
                    g,
                    `M${root + 3} ${cy}Q${W * 0.62} ${cy - b * 0.8} ${W * 0.72} ${cy}Q${W * 0.62} ${cy + b * 0.8} ${root + 3} ${cy}Z`,
                    "ruler",
                    pen.fill(tone, "hachure", { hachureGap: 2.5 }),
                    { strokeWidth: 0.5, disableMultiStroke: true },
                );
                eye(nose - 5, cy - 1.5, 2.4);
                mouth(nose);
                break;
            }
            case "catfish": {
                const root = W * 0.18,
                    b = H * 0.32;
                tail(root, 2, H * 0.36, tone);
                pen.path(
                    g,
                    `M${nose} ${cy + 1}C${nose - 10} ${cy - b * 1.4} ${root + 10} ${cy - b * 1.2} ${root} ${cy}L${root + 6} ${cy + b}L${nose - 4} ${cy + b}Z`,
                    "ruler",
                    pen.fill(tone),
                    calm(c, 1.3),
                );
                for (const k of [0.35, 0.5, 0.65, 0.8])
                    pen.circle(g, W * k, cy - b * 0.5, 2, "ruler", pen.fill("ink"), {
                        strokeWidth: 0.3,
                    });
                // the whiskers it feels along the gravel with
                for (const dy of [2, 4])
                    pen.path(
                        g,
                        `M${nose - 2} ${cy + 2}Q${nose + 1} ${cy + dy + 2} ${nose - 1} ${cy + dy + 5 + droop * 0.4}`,
                        "ruler",
                        null,
                        { strokeWidth: 0.8, disableMultiStroke: true },
                    );
                eye(nose - 7, cy - 2, 2.2);
                break;
            }
        }
        const X = (x: number) => (left ? W - x : x);
        return {
            mouth: [X(nose), cy + 1, left ? "left" : "right"],
            tail: [X(2), cy, left ? "right" : "left"],
        };
    },
    describe: (p) => {
        const kind = kindOf(p.kind),
            tone = toneOf(p.tone);
        const what =
            kind === "goldfish" || kind === "guppy" || kind === "catfish"
                ? `${WORDS[kind]}, coloured ${MARKER_WORD[tone]}`
                : WORDS[kind];
        return `${what.charAt(0).toUpperCase()}${what.slice(1)}, seen from the side facing ${Number(p.facing) < 0 ? "left" : "right"}, ${p.happy === false ? "drooping with sleepy eyes" : "with its fins up and bright eyes"}.`;
    },
    motion: {
        still: "The game swims the fish itself: it turns them, darts them and wriggles them in the net.",
    },
});
