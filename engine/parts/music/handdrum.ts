import { letter, group, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { STILL, defineInstrument } from "../drawing";
import { type Key } from "../../sound/keys";
import { DUM, TA } from "../../sound/voices";

interface HandDrumParams {
    /** Squares across the drum. Twelve is the lesson size, where the middle is five squares by three. */
    wide: number;
    /** Write dum and ta on the skin. */
    words: boolean;
    down: string[];
    lit: string[];
}

interface DrumShape {
    wide: number;
    box: { w: number; h: number };
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    waist: number;
    foot: number;
}

/** The middle's share of the skin, across and down. */
const MID = 0.45;

function drumShape(p: Pick<HandDrumParams, "wide">): DrumShape {
    const wide = Math.max(6, Math.min(24, Math.round(p.wide || 12)));
    const h = Math.round(wide * 0.92);
    const rx = (wide / 2 - 0.5) * U;
    const ry = rx * 0.6;
    const cy = ry + 0.5 * U;
    const under = cy + ry;
    return {
        wide,
        box: { w: wide, h },
        cx: (wide / 2) * U,
        cy,
        rx,
        ry,
        waist: under + (h * U - under) * 0.45,
        foot: h * U - 0.35 * U,
    };
}

const layer = <G>(
    c: Ctx<G>,
    key: string,
    kind: "face" | "down" | "lit" | "focus",
    shown: boolean,
): G =>
    group(c, { data: { key, layer: kind }, ...(kind !== "face" && !shown ? { hidden: true } : {}) })
        .g;

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const handDrum = defineInstrument<HandDrumParams>({
    id: "handdrum",
    family: "music",
    title: "Hand drum",
    group: "Inputs",
    about:
        "A hand drum that is played: a wide skin laced with rope to a wooden shell that narrows to a waist " +
        "and a foot. Hit the middle for a low dum and the edge for a high ta. The part hit lights with a " +
        "ring, so the drum works with the volume at zero.",
    voice: "drum",
    params: { wide: 12, words: true, down: [], lit: [] },
    settings: {
        wide: { kind: "whole", min: 6, max: 16 },
        words: { kind: "flag" },
        down: { kind: "words", most: 2 },
        lit: { kind: "words", most: 2 },
    },
    takes: [
        { label: "Lesson size", params: { wide: 12, words: true, down: [], lit: [] } },
        { label: "The middle struck", params: { wide: 12, words: true, down: ["dum"], lit: [] } },
        { label: "The edge to play", params: { wide: 12, words: true, down: [], lit: ["ta"] } },
        {
            label: "Small, to look at rather than play",
            params: { wide: 8, words: false, down: [], lit: [] },
        },
    ],
    box: (p) => drumShape(p).box,

    keys(p) {
        const s = drumShape(p);
        const mx = s.rx * MID,
            my = s.ry * MID;
        return [
            {
                id: "dum",
                note: DUM,
                anchor: "hit(dum)",
                label: "dum",
                spoken: "The middle of the drum, dum, the low sound",
                raised: true,
                hit: { x: s.cx - mx, y: s.cy - my, w: 2 * mx, h: 2 * my },
            },
            {
                id: "ta",
                note: TA,
                anchor: "hit(ta)",
                label: "ta",
                spoken: "The edge of the drum, ta, the high sound",
                raised: false,
                hit: { x: s.cx - s.rx, y: s.cy - s.ry, w: 2 * s.rx, h: 2 * s.ry },
            },
        ] satisfies Key[];
    },

    draw: (c, p) => {
        const { pen, g } = c;
        const s = drumShape(p);
        const { cx, cy, rx, ry } = s;
        const down = new Set(p.down ?? []);
        const lit = new Set(p.lit ?? []);
        const a: RawAnchors = {};
        const size = Math.max(14, s.wide * 1.7);
        // The shell: out from under the skin, in to the waist, out again to the foot.
        const wx = rx * 0.4,
            fx = rx * 0.6;
        const bowl = cy + ry * 1.25;
        const shell =
            `M${cx - rx} ${cy}C${cx - rx} ${bowl} ${cx - wx * 1.2} ${s.waist - 0.8 * U} ${cx - wx} ${s.waist}` +
            `C${cx - wx * 0.95} ${s.waist + 0.6 * U} ${cx - fx} ${s.foot - 0.7 * U} ${cx - fx} ${s.foot}` +
            `L${cx + fx} ${s.foot}C${cx + fx} ${s.foot - 0.7 * U} ${cx + wx * 0.95} ${s.waist + 0.6 * U} ${cx + wx} ${s.waist}` +
            `C${cx + wx * 1.2} ${s.waist - 0.8 * U} ${cx + rx} ${bowl} ${cx + rx} ${cy}Z`;
        pen.path(
            g,
            shell,
            "pencil",
            pen.fill(
                "tang",
                "hachure",
                c.paper ? { hachureGap: 10 } : { hachureGap: 5, hachureAngle: -30 },
            ),
            calm(c, 1.8),
        );

        // The rope, laced from the crown under the skin down to a ring at the waist and back.
        const rim = (t: number): [number, number] => [
            cx + rx * Math.cos(t),
            cy + ry * Math.sin(t) + 3,
        ];
        const low = (t: number): [number, number] => [
            cx + wx * Math.cos(t),
            s.waist + 3 * Math.sin(t),
        ];
        const laces: [number, number][] = [];
        const n = 9;
        for (let i = 0; i <= n; i++) {
            const t = Math.PI * (0.06 + (0.88 * i) / n);
            laces.push(i % 2 ? low(t) : rim(t));
        }
        pen.linear(g, laces, "pencil", { strokeWidth: 1.3, stroke: c.t.ink });
        pen.ellipse(g, cx, s.waist, wx * 2 + 4, 0.5 * U, "pencil", null, {
            strokeWidth: 2.4,
            stroke: c.t.ink,
        });
        pen.line(g, cx - fx + 4, s.foot - 0.3 * U, cx + fx - 4, s.foot - 0.3 * U, "pencil", {
            strokeWidth: 1.6,
            stroke: c.t.ink,
        });

        // The crown of rope round the skin's edge, which shows as a band of the shell's colour.
        pen.ellipse(
            g,
            cx,
            cy + 3,
            rx * 2 + 0.5 * U,
            ry * 2 + 0.45 * U,
            "pencil",
            pen.fill("tang", "solid"),
            calm(c, 1.6),
        );

        const edge = layer(c, "ta", "face", true);
        pen.ellipse(edge, cx, cy, rx * 2, ry * 2, "pencil", pen.fill("card"), calm(c, 1.9));
        // A few lines of the hide near the rim, which are what make it a skin rather than a plate.
        for (const [t0, t1] of [
            [3.55, 4.05],
            [5.05, 5.5],
            [0.35, 0.85],
            [2.3, 2.75],
        ] as const) {
            pen.arc(edge, cx, cy, rx * 1.7, ry * 1.7, t0, t1, "pencil", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
        }
        if (p.words)
            letter(
                { ...c, g: edge },
                {
                    x: cx,
                    y: cy + ry * 0.7 + size * 0.35,
                    s: "ta",
                    face: "read",
                    weight: 700,
                    size,
                    fill: c.t.ink,
                    anchor: "middle",
                },
            );

        const middle = layer(c, "dum", "face", true);
        pen.ellipse(middle, cx, cy, rx * 2 * MID, ry * 2 * MID, "pencil", null, {
            strokeWidth: 1.4,
            stroke: c.t["ink-soft"],
            strokeLineDash: [7, 6],
        });
        if (p.words)
            letter(
                { ...c, g: middle },
                {
                    x: cx,
                    y: cy + size * 0.35,
                    s: "dum",
                    face: "read",
                    weight: 700,
                    size,
                    fill: c.t.ink,
                    anchor: "middle",
                },
            );

        const struck = layer(c, "dum", "down", down.has("dum"));
        pen.ellipse(struck, cx, cy, rx * 2 * MID, ry * 2 * MID, "pencil", null, {
            strokeWidth: 9,
            stroke: c.t.glow,
        });
        const struckEdge = layer(c, "ta", "down", down.has("ta"));
        pen.ellipse(struckEdge, cx, cy, rx * 2 - 18, ry * 2 - 16, "pencil", null, {
            strokeWidth: 9,
            stroke: c.t.glow,
        });

        const ring = layer(c, "dum", "lit", lit.has("dum"));
        pen.ellipse(ring, cx, cy, rx * 2 * MID + 22, ry * 2 * MID + 18, "doodle", null, {
            strokeWidth: 2.6,
            stroke: c.t.pen,
        });
        const ringEdge = layer(c, "ta", "lit", lit.has("ta"));
        pen.ellipse(ringEdge, cx, cy, rx * 2 + 16, ry * 2 + 14, "doodle", null, {
            strokeWidth: 2.6,
            stroke: c.t.pen,
        });

        const focus = layer(c, "dum", "focus", false);
        pen.rect(
            focus,
            cx - rx * MID - 3,
            cy - ry * MID - 3,
            rx * 2 * MID + 6,
            ry * 2 * MID + 6,
            "ruler",
            null,
            { strokeWidth: 1.8, stroke: c.t.pen, strokeLineDash: [5, 4] },
        );
        const focusEdge = layer(c, "ta", "focus", false);
        pen.rect(focusEdge, cx - rx - 3, cy - ry - 3, rx * 2 + 6, ry * 2 + 6, "ruler", null, {
            strokeWidth: 1.8,
            stroke: c.t.pen,
            strokeLineDash: [5, 4],
        });

        a["hit(dum)"] = [cx, cy - ry * MID, "up"];
        a["hit(ta)"] = [cx, cy - ry, "up"];
        a.under = [cx, s.box.h * U, "down"];
        return a;
    },
    describe: (p) =>
        `A hand drum seen from above, a wide round skin laced with rope to its shell, the middle and the edge each a place to hit${p.words ? ", their sounds written on" : ""}.`,
    motion: { still: STILL.input },
});
