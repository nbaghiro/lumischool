import { type Ctx, type RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";
import { HAIR_COLOURS, MARKERS, U } from "../../paper";
import { HAIRS, placePerson } from "../people/figure";
import { person } from "../people/person";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const unit = (v: unknown) => Math.max(0, Math.min(1, Number(v) || 0));

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

/**
 * The boat's box and where its parts are, in squares from its top left: the waterline, the bow's tip,
 * the rowlock the oars turn about, how far the blade reaches from it, and where the rower sits; a game
 * floats it by the waterline and reads the bow off the box.
 */
export const ROWBOAT = {
    w: 8,
    h: 5,
    waterline: 3.6,
    bow: 7.75,
    stern: 0.45,
    lock: { x: 3.9, y: 2.35 },
    reach: 1.7,
    rower: 3.3,
} as const;

export const rowBoat = defineDrawing({
    id: "rowboat",
    family: "travel",
    title: "Rowing boat",
    group: "Props",
    about: "A small rowing boat seen from the side, clinker built with a pointed bow and a flat stern, a ring at the bow to tie up by, and a child sitting at the oars facing the stern. The oars turn about their rowlocks by a setting: back for the catch, forward at the end of the drive, and lifted clear of the water between strokes. The child can let go of the oars and put both arms up. It faces left or right.",
    params: {
        stroke: 0.5,
        lifted: 0,
        facing: 1,
        tone: 4,
        hair: "curly",
        colour: "black",
        top: "berry",
        cheer: 0,
    },
    settings: {
        stroke: { kind: "number", min: 0, max: 1, step: 0.1 },
        lifted: { kind: "number", min: 0, max: 1, step: 0.1 },
        facing: { kind: "one of", of: [-1, 1] },
        tone: { kind: "whole", min: 1, max: 6 },
        hair: { kind: "one of", of: HAIRS },
        colour: { kind: "one of", of: HAIR_COLOURS },
        top: { kind: "one of", of: MARKERS },
        cheer: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "The catch",
            params: {
                stroke: 0,
                lifted: 0,
                facing: 1,
                tone: 4,
                hair: "curly",
                colour: "black",
                top: "berry",
                cheer: 0,
            },
        },
        {
            label: "The end of the drive",
            params: {
                stroke: 1,
                lifted: 0,
                facing: 1,
                tone: 4,
                hair: "curly",
                colour: "black",
                top: "berry",
                cheer: 0,
            },
        },
        {
            label: "Oars lifted, going left",
            params: {
                stroke: 0.5,
                lifted: 1,
                facing: -1,
                tone: 2,
                hair: "braids",
                colour: "brown",
                top: "mint",
                cheer: 0,
            },
        },
        {
            label: "Tied up, arms up",
            params: {
                stroke: 0.5,
                lifted: 1,
                facing: 1,
                tone: 4,
                hair: "curly",
                colour: "black",
                top: "berry",
                cheer: 1,
            },
        },
    ],
    box: () => ({ w: ROWBOAT.w, h: ROWBOAT.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = ROWBOAT.w * U,
            right = Number(p.facing) >= 0,
            X = (sq: number) => (right ? sq * U : w - sq * U),
            wl = ROWBOAT.waterline * U;
        const k = unit(p.stroke),
            lift = unit(p.lifted),
            gun = wl - 1.15 * U;
        const lock = { x: X(ROWBOAT.lock.x), y: ROWBOAT.lock.y * U };
        // the oars' blades: back towards the bow for the catch, towards the stern at the finish, and lifted clear between strokes
        const swing = (0.5 - k) * ROWBOAT.reach * U * (right ? 1 : -1);
        const blade = { x: lock.x + swing, y: lift > 0.5 ? wl - 0.25 * U : wl + 0.65 * U };
        const far = { x: lock.x + (right ? 0.3 : -0.3) * U, y: gun - 0.25 * U };
        // the far gunwale, the far oar's shaft to its rowlock, and the rower, all behind the near side of the hull
        pen.path(
            g,
            `M${X(0.55)} ${gun - 0.22 * U}Q${X(4)} ${gun - 0.45 * U} ${X(ROWBOAT.bow - 0.3)} ${gun - 0.4 * U}`,
            "ruler",
            null,
            { strokeWidth: 1.4, disableMultiStroke: true },
        );
        const rower = { x: X(ROWBOAT.rower - (0.5 - k) * 0.5), base: wl + 0.55 * U };
        pen.line(g, rower.x, gun - 0.9 * U, far.x, far.y, "ruler", {
            strokeWidth: 2.4,
            disableMultiStroke: true,
        });
        pen.path(
            g,
            `M${far.x - 4} ${far.y + 3}L${far.x - 4} ${far.y - 4}M${far.x + 4} ${far.y + 3}L${far.x + 4} ${far.y - 4}`,
            "ruler",
            null,
            { strokeWidth: 1.6, disableMultiStroke: true },
        );
        const cheer = Number(p.cheer) > 0;
        const at = placePerson(
            c,
            {
                ...person.params,
                pose: cheer ? "cheer" : "hold",
                age: "child",
                dir: right ? -1 : 1,
                tone: whole(p.tone, 1, 6, 4),
                hair: String(p.hair || "curly"),
                colour: String(p.colour || "black"),
                top: String(p.top || "berry"),
                wear: "trousers",
            },
            rower.x,
            rower.base,
            { size: 0.6, seed: 3 },
        );
        const hands = cheer
            ? ([rower.x, gun - 0.6 * U, "up"] as const)
            : (at.hands ?? ([rower.x, gun - 0.9 * U, "up"] as const));
        // the near oar's handle from the hands to the rowlock, behind the hull's side
        pen.line(g, hands[0], hands[1] + 4, lock.x, lock.y, "ruler", {
            strokeWidth: 2.4,
            disableMultiStroke: true,
        });
        // the hull: a rubbing strake along the gunwale, two planks of clinker, and the ring at the bow
        const hull = `M${X(ROWBOAT.stern)} ${gun}L${X(0.7)} ${wl + 0.45 * U}Q${X(3.6)} ${wl + 1.05 * U} ${X(6.3)} ${wl + 0.5 * U}L${X(ROWBOAT.bow)} ${gun - 0.25 * U}Q${X(5.5)} ${gun + 0.05 * U} ${X(3.2)} ${gun + 0.1 * U}Q${X(1.6)} ${gun + 0.12 * U} ${X(ROWBOAT.stern)} ${gun}Z`;
        pen.path(
            g,
            hull,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 5, hachureAngle: -8, fillWeight: 0.8 }),
            calm(c, 2.2),
        );
        for (const dy of [0.42, 0.85]) {
            pen.path(
                g,
                `M${X(0.62)} ${gun + dy * U}Q${X(3.6)} ${gun + (dy + 0.62) * U} ${X(6.9)} ${gun + (dy + 0.02) * U}`,
                "ruler",
                null,
                { strokeWidth: 1.2, stroke: c.t["ink-soft"], disableMultiStroke: true },
            );
        }
        pen.path(
            g,
            `M${X(ROWBOAT.stern)} ${gun}Q${X(3.2)} ${gun + 0.1 * U} ${X(ROWBOAT.bow)} ${gun - 0.25 * U}`,
            "ruler",
            null,
            { strokeWidth: 3, disableMultiStroke: true },
        );
        pen.circle(g, X(ROWBOAT.bow - 0.35), gun + 0.28 * U, 0.34 * U, "ruler", null, {
            strokeWidth: 1.8,
            disableMultiStroke: true,
        });
        // the near rowlock, and the oar out through it into the water, its blade turned along the shaft
        pen.path(
            g,
            `M${lock.x - 5} ${lock.y + 4}L${lock.x - 5} ${lock.y - 4}M${lock.x + 5} ${lock.y + 4}L${lock.x + 5} ${lock.y - 4}`,
            "ruler",
            null,
            { strokeWidth: 1.8, disableMultiStroke: true },
        );
        pen.line(g, lock.x, lock.y, blade.x, blade.y, "ruler", {
            strokeWidth: 2.6,
            disableMultiStroke: true,
        });
        const a = Math.atan2(blade.y - lock.y, blade.x - lock.x),
            bl = (lift > 0.5 ? 0.85 : 1.1) * U,
            bw = 0.42 * U;
        const bx = blade.x + Math.cos(a) * bl * 0.5,
            by = blade.y + Math.sin(a) * bl * 0.5;
        const nx = -Math.sin(a) * bw * 0.5,
            ny = Math.cos(a) * bw * 0.5,
            ex = Math.cos(a) * bl * 0.5,
            ey = Math.sin(a) * bl * 0.5;
        pen.path(
            g,
            `M${bx - ex + nx} ${by - ey + ny}Q${bx + nx * 1.6} ${by + ny * 1.6} ${bx + ex + nx * 0.6} ${by + ey + ny * 0.6}L${bx + ex - nx * 0.6} ${by + ey - ny * 0.6}Q${bx - nx * 1.6} ${by - ny * 1.6} ${bx - ex - nx} ${by - ey - ny}Z`,
            "ruler",
            pen.fill("tang"),
            calm(c, 1.5),
        );
        return {
            waterline: [w / 2, wl, "down"],
            bow: [X(ROWBOAT.bow), gun - 0.25 * U, right ? "right" : "left"],
            stern: [X(ROWBOAT.stern), gun, right ? "left" : "right"],
            rower: [at.head?.[0] ?? rower.x, at.head?.[1] ?? gun - 2.2 * U, "up"],
            blade: [blade.x, blade.y, "down"],
            ring: [X(ROWBOAT.bow - 0.35), gun + 0.28 * U, right ? "right" : "left"],
        };
    },
    describe: (p) =>
        `A small brown rowing boat seen from the side facing ${Number(p.facing) >= 0 ? "right" : "left"}, a child sitting at the oars${Number(p.cheer) > 0 ? " with both arms up" : ""}, the oars ${unit(p.lifted) > 0.5 ? "lifted clear of the water" : "dipped in the water"}.`,
    motion: {
        still: "A game rows it: the oar turns by its setting and the boat is moved along the water, so on the shelf it holds still.",
    },
});
