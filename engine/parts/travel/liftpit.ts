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

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

const wood = <G>(c: Ctx<G>) => c.pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.8 });

const steel = <G>(c: Ctx<G>) =>
    c.pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.7 });

/**
 * The pit's box and where its parts stand, in squares: the box's width with a square of earth either
 * side of the walls, the walls' thickness, each slot's height, the head room between the mouth and
 * the top slot's rail, the earth under the floor, and the platform's width.
 */
export const LIFTPIT = {
    w: 11,
    earth: 1,
    wall: 0.4,
    slot: 3.6,
    head: 1.2,
    floor: 0.4,
    under: 1.5,
    platform: 8,
    gantry: { w: 12, h: 8, wheel: 1.45, cable: 3.6 },
} as const;

/** The rail a carriage in slot `k`, nought at the bottom, stands on, below the mouth. */
export const pitRail = (slots: number, k: number): number =>
    LIFTPIT.head + (slots - k) * LIFTPIT.slot;

/** The pit's floor below the mouth, and the box's height, for a count of slots. */
export const pitFloor = (slots: number): number => pitRail(slots, 0) + LIFTPIT.floor;

export const pitHeight = (slots: number): number => Math.ceil(pitFloor(slots) + LIFTPIT.under);

interface LiftPitParams {
    part: "pit" | "platform" | "gantry";
    slots: number;
}

export const liftpit = defineDrawing<LiftPitParams>({
    id: "liftpit",
    family: "travel",
    title: "Lift and pit",
    group: "Structures",
    about: "A pit under a railway, drawn as a cutaway so what is stacked in it can be seen: the earth cut open, brick walls and a brick floor, a ladder down one side, and a faint line for each carriage the pit holds. Its other parts are the platform the cables hang, a plank with a piece of rail on it and a ring at each end, and the gantry that stands over the pit with a wheel at each end of its beam, so a game can lower the platform between the walls with a carriage on it.",
    params: { part: "pit", slots: 2 },
    settings: {
        part: { kind: "one of", of: ["pit", "platform", "gantry"] },
        slots: { kind: "whole", min: 1, max: 4 },
    },
    takes: [
        { label: "A pit with two slots", params: { part: "pit", slots: 2 } },
        { label: "Three slots", params: { part: "pit", slots: 3 } },
        { label: "The platform", params: { part: "platform", slots: 2 } },
        { label: "The gantry and its wheels", params: { part: "gantry", slots: 2 } },
    ],
    box: (p) => {
        if (p.part === "platform") return { w: LIFTPIT.platform, h: 1 };
        if (p.part === "gantry") return { w: LIFTPIT.gantry.w, h: LIFTPIT.gantry.h };
        return { w: LIFTPIT.w, h: pitHeight(whole(p.slots, 1, 4, 2)) };
    },
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        if (p.part === "platform") {
            const w = LIFTPIT.platform * U;
            pen.rect(g, 0.25 * U, 0.38 * U, w - 0.5 * U, 0.42 * U, "ruler", wood(c), calm(c, 1.6));
            pen.line(g, 0.45 * U, 0.3 * U, w - 0.45 * U, 0.3 * U, "ruler", {
                strokeWidth: 2.8,
                disableMultiStroke: true,
            });
            for (const x of [0.4 * U, w - 0.4 * U])
                pen.circle(g, x, 0.55 * U, 0.34 * U, "ruler", pen.fill("card"), calm(c, 1.4));
            return {
                rail: [w / 2, 0.3 * U, "up"],
                left: [0.4 * U, 0.55 * U, "up"],
                right: [w - 0.4 * U, 0.55 * U, "up"],
            };
        }
        if (p.part === "gantry") {
            const w = LIFTPIT.gantry.w * U,
                h = LIFTPIT.gantry.h * U,
                beam = 0.45 * U,
                post = 0.36 * U;
            for (const x of [0.9 * U, w - 0.9 * U - post])
                pen.rect(
                    g,
                    x,
                    beam + 0.3 * U,
                    post,
                    h - beam - 0.3 * U,
                    "ruler",
                    steel(c),
                    calm(c, 1.5),
                );
            for (const x of [0.9 * U + post, w - 0.9 * U - post]) {
                const dir = x < w / 2 ? 1 : -1;
                pen.line(g, x, beam + 1.8 * U, x + dir * 1.1 * U, beam + 0.4 * U, "ruler", {
                    strokeWidth: 1.6,
                    disableMultiStroke: true,
                });
            }
            pen.rect(g, 0.5 * U, beam - 0.25 * U, w - U, 0.5 * U, "ruler", steel(c), calm(c, 1.7));
            for (const x of [w / 2 - LIFTPIT.gantry.cable * U, w / 2 + LIFTPIT.gantry.cable * U]) {
                const cy = LIFTPIT.gantry.wheel * U;
                pen.rect(
                    g,
                    x - 0.12 * U,
                    beam + 0.25 * U,
                    0.24 * U,
                    cy - beam - 0.25 * U,
                    "ruler",
                    steel(c),
                    calm(c, 1.1),
                );
                pen.circle(g, x, cy, 1.05 * U, "ruler", pen.fill("card"), calm(c, 1.8));
                pen.circle(g, x, cy, 0.22 * U, "ruler", pen.fill("ink-soft"), calm(c, 1));
            }
            return {
                "wheel(1)": [w / 2 - LIFTPIT.gantry.cable * U, LIFTPIT.gantry.wheel * U, "down"],
                "wheel(2)": [w / 2 + LIFTPIT.gantry.cable * U, LIFTPIT.gantry.wheel * U, "down"],
                feet: [w / 2, h, "down"],
                beam: [w / 2, beam, "up"],
            };
        }
        const slots = whole(p.slots, 1, 4, 2),
            w = LIFTPIT.w * U,
            h = pitHeight(slots) * U,
            earth = LIFTPIT.earth * U,
            wall = LIFTPIT.wall * U,
            floor = pitFloor(slots) * U;
        const inL = earth + wall,
            inR = w - earth - wall;
        // the earth cut open, ragged along the cut, then the pit's brick walls and floor and the back wall a child looks at
        pen.path(
            g,
            `M0 0L${w} 0L${w - 4} ${h * 0.3}L${w} ${h * 0.7}L${w - 3} ${h}L${3} ${h}L0 ${h * 0.65}L${4} ${h * 0.3}Z`,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 9, hachureAngle: 35, fillWeight: 0.5 }),
            { stroke: "none" },
        );
        for (const [x, y] of [
            [0.4, 0.25],
            [0.55, 0.62],
            [0.3, 0.88],
            [10.3, 0.2],
            [10.55, 0.5],
            [10.35, 0.8],
        ] as const) {
            pen.ellipse(
                g,
                x * U,
                y * h,
                0.28 * U,
                0.2 * U,
                "pencil",
                pen.fill("ink-soft"),
                calm(c, 1),
            );
        }
        pen.rect(g, inL, 0, inR - inL, floor, "pencil", pen.fill("card"), { stroke: "none" });
        const brick = pen.fill("tang", "cross-hatch", { hachureGap: 7, fillWeight: 0.6 });
        pen.rect(g, earth, 0, wall, floor + LIFTPIT.floor * U, "ruler", brick, calm(c, 1.6));
        pen.rect(
            g,
            w - earth - wall,
            0,
            wall,
            floor + LIFTPIT.floor * U,
            "ruler",
            brick,
            calm(c, 1.6),
        );
        pen.rect(g, earth, floor, w - 2 * earth, LIFTPIT.floor * U, "ruler", brick, calm(c, 1.6));
        for (let y = 0.5 * U; y < floor; y += 0.5 * U) {
            for (const x of [earth, w - earth - wall])
                pen.line(g, x + 2, y, x + wall - 2, y, "ruler", {
                    strokeWidth: 0.9,
                    stroke: c.t["ink-soft"],
                    disableMultiStroke: true,
                });
        }
        // a faint shelf line for each slot, so the stack reads as slots even when empty
        for (let k = 1; k < slots; k++) {
            const y = (pitRail(slots, k) + LIFTPIT.floor) * U;
            pen.line(g, inL + 0.4 * U, y, inR - 0.4 * U, y, "ruler", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
                strokeLineDash: [5, 6],
                disableMultiStroke: true,
            });
        }
        const lx = inL + 0.6 * U;
        for (const x of [lx - 0.24 * U, lx + 0.24 * U])
            pen.line(g, x, 0.15 * U, x, floor - 0.1 * U, "ruler", {
                strokeWidth: 1.5,
                disableMultiStroke: true,
            });
        for (let y = 0.6 * U; y < floor - 0.2 * U; y += 0.6 * U)
            pen.line(g, lx - 0.24 * U, y, lx + 0.24 * U, y, "ruler", {
                strokeWidth: 1.2,
                disableMultiStroke: true,
            });
        return {
            mouth: [w / 2, 0, "up"],
            floor: [w / 2, floor, "up"],
            left: [0, 0, "left"],
            right: [w, 0, "right"],
        };
    },
    describe: (p) =>
        p.part === "platform"
            ? "A lift platform seen from the side, a wooden plank with a piece of rail along its top and a ring at each end for the cables."
            : p.part === "gantry"
              ? "A steel gantry seen from the side, two braced posts holding a beam with a wheel hanging under each end of it for the cables to run over."
              : "A pit under a railway drawn as a cutaway, brown earth cut open round brick walls and a brick floor, with a ladder down one side.",
    motion: {
        still: "A game lowers its platform on its cable; the pit and the gantry are built things and hold still.",
    },
});
