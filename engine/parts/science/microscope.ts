import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** An ellipse as a closed outline, tipped through `tilt` radians, for a mirror seen at an angle. */
function tipped(cx: number, cy: number, rx: number, ry: number, tilt: number): Pt[] {
    return Array.from({ length: 20 }, (_, k): Pt => {
        const t = (k / 20) * Math.PI * 2,
            ex = Math.cos(t) * rx,
            ey = Math.sin(t) * ry;
        return [
            cx + ex * Math.cos(tilt) - ey * Math.sin(tilt),
            cy + ex * Math.sin(tilt) + ey * Math.cos(tilt),
        ];
    });
}

/** The laboratory's first instrument (src/world/lab.ts). */
export const microscope = defineDrawing({
    id: "microscope",
    family: "science",
    title: "Microscope",
    group: "Props",
    about: "A school microscope seen from the side: an eyepiece on a tube, lenses over a stage with two clips to hold a glass slide, a mirror or a lamp under the stage, a focus knob on the curved arm and a heavy base. Its parts can be named.",
    params: { slide: 1, lamp: 0 },
    settings: { slide: { kind: "whole", min: 0, max: 1 }, lamp: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "A slide on the stage, with a mirror", params: { slide: 1, lamp: 0 } },
        { label: "With a lamp, no slide", params: { slide: 0, lamp: 1 } },
    ],
    box: () => ({ w: 5, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            tx = 3.25 * U,
            base = 6.75 * U,
            stage = 4.3 * U,
            slide = (p.slide ?? 1) > 0,
            lamp = (p.lamp ?? 0) > 0,
            a: RawAnchors = {};
        const white = pen.fill("card"),
            grey = pen.fill("ink-soft", "hachure", { hachureGap: 3.2, fillWeight: 0.7 }),
            bench = base - 0.62 * U;
        pen.path(
            g,
            `M${0.45 * U} ${base}H${4.55 * U}V${base - 0.3 * U}Q${4.55 * U} ${bench} ${4.1 * U} ${bench}H${0.85 * U}Q${0.45 * U} ${bench} ${0.45 * U} ${base - 0.3 * U}Z`,
            "pencil",
            grey,
            calm(c, 1.8),
        );
        pen.rect(g, 1.2 * U, 4.85 * U, 0.7 * U, bench - 4.85 * U, "pencil", white, calm(c, 1.7));
        pen.path(
            g,
            `M${1.2 * U} ${4.95 * U}C${0.45 * U} ${3.9 * U} ${0.62 * U} ${1.95 * U} ${2.95 * U} ${1.28 * U}L${2.95 * U} ${1.95 * U}C${1.45 * U} ${2.4 * U} ${1.3 * U} ${3.8 * U} ${1.9 * U} ${4.95 * U}Z`,
            "pencil",
            white,
            calm(c, 1.8),
        );
        pen.circle(g, 1.55 * U, 4.9 * U, 0.5 * U, "ruler", white, calm(c, 1.4));
        if (lamp) {
            pen.path(
                g,
                `M${tx - 0.5 * U} ${bench}L${tx - 0.4 * U} ${5.5 * U}Q${tx - 0.38 * U} ${5.3 * U} ${tx - 0.2 * U} ${5.3 * U}H${tx + 0.2 * U}Q${tx + 0.38 * U} ${5.3 * U} ${tx + 0.4 * U} ${5.5 * U}L${tx + 0.5 * U} ${bench}Z`,
                "pencil",
                white,
                calm(c, 1.7),
            );
            pen.ellipse(
                g,
                tx,
                5.3 * U,
                0.66 * U,
                0.24 * U,
                "ruler",
                pen.fill("glow"),
                calm(c, 1.2),
            );
            pen.rect(
                g,
                tx - 0.13 * U,
                5.86 * U,
                0.26 * U,
                0.14 * U,
                "ruler",
                pen.fill("ink-soft"),
                calm(c, 1),
            );
            for (const s of [-1, 0, 1])
                pen.line(
                    g,
                    tx + s * 0.18 * U,
                    5.1 * U,
                    tx + s * 0.28 * U,
                    4.88 * U,
                    "ruler",
                    calm(c, 1.1),
                );
            a.lamp = [tx + 0.45 * U, 5.7 * U, "right"];
        } else {
            const my = 5.45 * U,
                tilt = -0.35,
                end: Pt = [tx - 0.6 * U * Math.cos(tilt), my - 0.6 * U * Math.sin(tilt)];
            pen.line(g, 1.9 * U, end[1], end[0], end[1], "pencil", calm(c, 1.6));
            pen.polygon(g, tipped(tx, my, 0.62 * U, 0.26 * U, tilt), "ruler", white, calm(c, 1.6));
            pen.polygon(
                g,
                tipped(tx, my, 0.47 * U, 0.16 * U, tilt),
                "ruler",
                pen.fill("sky"),
                calm(c, 1.1),
            );
            pen.circle(g, end[0], end[1], 0.26 * U, "ruler", pen.fill("ink-soft"), calm(c, 1));
            a.mirror = [tx + 0.62 * U, my, "right"];
        }
        pen.rect(
            g,
            tx - 0.26 * U,
            stage + 0.25 * U,
            0.52 * U,
            0.24 * U,
            "pencil",
            grey,
            calm(c, 1.3),
        );
        pen.rect(g, 1.45 * U, stage + 0.25 * U, 0.5 * U, 0.26 * U, "pencil", white, calm(c, 1.3));
        pen.rect(g, 1.45 * U, stage, 3.3 * U, 0.25 * U, "ruler", white, calm(c, 1.8));
        if (slide) {
            pen.rect(
                g,
                2.25 * U,
                stage - 0.2 * U,
                2.15 * U,
                0.2 * U,
                "ruler",
                pen.fill("sky"),
                calm(c, 1.2),
            );
            pen.ellipse(
                g,
                tx,
                stage - 0.1 * U,
                0.36 * U,
                0.1 * U,
                "ruler",
                pen.fill("ink-soft"),
                calm(c, 0.8),
            );
        }
        const rests = slide ? stage - 0.21 * U : stage - 0.02 * U;
        for (const [pin, end] of [
            [2.05 * U, 2.55 * U],
            [4.45 * U, 3.95 * U],
        ] as const) {
            pen.line(g, pin, stage - 0.1 * U, end, rests, "ruler", calm(c, 1.6));
            pen.circle(
                g,
                pin,
                stage - 0.08 * U,
                0.2 * U,
                "ruler",
                pen.fill("ink-soft"),
                calm(c, 1),
            );
        }
        const knob: Pt = [1.05 * U, 3.15 * U];
        pen.circle(g, knob[0], knob[1], 0.84 * U, "ruler", white, calm(c, 1.6));
        for (let k = 0; k < 12; k++) {
            const t = (k / 12) * Math.PI * 2;
            pen.line(
                g,
                knob[0] + Math.cos(t) * 0.29 * U,
                knob[1] + Math.sin(t) * 0.29 * U,
                knob[0] + Math.cos(t) * 0.4 * U,
                knob[1] + Math.sin(t) * 0.4 * U,
                "ruler",
                calm(c, 0.8),
            );
        }
        pen.circle(g, knob[0], knob[1], 0.32 * U, "ruler", pen.fill("ink-soft"), calm(c, 1.1));
        pen.rect(g, 2.6 * U, 1.42 * U, 0.4 * U, 0.42 * U, "pencil", white, calm(c, 1.3));
        for (const turn of [-0.6, 0.6]) {
            const at = ([x, y]: Pt): Pt => [
                tx + x * Math.cos(turn) - y * Math.sin(turn),
                3.4 * U + x * Math.sin(turn) + y * Math.cos(turn),
            ];
            pen.polygon(
                g,
                [
                    at([-0.13 * U, 0]),
                    at([0.13 * U, 0]),
                    at([0.1 * U, 0.48 * U]),
                    at([-0.1 * U, 0.48 * U]),
                ],
                "ruler",
                white,
                calm(c, 1.3),
            );
        }
        pen.polygon(
            g,
            [
                [tx - 0.17 * U, 3.46 * U],
                [tx + 0.17 * U, 3.46 * U],
                [tx + 0.12 * U, 3.98 * U],
                [tx - 0.12 * U, 3.98 * U],
            ],
            "ruler",
            white,
            calm(c, 1.4),
        );
        pen.rect(
            g,
            tx - 0.16 * U,
            3.62 * U,
            0.32 * U,
            0.12 * U,
            "ruler",
            pen.fill("sky"),
            calm(c, 1),
        );
        pen.polygon(
            g,
            [
                [tx - 0.5 * U, 3.2 * U],
                [tx + 0.5 * U, 3.2 * U],
                [tx + 0.36 * U, 3.5 * U],
                [tx - 0.36 * U, 3.5 * U],
            ],
            "pencil",
            grey,
            calm(c, 1.5),
        );
        pen.rect(g, tx - 0.36 * U, 1.05 * U, 0.72 * U, 2.15 * U, "pencil", white, calm(c, 1.8));
        pen.rect(g, tx - 0.24 * U, 0.5 * U, 0.48 * U, 0.58 * U, "pencil", white, calm(c, 1.6));
        pen.rect(g, tx - 0.31 * U, 0.28 * U, 0.62 * U, 0.24 * U, "pencil", grey, calm(c, 1.5));
        a.eyepiece = [tx, 0.28 * U, "up"];
        a.tube = [tx + 0.36 * U, 2.15 * U, "right"];
        a.objective = [tx + 0.17 * U, 3.75 * U, "right"];
        a.stage = [4.75 * U, stage + 0.12 * U, "right"];
        a.knob = [knob[0] - 0.42 * U, knob[1], "left"];
        a.arm = [0.66 * U, 2.25 * U, "left"];
        a.base = [0.45 * U, base - 0.3 * U, "left"];
        return a;
    },
    describe: (p) =>
        `A microscope seen from the side, an eyepiece on a tube over a stage with two clips${p.slide > 0 ? " holding a slide" : ""}, ${p.lamp > 0 ? "a lamp" : "a mirror"} under the stage and a focus knob.`,
    motion: { still: "A microscope stands still on the bench to be looked through." },
});
