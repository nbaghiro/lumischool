import { group, type Ctx, type RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";
import { num, patch, wide } from "../lettering";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";

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

interface FishParams {
    size: number;
    tone: Marker;
    tag: string;
    gape: boolean;
    facing: number;
}

export const fish = defineDrawing<FishParams>({
    id: "fish",
    family: "animals",
    title: "Fish",
    group: "Characters",
    about: "One fish side on, facing right or left, with a forked tail, fins, two stripes and a round eye, drawn at any size from a sprat to a big one, with a tag on its side that can carry a number. The tag reads the right way whichever way the fish faces. A bigger fish is a heavier one, so a row of them is a comparison before anything is read.",
    params: { size: 3, tone: "glow", tag: "", gape: false, facing: 1 },
    settings: {
        size: { kind: "whole", min: 2, max: 8 },
        tone: { kind: "one of", of: MARKERS },
        tag: { kind: "text", most: 6 },
        gape: { kind: "flag" },
        facing: { kind: "one of", of: [-1, 1] },
    },
    takes: [
        {
            label: "A small one tagged 2",
            params: { size: 2, tone: "glow", tag: "2", gape: false, facing: 1 },
        },
        {
            label: "Tagged 250 g, facing left",
            params: { size: 4, tone: "sky", tag: "250 g", gape: false, facing: -1 },
        },
        {
            label: "A big one biting",
            params: { size: 6, tone: "berry", tag: "", gape: true, facing: 1 },
        },
    ],
    box: (p) => {
        const w = whole(p.size, 2, 8, 3);
        return { w, h: Math.max(2, Math.round(w * 0.6)) };
    },
    draw: (c, p) => {
        const w = whole(p.size, 2, 8, 3),
            h = Math.max(2, Math.round(w * 0.6)),
            W = w * U,
            H = h * U,
            left = Number(p.facing) < 0;
        // A fish facing left is the same fish drawn in a mirrored group; its tag is written outside the group so it never reads backwards.
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
            nose = W - 4,
            root = W * 0.24,
            b = Math.min(H * 0.38, W * 0.23),
            mid = W * 0.58;
        const tone: Marker =
            (["sky", "mint", "berry", "tang", "glow"] as const).find((t) => t === p.tone) ?? "glow";
        const stripe: Marker = tone === "sky" ? "glow" : "sky";
        const line = Math.min(2, 1.3 + w * 0.08);
        pen.polygon(
            g,
            [
                [root + 3, cy],
                [4, cy - b * 0.95],
                [W * 0.12, cy],
                [4, cy + b * 0.95],
            ],
            "ruler",
            pen.fill(tone, "hachure", { hachureGap: 3.5, fillWeight: 0.9 }),
            calm(c, line),
        );
        pen.path(
            g,
            `M${mid - W * 0.14} ${cy - b * 0.86}Q${mid - W * 0.02} ${cy - b * 1.55} ${mid + W * 0.12} ${cy - b * 0.9}Z`,
            "ruler",
            pen.fill(tone, "hachure", { hachureGap: 3.5, fillWeight: 0.9 }),
            calm(c, line * 0.8),
        );
        const body = `M${nose} ${cy}C${nose - W * 0.1} ${cy - b * 1.2} ${root + W * 0.12} ${cy - b * 1.1} ${root} ${cy}C${root + W * 0.12} ${cy + b * 1.1} ${nose - W * 0.1} ${cy + b * 1.2} ${nose} ${cy}Z`;
        pen.path(g, body, "ruler", pen.fill(tone), calm(c, line));
        for (const k of [0.6, 0.72]) {
            const x = root + (nose - root) * k,
                t = b * (1.05 - Math.abs(k - 0.45) * 0.6);
            pen.path(
                g,
                `M${x} ${cy - t}Q${x + W * 0.035} ${cy} ${x} ${cy + t}L${x + W * 0.05} ${cy + t * 0.96}Q${x + W * 0.085} ${cy} ${x + W * 0.05} ${cy - t * 0.96}Z`,
                "ruler",
                pen.fill(stripe),
                { strokeWidth: 0.7, roughness: 0.3 },
            );
        }
        pen.path(
            g,
            `M${mid} ${cy + b * 0.35}Q${mid - W * 0.06} ${cy + b * 0.95} ${mid - W * 0.13} ${cy + b * 0.6}`,
            "ruler",
            pen.fill(tone, "hachure", { hachureGap: 3 }),
            calm(c, 0.9),
        );
        const ex = nose - W * 0.14,
            ey = cy - b * 0.28,
            er = Math.max(4.5, b * 0.42);
        pen.arc(g, nose - W * 0.23, cy, b * 0.5, b * 1.3, -Math.PI * 0.4, Math.PI * 0.4, "ruler", {
            strokeWidth: 1,
            disableMultiStroke: true,
        });
        pen.circle(g, ex, ey, er, "ruler", pen.fill("card"), calm(c, 1));
        pen.circle(
            g,
            ex + er * 0.12,
            ey,
            er * 0.48,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.4 },
        );
        if (p.gape)
            pen.circle(
                g,
                nose - 2.5,
                cy + b * 0.12,
                Math.max(3.5, b * 0.34),
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.6 },
            );
        else
            pen.line(g, nose - W * 0.05, cy + b * 0.2, nose - 1, cy + b * 0.08, "ruler", {
                strokeWidth: 1.1,
                disableMultiStroke: true,
            });
        const X = (x: number) => (left ? W - x : x);
        const a: RawAnchors = {
            mouth: [X(nose), cy + b * 0.1, left ? "left" : "right"],
            tail: [X(4), cy, left ? "right" : "left"],
        };
        if (p.tag) {
            // The tag is a small card hung on the fish's side, as big as the fish allows and never under the shelf's smallest reading size.
            const s = String(p.tag),
                size = clamp(Math.round(b * 0.95), 11, 22),
                tw = wide(s, size) + 8,
                tx = X(root + (nose - root) * 0.36),
                ty = cy + b * 0.08;
            const g = c.g;
            pen.path(
                g,
                `M${tx - tw / 2} ${ty - size * 0.55}H${tx + tw / 2}V${ty + size * 0.55}H${tx - tw / 2}Z`,
                "ruler",
                pen.fill("card"),
                calm(c, 1),
            );
            pen.circle(g, tx - tw / 2 + 3.2, ty, 2.4, "ruler", null, { strokeWidth: 0.8 });
            patch(c, tx + 1, ty - 1, tw - 6, size * 0.95);
            num(c, tx + 1.5, ty + size * 0.35, s, size);
            a.tag = [tx, ty - size * 0.55, "up"];
        }
        return a;
    },
    describe: (p) =>
        `One ${MARKER_WORD[MARKERS.find((t) => t === p.tone) ?? "glow"]} fish seen from the side facing ${Number(p.facing) < 0 ? "left" : "right"}, with a forked tail, fins, two stripes and a round eye${p.gape ? ", its mouth open" : ""}${p.tag ? ", and a tag on its side" : ""}.`,
});
