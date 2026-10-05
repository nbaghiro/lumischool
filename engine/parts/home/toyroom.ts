import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const TOYROOM_PARTS = [
    "window",
    "chest",
    "blocks",
    "teddy",
    "ledge",
    "post",
    "skirting",
    "tray",
    "chip",
    "step",
    "pail",
    "beam",
] as const;
export type ToyroomPart = (typeof TOYROOM_PARTS)[number];

interface ToyroomParams {
    part: ToyroomPart;
    /** Squares across, for the parts that stretch: a ledge, the skirting, the tray, a step, a beam. */
    w: number;
    /** Squares tall, for a post. */
    h: number;
}

/** Each part's box in squares; a ledge, the skirting, the tray, a step and a beam are as wide as `w`, a post as tall as `h`. */
export function toyroomBox(p: ToyroomParams): { w: number; h: number } {
    switch (p.part) {
        case "window":
            return { w: 6, h: 6 };
        case "chest":
            return { w: 4, h: 3 };
        case "blocks":
            return { w: 3, h: 3 };
        case "teddy":
            return { w: 2, h: 3 };
        case "ledge":
            return { w: p.w, h: 2 };
        case "post":
            return { w: 3, h: p.h };
        case "skirting":
            return { w: p.w, h: 1 };
        case "tray":
            return { w: p.w, h: 4 };
        case "chip":
            return { w: 4, h: 4 };
        case "step":
            return { w: p.w, h: 1 };
        case "pail":
            return { w: 3, h: 3 };
        case "beam":
            return { w: p.w, h: 1 };
    }
}

export const toyroom = defineDrawing<ToyroomParams>({
    id: "toyroom",
    family: "home",
    title: "Toy room",
    group: "Props",
    about: "The pieces of a child's toy room a floor game is played in: a window with curtains, a wooden toy chest, a stack of building blocks, a teddy, a wall shelf on brackets, a post a bell hangs from, the skirting board, a toy tray with dividers, the round chip a part waits on, a low wooden step on the floor, a tin pail and a beam on the wall that pulleys hang from.",
    params: { part: "window", w: 8, h: 6 },
    settings: {
        part: { kind: "one of", of: TOYROOM_PARTS },
        w: { kind: "whole", min: 2, max: 48 },
        h: { kind: "whole", min: 2, max: 20 },
    },
    takes: [
        { label: "A window with curtains", params: { part: "window", w: 8, h: 6 } },
        { label: "A toy chest", params: { part: "chest", w: 8, h: 6 } },
        { label: "A stack of blocks", params: { part: "blocks", w: 8, h: 6 } },
        { label: "A teddy", params: { part: "teddy", w: 8, h: 6 } },
        { label: "A wall shelf", params: { part: "ledge", w: 8, h: 6 } },
        { label: "A bell post", params: { part: "post", w: 8, h: 6 } },
        { label: "The skirting board", params: { part: "skirting", w: 12, h: 6 } },
        { label: "A toy tray", params: { part: "tray", w: 24, h: 6 } },
        { label: "A part's chip", params: { part: "chip", w: 8, h: 6 } },
        { label: "A step", params: { part: "step", w: 4, h: 6 } },
        { label: "A tin pail", params: { part: "pail", w: 8, h: 6 } },
        { label: "A pulley beam", params: { part: "beam", w: 10, h: 6 } },
    ],
    box: toyroomBox,
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            box = toyroomBox(p),
            w = box.w * U,
            h = box.h * U;
        const wood = pen.fill("tang", "hachure", {
            hachureGap: 5,
            hachureAngle: 90,
            fillWeight: 0.6,
        });
        switch (p.part) {
            case "window": {
                // the pane is sky with a cross of glazing bars, and a curtain hangs either side from a rail
                const m = 0.9 * U;
                pen.rect(g, m, m, w - 2 * m, h - 2 * m, "ruler", pen.fill("sky"), calm(c, 1.6));
                pen.line(g, w / 2, m, w / 2, h - m, "ruler", calm(c, 1.4));
                pen.line(g, m, h / 2, w - m, h / 2, "ruler", calm(c, 1.4));
                pen.rect(
                    g,
                    m * 0.6,
                    h - m,
                    w - m * 1.2,
                    0.35 * U,
                    "ruler",
                    pen.fill("card"),
                    calm(c, 1.2),
                );
                pen.line(g, 0.2 * U, 0.4 * U, w - 0.2 * U, 0.4 * U, "ruler", calm(c, 2));
                for (const side of [0, 1]) {
                    const x = side ? w - 1.6 * U : 0.3 * U;
                    pen.path(
                        g,
                        `M${x} ${0.5 * U}h${1.3 * U}q${-0.3 * U} ${2.6 * U} ${0.2 * U} ${h - 1.2 * U}h${-1.6 * U}q${0.4 * U} ${-2.6 * U} ${0.1 * U} ${-(h - 1.2 * U)}z`,
                        "pencil",
                        pen.fill("berry", "hachure", { hachureGap: 4, fillWeight: 0.5 }),
                        calm(c, 1.3),
                    );
                }
                return {};
            }
            case "chest": {
                // a wooden box with a domed lid and a band, toys poking over the rim
                pen.circle(
                    g,
                    1.2 * U,
                    0.9 * U,
                    0.55 * U,
                    "pencil",
                    pen.fill("berry"),
                    calm(c, 1.2),
                );
                pen.rect(
                    g,
                    2.2 * U,
                    0.5 * U,
                    0.9 * U,
                    0.9 * U,
                    "pencil",
                    pen.fill("glow"),
                    calm(c, 1.2),
                );
                pen.rect(
                    g,
                    0.2 * U,
                    1.1 * U,
                    w - 0.4 * U,
                    h - 1.2 * U,
                    "ruler",
                    wood,
                    calm(c, 1.6),
                );
                pen.line(g, 0.2 * U, 1.7 * U, w - 0.2 * U, 1.7 * U, "ruler", calm(c, 1.3));
                pen.rect(
                    g,
                    w / 2 - 0.3 * U,
                    1.5 * U,
                    0.6 * U,
                    0.5 * U,
                    "ruler",
                    pen.fill("glow"),
                    calm(c, 1),
                );
                return { foot: [w / 2, h, "down"] };
            }
            case "blocks": {
                // three lettered building blocks, two below and one on top
                const s = 1.3 * U;
                const at: [number, number, "berry" | "sky" | "mint"][] = [
                    [0.15 * U, h - s, "berry"],
                    [0.15 * U + s + 0.1 * U, h - s, "sky"],
                    [0.15 * U + s / 2, h - 2 * s, "mint"],
                ];
                for (const [x, y, tone] of at) {
                    pen.rect(g, x, y, s, s, "ruler", pen.fill(tone), calm(c, 1.4));
                    pen.rect(
                        g,
                        x + 0.3 * U,
                        y + 0.3 * U,
                        s - 0.6 * U,
                        s - 0.6 * U,
                        "ruler",
                        pen.fill("card"),
                        calm(c, 0.8),
                    );
                }
                return { foot: [w / 2, h, "down"] };
            }
            case "teddy": {
                // a sitting teddy: ears, a round head, a body and two feet
                const fur = pen.fill("tang", "hachure", { hachureGap: 4, fillWeight: 0.5 });
                pen.circle(g, w / 2 - 0.55 * U, 0.45 * U, 0.5 * U, "pencil", fur, calm(c, 1.2));
                pen.circle(g, w / 2 + 0.55 * U, 0.45 * U, 0.5 * U, "pencil", fur, calm(c, 1.2));
                pen.ellipse(g, w / 2, 2 * U, 1.7 * U, 1.6 * U, "pencil", fur, calm(c, 1.4));
                pen.circle(g, w / 2, 0.95 * U, 1.3 * U, "pencil", fur, calm(c, 1.4));
                pen.circle(
                    g,
                    w / 2 - 0.25 * U,
                    0.85 * U,
                    0.12 * U,
                    "pencil",
                    pen.fill("ink", "solid"),
                    calm(c, 0.6),
                );
                pen.circle(
                    g,
                    w / 2 + 0.25 * U,
                    0.85 * U,
                    0.12 * U,
                    "pencil",
                    pen.fill("ink", "solid"),
                    calm(c, 0.6),
                );
                pen.ellipse(
                    g,
                    w / 2 - 0.55 * U,
                    h - 0.3 * U,
                    0.7 * U,
                    0.45 * U,
                    "pencil",
                    fur,
                    calm(c, 1.1),
                );
                pen.ellipse(
                    g,
                    w / 2 + 0.55 * U,
                    h - 0.3 * U,
                    0.7 * U,
                    0.45 * U,
                    "pencil",
                    fur,
                    calm(c, 1.1),
                );
                return { foot: [w / 2, h, "down"] };
            }
            case "ledge": {
                // a plank on the wall with a bracket under each end: its top is the top of the box
                pen.rect(g, 0.05 * U, 0.05 * U, w - 0.1 * U, 0.75 * U, "ruler", wood, calm(c, 1.5));
                for (const x of [0.8 * U, w - 0.8 * U])
                    pen.path(
                        g,
                        `M${x - 0.25 * U} ${0.8 * U}v${1 * U}l${0.5 * U} ${-1 * U}z`,
                        "ruler",
                        pen.fill("ink-soft", "solid"),
                        calm(c, 1),
                    );
                return { top: [w / 2, 0, "up"] };
            }
            case "post": {
                // a wooden post on a foot, with an arm at the top reaching left that a bell hangs from
                pen.rect(
                    g,
                    0.6 * U,
                    h - 0.4 * U,
                    w - 0.2 * U - 0.6 * U,
                    0.35 * U,
                    "ruler",
                    wood,
                    calm(c, 1.3),
                );
                pen.rect(
                    g,
                    w - 0.9 * U,
                    0.3 * U,
                    0.4 * U,
                    h - 0.6 * U,
                    "ruler",
                    wood,
                    calm(c, 1.4),
                );
                pen.rect(g, 0.1 * U, 0.3 * U, w - 0.5 * U, 0.35 * U, "ruler", wood, calm(c, 1.3));
                pen.line(g, 0.6 * U, 0.65 * U, 0.6 * U, 1.1 * U, "ruler", calm(c, 1.2));
                return { hook: [0.6 * U, 1.1 * U, "down"] };
            }
            case "skirting": {
                // the board along the foot of the wall, with a groove near its top
                pen.rect(g, 0, 0.1 * U, w, 0.85 * U, "ruler", pen.fill("card"), calm(c, 1.3));
                pen.line(g, 0, 0.35 * U, w, 0.35 * U, "ruler", calm(c, 0.9));
                return {};
            }
            case "tray": {
                // a shallow wooden toy tray seen from the front, with a lip and a groove along it
                pen.rect(
                    g,
                    0.1 * U,
                    0.4 * U,
                    w - 0.2 * U,
                    h - 0.5 * U,
                    "ruler",
                    pen.fill("card"),
                    calm(c, 1.6),
                );
                pen.rect(g, 0.1 * U, h - 1.1 * U, w - 0.2 * U, 1 * U, "ruler", wood, calm(c, 1.5));
                pen.line(g, 0.1 * U, 0.4 * U, w - 0.1 * U, 0.4 * U, "ruler", calm(c, 2.2));
                return {};
            }
            case "chip": {
                // the round felt a part waits on in the tray
                pen.circle(
                    g,
                    w / 2,
                    h / 2,
                    w - 0.4 * U,
                    "pencil",
                    pen.fill("mint", "hachure", { hachureGap: 6, fillWeight: 0.5 }),
                    calm(c, 1.3),
                );
                return {};
            }
            case "step": {
                // a low wooden block standing on the floor, its top where a part stands
                pen.rect(
                    g,
                    0.05 * U,
                    0.05 * U,
                    w - 0.1 * U,
                    h - 0.1 * U,
                    "ruler",
                    wood,
                    calm(c, 1.6),
                );
                pen.line(g, 0.05 * U, 0.3 * U, w - 0.05 * U, 0.3 * U, "ruler", calm(c, 1.1));
                return { top: [w / 2, 0, "up"] };
            }
            case "pail": {
                // a tin pail narrowing to its foot, two bands round it and a wire handle over the open top
                const tin = pen.fill("sky", "hachure", { hachureGap: 5, fillWeight: 0.5 });
                pen.path(
                    g,
                    `M${0.3 * U} ${1.1 * U}h${w - 0.6 * U}l${-0.3 * U} ${h - 1.4 * U}h${-(w - 1.2 * U)}z`,
                    "ruler",
                    tin,
                    calm(c, 1.6),
                );
                for (const y of [1.7, 2.4])
                    pen.line(
                        g,
                        0.3 * U + (y - 1.1) * 0.15 * U,
                        y * U,
                        w - 0.3 * U - (y - 1.1) * 0.15 * U,
                        y * U,
                        "ruler",
                        calm(c, 1),
                    );
                pen.ellipse(
                    g,
                    w / 2,
                    1.1 * U,
                    w - 0.6 * U,
                    0.5 * U,
                    "pencil",
                    pen.fill("card"),
                    calm(c, 1.3),
                );
                pen.path(
                    g,
                    `M${0.4 * U} ${1.2 * U}Q${w / 2} ${-0.5 * U} ${w - 0.4 * U} ${1.2 * U}`,
                    "pencil",
                    null,
                    calm(c, 1.1),
                );
                return { hook: [w / 2, 0.35 * U, "up"] };
            }
            case "beam": {
                // a wooden beam held to the wall by a round plate at each end
                pen.rect(
                    g,
                    0.05 * U,
                    0.15 * U,
                    w - 0.1 * U,
                    h - 0.3 * U,
                    "ruler",
                    wood,
                    calm(c, 1.5),
                );
                for (const x of [0.5 * U, w - 0.5 * U])
                    pen.circle(
                        g,
                        x,
                        h / 2,
                        0.45 * U,
                        "pencil",
                        pen.fill("ink-soft", "solid"),
                        calm(c, 0.8),
                    );
                return {};
            }
        }
    },
    describe: (p) => {
        switch (p.part) {
            case "window":
                return "A window in a child's bedroom wall, with sky behind the glazing bars and a pink curtain hanging either side from a rail.";
            case "chest":
                return "A wooden toy chest with a band and a yellow catch, a ball and a block poking over its rim, standing on the bedroom floor.";
            case "blocks":
                return "A stack of three wooden building blocks, red and blue below and green on top, each with a white panel, on the floor.";
            case "teddy":
                return "A brown teddy bear sitting on the floor with round ears, button eyes and its two feet poking out in front.";
            case "ledge":
                return "A long wooden wall shelf on two dark brackets, which a ball or a weight can sit on in a toy machine.";
            case "post":
                return "A tall wooden post on a flat foot, with an arm at the top reaching out to the left, that a bell hangs from.";
            case "skirting":
                return "The white skirting board along the foot of a bedroom wall, with a groove near its top, where the wall meets the floor.";
            case "tray":
                return "A shallow wooden toy tray seen from the front, with a white inside and a wooden lip, where a game's parts wait.";
            case "chip":
                return "A round green felt chip in a toy tray, the place one part of a toy machine waits until it is dragged out.";
            case "step":
                return "A low wooden step standing on the bedroom floor, one square high, with a plank along its top that a bell or a toy can stand on.";
            case "pail":
                return "A blue tin pail with a white rim, two bands round it and a wire handle, that marbles drop into when it hangs from a pulley.";
            case "beam":
                return "A wooden beam held to the bedroom wall by a dark round plate at each end, which the wheels of a pulley hang from.";
        }
    },
    motion: {
        still: "The room's pieces stay where they are; the game moves the toys in front of them.",
    },
});
