import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/**
 * Where the hoop's pieces are in its box, in squares from the left and from the rim's height. A game
 * that bounces a ball off them keeps the same numbers: the rim's middle, half its width between the
 * near and far edges, and the board's face.
 */
export const BACKBOARD = {
    rim: 1.4,
    half: 1.05,
    face: 2.83,
    thick: 0.3,
    above: 4.5,
    below: 0.75,
    /** The pole's left side and its width, and how far below the board's top it starts. */
    pole: 4.0,
    poleW: 0.38,
    poleTop: 1.2,
};

const PARTS = ["whole", "back", "front", "net", "cover"] as const;
const MOUNTS = ["pole", "wall"] as const;

/** How high the rim stands, in squares above the ground, and the box that holds the board above it. */
const tallOf = (v: number) => Math.max(6, Math.min(14, Math.round(v * 2) / 2));
const heightOf = (tall: number) => Math.ceil(tallOf(tall) + BACKBOARD.above + 0.5);

/** The net's foot moved by the game's verlet points: across, down, and how far it opens, in squares. */
const give = (v: number, most: number) => Math.max(-most, Math.min(most, Number(v) || 0));

export const backboard = defineDrawing<{
    tall: number;
    part: string;
    mount: string;
    swing: number;
    stretch: number;
    open: number;
}>({
    id: "backboard",
    family: "sport",
    title: "Basketball hoop",
    group: "Props",
    about: "A backyard basketball hoop seen from the side: a white backboard with its painted square, an orange rim and a white cord net, on a pole or fixed to a wall. It can be drawn in parts so a ball passes between the rim's near and far edges, and its net can swing.",
    params: { tall: 9.5, part: "whole", mount: "pole", swing: 0, stretch: 0, open: 0 },
    settings: {
        tall: { kind: "number", min: 6, max: 14, step: 0.5 },
        part: { kind: "one of", of: PARTS },
        mount: { kind: "one of", of: MOUNTS },
        swing: { kind: "number", min: -1, max: 1, step: 0.02 },
        stretch: { kind: "number", min: -0.5, max: 1, step: 0.02 },
        open: { kind: "number", min: -0.5, max: 1, step: 0.02 },
    },
    takes: [
        {
            label: "On its pole",
            params: { tall: 9.5, part: "whole", mount: "pole", swing: 0, stretch: 0, open: 0 },
        },
        {
            label: "On the garage wall",
            params: { tall: 8, part: "whole", mount: "wall", swing: 0, stretch: 0, open: 0 },
        },
        {
            label: "A ball arcing in",
            params: { tall: 9.5, part: "cover", mount: "pole", swing: 0, stretch: 0, open: 0 },
        },
        {
            label: "Its net swishing",
            params: { tall: 9.5, part: "net", mount: "pole", swing: 0.3, stretch: 0.4, open: 0.3 },
        },
    ],
    // the cover is the hoop's top alone, so it reads at the size of a game's card
    box: (p) => ({ w: 5, h: p.part === "cover" ? 8 : heightOf(p.tall) }),
    draw: (c, p) => {
        const { pen, g } = c,
            B = BACKBOARD,
            cover = p.part === "cover",
            h = cover ? 8 : heightOf(p.tall),
            rimY = cover ? 5.4 * U : (h - tallOf(p.tall)) * U,
            rx = B.rim * U,
            half = B.half * U,
            ry = 0.26 * U;
        const part = PARTS.find((x) => x === p.part) ?? "whole",
            wall = p.mount === "wall";
        const whole = part === "whole" || part === "cover";
        const back = whole || part === "back",
            front = whole || part === "front";
        const ink = { strokeWidth: 1.5, roughness: 0.35 };
        if (back) {
            const face = B.face * U,
                top = rimY - B.above * U,
                foot = rimY + B.below * U,
                // the board's face seen a little from the side, its far edge set back and up
                deep = 1.05 * U,
                rise = 0.3 * U;
            if (!wall)
                pen.rect(
                    g,
                    B.pole * U,
                    top + B.poleTop * U,
                    B.poleW * U,
                    h * U - top - (B.poleTop + 0.2) * U,
                    "ruler",
                    pen.fill("ink-soft", "solid"),
                    ink,
                );
            const arms = wall ? [top + 1.4 * U, foot - 0.6 * U] : [top + 1.8 * U, foot - 0.5 * U];
            for (const y of arms)
                pen.line(g, face + deep * 0.6, y, wall ? 4.85 * U : 4.1 * U, y + 0.2 * U, "ruler", {
                    strokeWidth: 2.2,
                    roughness: 0.3,
                });
            pen.polygon(
                g,
                [
                    [face, top],
                    [face + deep, top - rise],
                    [face + deep, foot - rise],
                    [face, foot],
                ],
                "ruler",
                pen.fill("card"),
                ink,
            );
            // the painted square above the rim that a bank shot aims at
            const sq = (k: number, y: number): [number, number] => [face + deep * k, y - rise * k];
            pen.polygon(
                g,
                [
                    sq(0.2, rimY - 1.9 * U),
                    sq(0.8, rimY - 1.9 * U),
                    sq(0.8, rimY - 0.15 * U),
                    sq(0.2, rimY - 0.15 * U),
                ],
                "ruler",
                null,
                { strokeWidth: 1.8, roughness: 0.3, stroke: c.paper ? c.t.ink : c.t.tang },
            );
            pen.rect(g, face - 0.06 * U, top, B.thick * U * 0.5, foot - top, "ruler", null, ink);
            // the rim's bracket to the board, and the rim's far half
            pen.line(g, rx + half, rimY, face, rimY - 0.1 * U, "ruler", {
                strokeWidth: 2.4,
                roughness: 0.2,
            });
            pen.arc(g, rx, rimY, half * 2, ry * 2, Math.PI, Math.PI * 2, "ruler", {
                strokeWidth: 2.8,
                roughness: 0.2,
                stroke: c.paper ? c.t.ink : c.t.tang,
            });
        }
        if (whole || part === "net") {
            const sw = give(p.swing, 1) * U,
                st = give(p.stretch, 1) * U,
                op = give(p.open, 1) * U;
            const deepNet = 1.9 * U + st,
                foot = 0.45 * U + op * 0.5;
            const at = (k: number, side: number): [number, number] => {
                const w = half + (foot - half) * k;
                return [rx + side * w + sw * k * k, rimY + deepNet * k];
            };
            const cord = {
                strokeWidth: 1,
                roughness: 0.3,
                stroke: c.paper ? c.t.ink : c.t["ink-soft"],
            };
            // the cords of the net, crossing as a diamond mesh from the rim to its foot
            for (let i = 0; i <= 4; i++) {
                const u = -1 + (i / 4) * 2;
                const a: [number, number] = [rx + u * half, rimY + ry * Math.sqrt(1 - u * u)];
                const b = at(1, Math.max(-1, Math.min(1, u - 0.5)));
                const d = at(1, Math.max(-1, Math.min(1, u + 0.5)));
                pen.line(g, a[0], a[1], b[0], b[1], "ruler", cord);
                pen.line(g, a[0], a[1], d[0], d[1], "ruler", cord);
            }
            for (const k of [0.5, 1]) {
                const l = at(k, -1),
                    r = at(k, 1);
                pen.line(g, l[0], l[1], r[0], r[1], "ruler", cord);
            }
        }
        if (front)
            pen.arc(g, rx, rimY, half * 2, ry * 2, 0, Math.PI, "ruler", {
                strokeWidth: 3.2,
                roughness: 0.2,
                stroke: c.paper ? c.t.ink : c.t.tang,
            });
        if (front && !c.paper)
            plain(c, {
                kind: "path",
                d: `M${rx - half * 0.6} ${rimY + ry * 0.85}Q${rx} ${rimY + ry * 1.1} ${rx + half * 0.3} ${rimY + ry}`,
                fill: "none",
                stroke: c.t.card,
                width: 1,
                cap: "round",
                opacity: 0.6,
            });
        if (part === "cover") {
            // the cover: a ball at the end of a high dotted arc, dropping into the hoop
            const a: [number, number] = [0.3 * U, rimY + 0.8 * U],
                m: [number, number] = [0.5 * U, rimY - 6 * U],
                b: [number, number] = [rx - 0.1 * U, rimY - 1.3 * U];
            for (let i = 1; i < 9; i++) {
                const t = i / 10,
                    x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * m[0] + t * t * b[0],
                    y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * m[1] + t * t * b[1];
                pen.circle(g, x, y, 0.16 * U, "ruler", pen.fill("ink-soft", "solid"), {
                    strokeWidth: 0.6,
                    roughness: 0.2,
                });
            }
            const r = 0.5 * U;
            pen.circle(g, b[0], b[1], r * 2, "pencil", pen.fill("tang", "solid"), {
                strokeWidth: 1.4,
                roughness: 0.4,
            });
            const seam = { strokeWidth: 1, roughness: 0.3 };
            pen.line(g, b[0], b[1] - r, b[0], b[1] + r, "ruler", seam);
            pen.line(g, b[0] - r, b[1], b[0] + r, b[1], "ruler", seam);
        }
        return {
            rim: [rx, rimY, "up"],
            board: [B.face * U, rimY - 2 * U, "left"],
            foot: [4.2 * U, h * U, "down"],
        };
    },
    describe: (p) =>
        p.part === "cover"
            ? "A basketball dropping into a backyard hoop at the end of a high dotted arc, over a white backboard with its painted square, an orange rim and a net."
            : p.part === "net"
              ? "The white cord net of a basketball hoop on its own, hanging in a diamond mesh from where the rim would be, swinging as a ball drops through."
              : `A backyard basketball hoop seen from the side, its rim ${tallOf(p.tall)} squares up${p.mount === "wall" ? " on a garage wall" : " on a pole"}, with a white backboard, a painted square, an orange rim and a net.`,
});
