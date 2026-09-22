import { type Ctx } from "../../ink/surface";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

/** One stroke to a line, corners kept, the roughness turned down: the shelf's calm level for things. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    clamp(Math.round(Number(v) || d), lo, hi);

export const sheep = defineDrawing({
    id: "sheep",
    family: "animals",
    title: "Sheep",
    group: "Characters",
    about: "A sheep side on and facing right, woolly white with a dark face and dark legs, standing, mid-step or with its head down to graze, and with its eyes wide when something makes it jump. One sheep is one thing to count, so nothing on it could be counted by mistake.",
    params: { step: 0, graze: false, alarm: false },
    settings: {
        step: { kind: "whole", min: 0, max: 3 },
        graze: { kind: "flag" },
        alarm: { kind: "flag" },
    },
    takes: [
        { label: "Standing", params: { step: 0, graze: false, alarm: false } },
        { label: "Mid-step", params: { step: 1, graze: false, alarm: false } },
        { label: "Grazing", params: { step: 0, graze: true, alarm: false } },
        { label: "Startled", params: { step: 3, graze: false, alarm: true } },
    ],
    box: () => ({ w: 3, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            ground = 57,
            cx = 27,
            cy = 34,
            rx = 19,
            ry = 11.5;
        const step = whole(p.step, 0, 3, 0),
            phase = (step * Math.PI) / 2;
        // Diagonal legs move together, the far pair drawn first and a shade lighter.
        const legs = [
            [14, 0],
            [36, 1],
            [19, 1],
            [41, 0],
        ] as const;
        legs.forEach(([x, pair], i) => {
            const swing = Math.sin(phase + pair * Math.PI) * (step === 0 ? 0 : 3.2),
                far = i < 2;
            pen.line(g, x, cy + 6, x + swing, ground - 1, "ruler", {
                ...calm(c, far ? 2.2 : 2.6),
                stroke: far ? c.t["ink-soft"] : c.t.ink,
            });
        });
        // The fleece: an ellipse with a scalloped edge, so it reads as wool and not as a cloud.
        const fleece: Pt[] = [];
        for (let i = 0; i < 44; i++) {
            const a = (i / 44) * Math.PI * 2,
                bump = 0.9 + 0.13 * Math.abs(Math.sin(a * 5.5));
            fleece.push([cx + Math.cos(a) * rx * bump, cy + Math.sin(a) * ry * bump]);
        }
        pen.polygon(g, fleece, "pencil", pen.fill("card"), calm(c, 1.7));
        for (const [x, y] of [
            [18, 30],
            [26, 26],
            [33, 33],
            [22, 38],
            [37, 27],
        ] as const) {
            pen.arc(g, x, y, 7, 5, Math.PI * 0.9, Math.PI * 2.05, "ruler", {
                ...calm(c, 0.9),
                stroke: c.t["ink-soft"],
            });
        }
        const hx = p.graze ? 49 : 47.5,
            hy = p.graze ? 45 : 26,
            turn = p.graze ? 0.7 : -0.25;
        const at = (dx: number, dy: number): Pt => [
            hx + dx * Math.cos(turn) - dy * Math.sin(turn),
            hy + dx * Math.sin(turn) + dy * Math.cos(turn),
        ];
        // An ear sticks out behind the head, and a tuft of wool sits on top of it.
        const ear = [at(-5, -5), at(-12, -8), at(-7, -1)];
        pen.polygon(g, ear, "ruler", pen.fill("ink-soft", "solid"), calm(c, 1.2));
        const face: Pt[] = [];
        for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2,
                r = 1 + 0.1 * Math.cos(a);
            face.push(at(Math.cos(a) * 6.2 * r + 1, Math.sin(a) * 8.2));
        }
        pen.polygon(g, face, "ruler", pen.fill("ink-soft", "solid"), calm(c, 1.5));
        const tuft = at(-1.5, -8.5);
        pen.ellipse(g, tuft[0], tuft[1], 9, 5.5, "ruler", pen.fill("card"), calm(c, 1.1));
        const eye = at(2, -2.5),
            wide = p.alarm ? 5.4 : 4.2;
        pen.circle(g, eye[0], eye[1], wide, "ruler", pen.fill("card"), calm(c, 0.9));
        pen.circle(
            g,
            eye[0] + 0.5,
            eye[1] + 0.3,
            p.alarm ? 1.9 : 2.2,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.5 },
        );
        const nose = at(5.5, 5.5);
        pen.circle(
            g,
            nose[0],
            nose[1],
            1.4,
            "ruler",
            { fill: c.t.card, fillStyle: "solid" },
            { strokeWidth: 0.4, stroke: c.t.card },
        );
        return {
            head: [...at(0, -9), "up"],
            back: [cx, cy - ry - 2, "up"],
            feet: [cx, ground, "down"],
        };
    },
    describe: (p) =>
        `A woolly white sheep seen from the side facing right, with a dark face and dark legs, ${p.graze ? "its head down to graze" : whole(p.step, 0, 3, 0) > 0 ? "mid-step with its legs swinging" : "standing still"}${p.alarm ? ", its eye wide open" : ""}.`,
});
