import type { Ctx, RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.5 * c.pen.o.roughness,
    bowing: 0.6 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const AQUARIUM_PARTS = [
    "tank",
    "stand",
    "gravel",
    "grass",
    "sword",
    "fern",
    "lily",
    "arch",
    "chest",
    "diver",
    "snail",
    "heater",
    "dial",
    "filter",
    "net",
    "tub",
    "flake",
    "meter",
    "bag",
    "jug",
    "tag",
    "pondedge",
    "cover",
] as const;
type AquariumPart = (typeof AQUARIUM_PARTS)[number];

/** How a tank's side is marked: in litres, in a fraction of the whole, or not at all. */
const TANK_SCALES = ["litres", "fraction", "none"] as const;
export type TankScale = (typeof TANK_SCALES)[number];

interface AquariumParams {
    part: AquariumPart;
    /** Squares across and down, for the tank, the stand, the gravel and the pond's edge. */
    w: number;
    h: number;
    /** A tank's marks: how many steps up its side, what they read, and the litres it holds when full. */
    marks: number;
    scale: TankScale;
    most: number;
    /** A chest open, a filter running, the snail out of its shell. */
    on: boolean;
    /** A heater's or a dial's degrees, and the meter's oxygen; the meter's cleanness. From nought to one on the meter. */
    value: number;
    level: number;
    tone: Marker;
}

/** A tank's glass, in squares from its box's edges: the frame's sides, its rim and its base. */
export const TANK_EDGE = { side: 0.2, top: 0.35, base: 0.5 };

/** Each part's box in squares; the tank, the stand, the gravel and the pond's edge are as big as asked. */
function aquariumBox(p: AquariumParams): { w: number; h: number } {
    const w = Math.max(2, Math.min(36, Math.round(p.w))),
        h = Math.max(1, Math.min(24, Math.round(p.h)));
    switch (p.part) {
        case "tank":
            return { w, h: Math.max(3, h) };
        case "stand":
            return { w, h: 3 };
        case "gravel":
            return { w, h: 1 };
        case "pondedge":
            return { w, h: 2 };
        case "grass":
            return { w: 2, h: 5 };
        case "sword":
            return { w: 3, h: 4 };
        case "fern":
            return { w: 2, h: 3 };
        case "lily":
            return { w: 3, h: 1 };
        case "arch":
            return { w: 4, h: 3 };
        case "chest":
            return { w: 3, h: 2 };
        case "diver":
            return { w: 2, h: 3 };
        case "snail":
        case "flake":
            return { w: 1, h: 1 };
        case "heater":
            return { w: 1, h: 5 };
        case "dial":
            return { w: 3, h: 3 };
        case "filter":
            return { w: 2, h: 3 };
        case "net":
            return { w: 2, h: 6 };
        case "tub":
            return { w: 2, h: 2 };
        case "meter":
            return { w: 6, h: 3 };
        case "bag":
            return { w: 3, h: 4 };
        case "jug":
            return { w: 3, h: 3 };
        case "tag":
            return { w: 2, h: 1 };
        case "cover":
            return { w: 8, h: 6 };
    }
}

/** What a mark on a tank's side reads: litres, or the fraction of the whole in its lowest terms. */
export function markWords(k: number, marks: number, scale: TankScale, most: number): string {
    if (scale === "litres") return String(Math.round(((most * k) / marks) * 10) / 10);
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const d = gcd(k, marks);
    return k === marks ? "full" : `${k / d}/${marks / d}`;
}

function tank<G>(c: Ctx<G>, p: AquariumParams, w: number, h: number): RawAnchors {
    const { pen, g } = c,
        W = w * U,
        H = h * U,
        side = TANK_EDGE.side * U,
        top = TANK_EDGE.top * U,
        base = H - TANK_EDGE.base * U;
    // the glass: pale, with two glints, and its frame along the rim and the base
    pen.rect(g, side, top, W - 2 * side, base - top, "ruler", pen.fill("paper"), calm(c, 1));
    pen.line(g, W - side - 8, top + 10, W - side - 26, top + 34, "ruler", {
        strokeWidth: 2,
        stroke: c.t.card,
        disableMultiStroke: true,
    });
    pen.line(g, W - side - 8, top + 22, W - side - 16, top + 34, "ruler", {
        strokeWidth: 2,
        stroke: c.t.card,
        disableMultiStroke: true,
    });
    pen.rect(g, 0, 0, W, top, "ruler", pen.fill("ink", "solid"), calm(c, 1.2));
    pen.rect(g, 0, base, W, H - base, "ruler", pen.fill("ink", "solid"), calm(c, 1.2));
    for (const x of [0, W - side])
        pen.rect(g, x, top, side, base - top, "ruler", pen.fill("ink-soft", "solid"), calm(c, 1));
    const marks = Math.max(0, Math.min(20, Math.round(p.marks)));
    const scale = TANK_SCALES.find((s) => s === p.scale) ?? "none";
    if (scale !== "none" && marks > 0) {
        const step = (base - top) / marks,
            every = step >= 0.75 * U ? 1 : 2;
        // the top mark sits under the rim, so the highest written mark below it carries the unit
        const top1 = Math.floor((marks - 1) / every) * every;
        for (let k = 1; k <= marks; k++) {
            const y = base - k * step;
            const long = k % every === 0 && k < marks;
            pen.line(g, side, y, side + (long ? 14 : 8), y, "ruler", {
                strokeWidth: 1.4,
                disableMultiStroke: true,
            });
            if (!long) continue;
            const words = markWords(k, marks, scale, p.most);
            say(
                c,
                side + 17,
                y + 4.5,
                scale === "litres" && k === top1 ? `${words} L` : words,
                11,
                "start",
            );
        }
    }
    return {
        rim: [W / 2, top, "up"],
        bottom: [W / 2, base, "down"],
    };
}

function plant<G>(c: Ctx<G>, kind: "grass" | "sword" | "fern", w: number, h: number): void {
    const { pen, g } = c,
        W = w * U,
        H = h * U;
    if (kind === "grass") {
        for (const [x, top, lean] of [
            [8, 4, -6],
            [16, 10, 5],
            [22, 2, 8],
            [30, 14, -4],
            [12, 18, 10],
        ] as const)
            pen.path(
                g,
                `M${x} ${H}Q${x + lean} ${(H + top) / 2} ${x + lean * 0.4} ${top}Q${x + lean + 3} ${(H + top) / 2} ${x + 4} ${H}Z`,
                "pencil",
                pen.fill("mint"),
                calm(c, 1),
            );
        return;
    }
    if (kind === "sword") {
        for (const [a, len] of [
            [-0.9, 2.6],
            [-0.4, 3.3],
            [0, 3.6],
            [0.45, 3.1],
            [0.95, 2.4],
        ] as const) {
            const tx = W / 2 + Math.sin(a) * len * U * 0.75,
                ty = H - Math.cos(a) * len * U * 0.95;
            const mx = W / 2 + Math.sin(a) * len * U * 0.4,
                my = H - Math.cos(a) * len * U * 0.5;
            pen.path(
                g,
                `M${W / 2} ${H}Q${mx - 8} ${my} ${tx} ${ty}Q${mx + 8} ${my} ${W / 2} ${H}Z`,
                "pencil",
                pen.fill("mint", "hachure", { hachureGap: 3 }),
                calm(c, 1),
            );
            pen.line(g, W / 2, H, tx, ty, "ruler", { strokeWidth: 0.6, disableMultiStroke: true });
        }
        return;
    }
    for (const [x, y, r] of [
        [W * 0.35, H * 0.35, 7],
        [W * 0.65, H * 0.45, 8],
        [W * 0.4, H * 0.7, 9],
        [W * 0.6, H * 0.22, 6],
    ] as const) {
        pen.ellipse(g, x, y, r * 1.2, r * 2.6, "pencil", pen.fill("mint", "solid"), calm(c, 1));
        pen.line(g, W / 2, H, x, y, "ruler", { strokeWidth: 0.9, disableMultiStroke: true });
    }
}

function fishShape<G>(c: Ctx<G>, x: number, y: number, s: number, tone: Marker): void {
    const { pen, g } = c;
    pen.path(
        g,
        `M${x + s} ${y}Q${x} ${y - s * 0.6} ${x - s * 0.6} ${y}Q${x} ${y + s * 0.6} ${x + s} ${y}Z`,
        "ruler",
        pen.fill(tone),
        calm(c, 1),
    );
    pen.path(
        g,
        `M${x - s * 0.5} ${y}L${x - s * 1.1} ${y - s * 0.45}L${x - s * 1.1} ${y + s * 0.45}Z`,
        "ruler",
        pen.fill(tone),
        calm(c, 1),
    );
    pen.circle(g, x + s * 0.5, y - s * 0.1, s * 0.22, "ruler", pen.fill("ink"), {
        strokeWidth: 0.4,
    });
}

function net<G>(c: Ctx<G>, cx: number, top: number, ring: number): void {
    const { pen, g } = c;
    pen.line(g, cx, top, cx, top + 3.6 * U, "ruler", { strokeWidth: 2.4, roughness: 0.2 });
    pen.ellipse(g, cx, top + 4.1 * U, ring, 0.55 * U, "ruler", null, calm(c, 1.8));
    pen.path(
        g,
        `M${cx - ring / 2} ${top + 4.1 * U}Q${cx - ring * 0.3} ${top + 5.7 * U} ${cx} ${top + 5.8 * U}Q${cx + ring * 0.3} ${top + 5.7 * U} ${cx + ring / 2} ${top + 4.1 * U}`,
        "ruler",
        pen.fill("card", "cross-hatch", { hachureGap: 4 }),
        calm(c, 1),
    );
}

export const aquarium = defineDrawing<AquariumParams>({
    id: "aquarium",
    family: "home",
    title: "Aquarium",
    group: "Props",
    about: "Everything for keeping fish: a glass tank marked up its side in litres or in fractions of the whole, a wooden stand, gravel, three kinds of water plant, a lily pad, a rock arch, a treasure chest, a diver, a pond snail, a heater with its dial, a filter, a hand net, a tub of flakes and a single flake, a meter for oxygen and cleanness, a pet-shop bag, a jug, a colour tag, the stone edge of a garden pond, and the cover.",
    params: {
        part: "tank",
        w: 10,
        h: 7,
        marks: 10,
        scale: "litres",
        most: 10,
        on: false,
        value: 24,
        level: 0.5,
        tone: "sky",
    },
    settings: {
        part: { kind: "one of", of: AQUARIUM_PARTS },
        w: { kind: "whole", min: 2, max: 36 },
        h: { kind: "whole", min: 1, max: 24 },
        marks: { kind: "whole", min: 0, max: 20 },
        scale: { kind: "one of", of: TANK_SCALES },
        most: { kind: "whole", min: 1, max: 100 },
        on: { kind: "flag" },
        value: { kind: "number", min: 0, max: 40, step: 0.05 },
        level: { kind: "number", min: 0, max: 1, step: 0.05 },
        tone: { kind: "one of", of: MARKERS },
    },
    takes: [
        {
            label: "A tank marked in litres",
            params: {
                part: "tank",
                w: 10,
                h: 7,
                marks: 10,
                scale: "litres",
                most: 10,
                on: false,
                value: 24,
                level: 0.5,
                tone: "sky",
            },
        },
        {
            label: "A tank marked in quarters",
            params: {
                part: "tank",
                w: 8,
                h: 6,
                marks: 4,
                scale: "fraction",
                most: 8,
                on: false,
                value: 24,
                level: 0.5,
                tone: "sky",
            },
        },
        ...(
            [
                ["A wooden stand", "stand", 12],
                ["Gravel", "gravel", 10],
                ["Tall grass", "grass", 2],
                ["A sword plant", "sword", 3],
                ["A fern", "fern", 2],
                ["A lily pad", "lily", 3],
                ["A rock arch", "arch", 4],
                ["A treasure chest", "chest", 3],
                ["A diver", "diver", 2],
                ["A snail", "snail", 1],
                ["A heater", "heater", 1],
                ["A filter", "filter", 2],
                ["A hand net", "net", 2],
                ["A tub of flakes", "tub", 2],
                ["A flake", "flake", 1],
                ["A pet-shop bag", "bag", 3],
                ["A jug", "jug", 3],
                ["A pond's stone edge", "pondedge", 12],
                ["The cover", "cover", 8],
            ] as const
        ).map(([label, part, w]) => ({
            label,
            params: {
                part,
                w,
                h: 2,
                marks: 0,
                scale: "none" as const,
                most: 10,
                on: false,
                value: 24,
                level: 0.5,
                tone: "sky" as const,
            },
        })),
        {
            label: "A chest bubbling open",
            params: {
                part: "chest",
                w: 3,
                h: 2,
                marks: 0,
                scale: "none",
                most: 10,
                on: true,
                value: 24,
                level: 0.5,
                tone: "sky",
            },
        },
        {
            label: "A filter running",
            params: {
                part: "filter",
                w: 2,
                h: 3,
                marks: 0,
                scale: "none",
                most: 10,
                on: true,
                value: 24,
                level: 0.5,
                tone: "sky",
            },
        },
        {
            label: "The heater's dial at 26 degrees",
            params: {
                part: "dial",
                w: 3,
                h: 3,
                marks: 0,
                scale: "none",
                most: 10,
                on: false,
                value: 26,
                level: 0.5,
                tone: "sky",
            },
        },
        {
            label: "The meter, healthy",
            params: {
                part: "meter",
                w: 6,
                h: 3,
                marks: 0,
                scale: "none",
                most: 10,
                on: false,
                value: 0.85,
                level: 0.8,
                tone: "sky",
            },
        },
        {
            label: "A pink tag",
            params: {
                part: "tag",
                w: 2,
                h: 1,
                marks: 0,
                scale: "none",
                most: 10,
                on: false,
                value: 24,
                level: 0.5,
                tone: "berry",
            },
        },
    ],
    box: aquariumBox,
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            box = aquariumBox(p),
            W = box.w * U,
            H = box.h * U,
            tone = MARKERS.find((m) => m === p.tone) ?? "sky";
        switch (p.part) {
            case "tank":
                return tank(c, p, box.w, box.h);
            case "stand": {
                pen.rect(g, 0, 0, W, 0.5 * U, "ruler", pen.fill("tang", "solid"), calm(c, 1.3));
                pen.rect(g, 0.4 * U, 0.5 * U, W - 0.8 * U, H - 0.6 * U, "ruler", pen.fill("tang"), {
                    ...calm(c, 1.2),
                });
                const doors = Math.max(1, Math.round(box.w / 6));
                for (let i = 0; i < doors; i++) {
                    const x0 = 0.7 * U + (i * (W - 1.4 * U)) / doors,
                        dw = (W - 1.4 * U) / doors - 0.3 * U;
                    pen.rect(g, x0, 0.8 * U, dw, H - 1.2 * U, "ruler", null, calm(c, 1));
                    pen.circle(g, x0 + dw - 0.4 * U, H / 2 + 0.2 * U, 5, "ruler", pen.fill("ink"));
                }
                return { top: [W / 2, 0, "up"] };
            }
            case "gravel": {
                pen.path(
                    g,
                    `M0 ${H}L0 ${0.45 * U}Q${W * 0.3} ${0.15 * U} ${W * 0.55} ${0.4 * U}Q${W * 0.8} ${0.6 * U} ${W} ${0.3 * U}L${W} ${H}Z`,
                    "pencil",
                    pen.fill("tang", "hachure", { hachureGap: 4 }),
                    calm(c, 1),
                );
                for (let x = 6; x < W - 4; x += 9)
                    pen.circle(
                        g,
                        x,
                        H * (0.55 + 0.25 * ((x * 7) % 3) * 0.33),
                        5 + ((x * 3) % 4),
                        "ruler",
                        pen.fill(x % 2 ? "card" : "glow", "solid"),
                        calm(c, 0.8),
                    );
                return { top: [W / 2, 0.3 * U, "up"] };
            }
            case "pondedge": {
                for (let x = 0; x <= W - 1.6 * U; x += 1.6 * U)
                    pen.ellipse(
                        g,
                        x + 0.8 * U,
                        H * 0.55,
                        1.7 * U,
                        H * 0.85,
                        "pencil",
                        pen.fill("card", "solid", { fill: c.paper ? c.t.card : c.t.grid }),
                        calm(c, 1.2),
                    );
                return { top: [W / 2, 0, "up"] };
            }
            case "grass":
            case "sword":
            case "fern":
                plant(c, p.part, box.w, box.h);
                return { root: [W / 2, H, "down"] };
            case "lily": {
                pen.ellipse(
                    g,
                    W / 2,
                    H * 0.55,
                    W * 0.92,
                    H * 0.75,
                    "pencil",
                    pen.fill("mint", "solid"),
                    {
                        ...calm(c, 1.1),
                    },
                );
                pen.path(
                    g,
                    `M${W / 2} ${H * 0.55}L${W * 0.95} ${H * 0.4}L${W * 0.95} ${H * 0.7}Z`,
                    "ruler",
                    pen.fill("paper"),
                    { strokeWidth: 0.8, disableMultiStroke: true },
                );
                pen.circle(
                    g,
                    W * 0.35,
                    H * 0.35,
                    0.55 * U,
                    "pencil",
                    pen.fill("berry"),
                    calm(c, 1),
                );
                return { top: [W / 2, 0, "up"] };
            }
            case "arch": {
                pen.path(
                    g,
                    `M0 ${H}Q${0.1 * U} ${0.4 * U} ${W / 2} ${0.2 * U}Q${W - 0.1 * U} ${0.4 * U} ${W} ${H}L${W - 1.1 * U} ${H}Q${W - 1.2 * U} ${1.4 * U} ${W / 2} ${1.3 * U}Q${1.2 * U} ${1.4 * U} ${1.1 * U} ${H}Z`,
                    "pencil",
                    pen.fill("card", "solid", { fill: c.paper ? c.t.card : c.t.grid }),
                    calm(c, 1.3),
                );
                pen.path(
                    g,
                    `M${0.6 * U} ${H - 0.4 * U}Q${0.7 * U} ${1 * U} ${1.4 * U} ${0.7 * U}`,
                    "pencil",
                    null,
                    { strokeWidth: 0.8, disableMultiStroke: true },
                );
                return { top: [W / 2, 0.2 * U, "up"], through: [W / 2, H - 0.6 * U, "down"] };
            }
            case "chest": {
                const open = p.on === true;
                pen.rect(g, 0.2 * U, 0.9 * U, W - 0.4 * U, H - 0.9 * U, "ruler", pen.fill("tang"), {
                    ...calm(c, 1.3),
                });
                if (open) {
                    pen.path(
                        g,
                        `M${0.2 * U} ${0.9 * U}L${0.6 * U} ${0.05 * U}L${W - 0.2 * U} ${0.25 * U}L${W - 0.2 * U} ${0.9 * U}Z`,
                        "ruler",
                        pen.fill("tang", "solid"),
                        calm(c, 1.2),
                    );
                    for (const x of [0.9, 1.4, 1.9])
                        pen.circle(
                            g,
                            x * U,
                            0.85 * U,
                            0.4 * U,
                            "ruler",
                            pen.fill("glow", "solid"),
                            {
                                strokeWidth: 0.6,
                            },
                        );
                } else
                    pen.path(
                        g,
                        `M${0.2 * U} ${0.9 * U}Q${W / 2} ${0.05 * U} ${W - 0.2 * U} ${0.9 * U}Z`,
                        "ruler",
                        pen.fill("tang", "solid"),
                        calm(c, 1.2),
                    );
                pen.rect(g, W / 2 - 4, 0.85 * U, 8, 9, "ruler", pen.fill("glow", "solid"), {
                    strokeWidth: 0.8,
                });
                return { lid: [W / 2, 0.5 * U, "up"] };
            }
            case "diver": {
                pen.circle(g, W / 2, 0.7 * U, 1.2 * U, "ruler", pen.fill("glow"), calm(c, 1.4));
                pen.circle(g, W / 2 + 2, 0.7 * U, 0.65 * U, "ruler", pen.fill("card"), calm(c, 1));
                pen.rect(g, W / 2 - 0.55 * U, 1.3 * U, 1.1 * U, 1.1 * U, "ruler", pen.fill("sky"), {
                    ...calm(c, 1.2),
                });
                for (const dx of [-0.3, 0.3])
                    pen.line(g, W / 2 + dx * U, 2.4 * U, W / 2 + dx * 1.3 * U, H - 2, "ruler", {
                        strokeWidth: 3,
                        disableMultiStroke: true,
                    });
                pen.line(g, W / 2 - 0.5 * U, 0.2 * U, W / 2 - 0.9 * U, -0.2 * U + 4, "ruler", {
                    strokeWidth: 1.2,
                });
                return { helmet: [W / 2, 0.1 * U, "up"] };
            }
            case "snail": {
                const out = p.on !== false;
                pen.path(
                    g,
                    `M${2} ${H - 3}Q${W / 2} ${H - 6} ${W - 2} ${H - 4}L${W - 1} ${H - 1}L2 ${H - 1}Z`,
                    "ruler",
                    pen.fill("glow"),
                    calm(c, 0.9),
                );
                pen.circle(g, W * 0.42, H * 0.45, 0.62 * U, "ruler", pen.fill("tang"), calm(c, 1));
                pen.arc(g, W * 0.42, H * 0.45, 6, 6, 0, Math.PI * 1.5, "ruler", {
                    strokeWidth: 0.8,
                });
                if (out) pen.line(g, W - 4, H - 4, W - 1, 3, "ruler", { strokeWidth: 0.8 });
                return { foot: [W / 2, H - 1, "down"] };
            }
            case "heater": {
                pen.rect(g, 0.3 * U, 0.8 * U, 0.4 * U, H - 1 * U, "ruler", pen.fill("card"), {
                    ...calm(c, 1),
                });
                pen.line(g, W / 2, 1.2 * U, W / 2, H - 0.5 * U, "ruler", {
                    strokeWidth: 2,
                    stroke: c.paper ? c.t.ink : c.t.tang,
                    disableMultiStroke: true,
                });
                pen.rect(g, 0.15 * U, 0, 0.7 * U, 0.9 * U, "ruler", pen.fill("ink", "solid"), {
                    strokeWidth: 1,
                });
                return { top: [W / 2, 0, "up"] };
            }
            case "dial": {
                const v = Math.max(0, Math.min(40, Number(p.value) || 0));
                const cx = W / 2,
                    cy = H / 2 + 4,
                    r = W * 0.4;
                pen.circle(g, cx, cy, 2 * r, "ruler", pen.fill("card"), calm(c, 1.6));
                // the scale runs from 18 degrees at the lower left to 30 at the lower right
                for (let d = 18; d <= 30; d += 2) {
                    const a = Math.PI * 0.75 + ((d - 18) / 12) * Math.PI * 1.5;
                    pen.line(
                        g,
                        cx + Math.cos(a) * r * 0.8,
                        cy + Math.sin(a) * r * 0.8,
                        cx + Math.cos(a) * r * 0.95,
                        cy + Math.sin(a) * r * 0.95,
                        "ruler",
                        { strokeWidth: 1.2, disableMultiStroke: true },
                    );
                }
                const a =
                    Math.PI * 0.75 + ((Math.max(18, Math.min(30, v)) - 18) / 12) * Math.PI * 1.5;
                pen.line(
                    g,
                    cx,
                    cy,
                    cx + Math.cos(a) * r * 0.7,
                    cy + Math.sin(a) * r * 0.7,
                    "ruler",
                    {
                        strokeWidth: 2.4,
                        stroke: c.paper ? c.t.ink : c.t.pen,
                        disableMultiStroke: true,
                    },
                );
                pen.circle(g, cx, cy, 6, "ruler", pen.fill("tang", "solid"), { strokeWidth: 0.8 });
                num(c, cx, cy + r * 0.62, `${Math.round(v)}°`, 13);
                say(c, cx - r * 0.95, 11, "−", 14, "middle");
                say(c, cx + r * 0.95, 11, "+", 14, "middle");
                return { needle: [cx, cy, "up"] };
            }
            case "filter": {
                const on = p.on === true;
                pen.rect(g, 0.1 * U, 0.2 * U, W - 0.2 * U, 1.6 * U, "ruler", pen.fill("ink-soft"), {
                    ...calm(c, 1.2),
                });
                pen.rect(g, W - 0.9 * U, 1.8 * U, 0.5 * U, H - 2 * U, "ruler", pen.fill("card"), {
                    ...calm(c, 1),
                });
                pen.circle(
                    g,
                    0.6 * U,
                    0.8 * U,
                    0.5 * U,
                    "ruler",
                    pen.fill(on ? "mint" : "card", "solid"),
                    { strokeWidth: 0.8 },
                );
                if (on)
                    for (const [x, y] of [
                        [W - 0.8 * U, H - 0.6 * U],
                        [W - 0.4 * U, H - 1.1 * U],
                    ] as const)
                        pen.circle(g, x, y, 5, "ruler", null, { strokeWidth: 0.8 });
                return { out: [W - 0.65 * U, H, "down"] };
            }
            case "net":
                net(c, W / 2, 0, 1.8 * U);
                return { mouth: [W / 2, 4.1 * U, "down"] };
            case "tub": {
                pen.path(
                    g,
                    roundedRect(0.25 * U, 0.6 * U, W - 0.5 * U, H - 0.7 * U, 5),
                    "ruler",
                    pen.fill("glow"),
                    calm(c, 1.2),
                );
                pen.rect(
                    g,
                    0.15 * U,
                    0.3 * U,
                    W - 0.3 * U,
                    0.45 * U,
                    "ruler",
                    pen.fill("berry", "solid"),
                    {
                        strokeWidth: 1,
                    },
                );
                for (const [x, y] of [
                    [0.7, 1.2],
                    [1.2, 1.5],
                    [0.9, 1.7],
                ] as const)
                    pen.rect(g, x * U, y * U, 5, 4, "ruler", pen.fill("tang", "solid"), {
                        strokeWidth: 0.5,
                    });
                return { lid: [W / 2, 0.3 * U, "up"] };
            }
            case "flake":
                pen.polygon(
                    g,
                    [
                        [4, 6],
                        [13, 4],
                        [16, 12],
                        [7, 15],
                    ],
                    "ruler",
                    pen.fill("tang", "solid"),
                    { strokeWidth: 0.8, disableMultiStroke: true },
                );
                return { middle: [10, 10, "up"] };
            case "meter": {
                const o = Math.max(0, Math.min(1, Number(p.value) || 0)),
                    k = Math.max(0, Math.min(1, Number(p.level) || 0));
                pen.path(
                    g,
                    roundedRect(2, 2, W - 4, H - 4, 8),
                    "ruler",
                    pen.fill("card"),
                    calm(c, 1.4),
                );
                for (const [i, word, v] of [
                    [0, "oxygen", o],
                    [1, "clean", k],
                ] as const) {
                    const y = 0.75 * U + i * 1.1 * U,
                        x0 = 2.6 * U,
                        bw = W - 3.1 * U;
                    say(c, 0.35 * U, y + 4, word, 11, "start");
                    pen.rect(g, x0, y - 0.3 * U, bw, 0.6 * U, "ruler", null, calm(c, 1));
                    if (v > 0.02)
                        pen.rect(
                            g,
                            x0,
                            y - 0.3 * U,
                            bw * v,
                            0.6 * U,
                            "ruler",
                            pen.fill(v >= 0.6 ? "mint" : "tang", "solid"),
                            { strokeWidth: 0.5, disableMultiStroke: true },
                        );
                    pen.line(g, x0 + bw * 0.6, y - 0.42 * U, x0 + bw * 0.6, y + 0.42 * U, "ruler", {
                        strokeWidth: 1.2,
                        disableMultiStroke: true,
                    });
                }
                return { top: [W / 2, 0, "up"] };
            }
            case "bag": {
                pen.path(
                    g,
                    `M${W / 2 - 4} ${0.5 * U}L${W / 2 + 4} ${0.5 * U}L${W / 2 + 6} ${1 * U}Q${W - 2} ${1.6 * U} ${W - 3} ${H - 0.5 * U}Q${W / 2} ${H + 2} ${3} ${H - 0.5 * U}Q${2} ${1.6 * U} ${W / 2 - 6} ${1 * U}Z`,
                    "ruler",
                    null,
                    calm(c, 1.3),
                );
                pen.circle(g, W / 2, 0.35 * U, 0.4 * U, "ruler", pen.fill("berry", "solid"), {
                    strokeWidth: 0.8,
                });
                pen.line(g, 6, 1.6 * U, W - 6, 1.6 * U, "ruler", {
                    strokeWidth: 0.8,
                    disableMultiStroke: true,
                });
                return { knot: [W / 2, 0.3 * U, "up"] };
            }
            case "jug": {
                pen.path(
                    g,
                    `M${0.5 * U} ${0.5 * U}L${W - 0.4 * U} ${0.3 * U}L${W - 0.9 * U} ${0.75 * U}L${W - 0.9 * U} ${H - 0.2 * U}L${0.6 * U} ${H - 0.2 * U}Z`,
                    "ruler",
                    pen.fill("sky"),
                    calm(c, 1.3),
                );
                pen.path(
                    g,
                    `M${0.6 * U} ${0.9 * U}Q${-0.1 * U} ${1.4 * U} ${0.6 * U} ${2.2 * U}`,
                    "ruler",
                    null,
                    calm(c, 2),
                );
                return { spout: [W - 0.4 * U, 0.3 * U, "right"] };
            }
            case "tag": {
                pen.path(
                    g,
                    roundedRect(1, 1, W - 2, H - 2, 4),
                    "ruler",
                    pen.fill("card"),
                    calm(c, 1),
                );
                pen.circle(
                    g,
                    W / 2,
                    H / 2,
                    0.6 * U,
                    "ruler",
                    pen.fill(tone, "solid"),
                    calm(c, 0.9),
                );
                return { middle: [W / 2, H / 2, "up"] };
            }
            case "cover": {
                pen.rect(
                    g,
                    0.3 * U,
                    1.2 * U,
                    W - 0.6 * U,
                    H - 1.4 * U,
                    "ruler",
                    pen.fill("sky", "hachure", {
                        hachureGap: 6,
                    }),
                    calm(c, 1.6),
                );
                pen.rect(g, 0.3 * U, H - 0.9 * U, W - 0.6 * U, 0.7 * U, "ruler", pen.fill("tang"), {
                    ...calm(c, 1),
                });
                plant(c, "grass", 2, 5);
                for (const [x, y, t] of [
                    [3.4, 3, "berry"],
                    [4.6, 2.6, "berry"],
                    [4.2, 3.6, "berry"],
                    [5.4, 3.3, "berry"],
                    [3.2, 4.4, "glow"],
                ] as const)
                    fishShape(c, x * U, y * U, 0.45 * U, t);
                net(c, 6.8 * U, 0, 1.3 * U);
                return { middle: [W / 2, H / 2, "up"] };
            }
        }
    },
    describe: (p) => {
        const tone = MARKER_WORD[MARKERS.find((m) => m === p.tone) ?? "sky"];
        switch (p.part) {
            case "tank":
                return p.scale === "fraction"
                    ? "A glass fish tank with a dark frame along its rim and base, marked up one side in fractions of the whole from the bottom to the top."
                    : p.scale === "litres"
                      ? "A glass fish tank with a dark frame along its rim and base, marked up one side in litres from the bottom to the top."
                      : "A glass fish tank with a dark frame along its rim and its base and two glints of light on the glass.";
            case "stand":
                return "A low wooden cabinet with doors and round knobs, the stand a fish tank sits on at the height of a child's eyes.";
            case "gravel":
                return "A layer of orange gravel with round pebbles of white and yellow, spread along the bottom of a fish tank.";
            case "pondedge":
                return "A row of round grey stones laid along the edge of a garden pond, which frogs sit on and fish swim under.";
            case "grass":
                return "A clump of tall thin water grass with five green blades that lean and wave as the water moves.";
            case "sword":
                return "A sword plant with broad green leaves spreading from one root like a fan, a place for small fish to hide.";
            case "fern":
                return "A small water fern with four round green leaves on thin stems, growing from a root on the gravel.";
            case "lily":
                return "A round green lily pad with a notch cut into it and a pink flower, floating on top of a pond.";
            case "arch":
                return "A grey rock arch standing on the gravel with a hole through its middle that fish can swim through.";
            case "chest":
                return p.on === true
                    ? "A small orange treasure chest with its lid lifted open, golden coins inside, letting out a burp of bubbles."
                    : "A small orange treasure chest with a rounded lid and a golden clasp, closed tight on the gravel.";
            case "diver":
                return "A little toy diver in a round yellow helmet with a window and a blue suit, standing on the gravel.";
            case "snail":
                return "A small yellow pond snail with an orange curled shell and a feeler, which crawls slowly over the glass.";
            case "heater":
                return "A long glass heater with a warm orange wire inside and a black cap, standing in the corner of a tank.";
            case "dial":
                return "A round dial marked in degrees from cool to warm, with a pointer, a minus on its left side and a plus on its right.";
            case "filter":
                return p.on === true
                    ? "A grey filter box hanging on a tank's rim with its green light on, a tube running down and bubbles coming out."
                    : "A grey filter box hanging on a tank's rim with its light off and a tube running down into the water.";
            case "net":
                return "A small hand net with a long handle, a round ring and a soft white mesh bag for lifting fish out gently.";
            case "tub":
                return "A yellow tub of fish food with a pink lid and a few orange flakes showing, ready for a pinch.";
            case "flake":
                return "A single small orange flake of fish food, the kind that drifts slowly down through the water to be eaten.";
            case "meter":
                return "A water meter with two bars, one for oxygen and one for how clean the water is, each with a line where it becomes fine.";
            case "bag":
                return "A clear pet-shop bag tied at the top with a pink knot, full of water, for carrying a fish home.";
            case "jug":
                return "A blue jug with a handle at the back and a pointed spout at the front, for pouring water into a tank.";
            case "tag":
                return `A small white card with a round ${tone} dot in its middle, hung on a tank to say which colour of fish goes there.`;
            case "cover":
                return "A bright fish tank with tall green grass and a shoal of pink fish, and a hand net dipping in from the top.";
        }
    },
    motion: {
        still: "The pieces stay still; the game waves the plants, opens the chest, bobs the diver and crawls the snail.",
    },
});
