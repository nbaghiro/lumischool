import { plain, type Ctx } from "../../ink/surface";
import { defineDrawing } from "../drawing";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";

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

interface HoopParams {
    tall: number;
    part: "whole" | "back" | "front";
    tone: Marker;
    lit: boolean;
}

export const hoop = defineDrawing<HoopParams>({
    id: "hoop",
    family: "sport",
    title: "Hoop",
    group: "Props",
    about: "A striped hoop seen from the side and a little in front, the kind a plane flies through. It can be drawn whole, or as its back half and its front half so something can pass between them, and it lights up once something has gone through it.",
    params: {
        tall: 3,
        part: "whole",
        tone: "berry",
        lit: false,
    },
    settings: {
        tall: { kind: "whole", min: 2, max: 6 },
        part: { kind: "one of", of: ["whole", "back", "front"] },
        tone: { kind: "one of", of: MARKERS },
        lit: { kind: "flag" },
    },
    takes: [
        { label: "Whole", params: { tall: 3, part: "whole", tone: "berry", lit: false } },
        { label: "Its back half", params: { tall: 3, part: "back", tone: "sky", lit: false } },
        {
            label: "Flown through, lit",
            params: { tall: 4, part: "whole", tone: "mint", lit: true },
        },
    ],
    box: (p) => ({ w: 2, h: whole(p.tall, 2, 6, 3) }),
    draw: (c, p) => {
        const { pen, g } = c,
            h = whole(p.tall, 2, 6, 3),
            cx = U,
            cy = (h * U) / 2,
            rx = 0.52 * U,
            ry = cy - 4,
            band = 3.2;
        const tone: Marker =
            (["sky", "mint", "berry", "tang", "glow"] as const).find((t) => t === p.tone) ??
            "berry";
        if (p.lit && !c.paper && p.part !== "front")
            plain(c, {
                kind: "ellipse",
                cx,
                cy,
                rx: rx + 7,
                ry: ry + 7,
                fill: c.t.glow,
                opacity: 0.3,
            });
        const n = 16,
            at = (a: number, r: number): Pt => [
                cx + Math.cos(a) * (rx + r),
                cy + Math.sin(a) * (ry + r * 1.4),
            ];
        for (let i = 0; i < n; i++) {
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2,
                a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2,
                mid = (a0 + a1) / 2;
            const back = Math.cos(mid) < 0;
            if ((p.part === "back" && !back) || (p.part === "front" && back)) continue;
            pen.polygon(
                g,
                [at(a0, -band), at(a1, -band), at(a1, band), at(a0, band)],
                "ruler",
                pen.fill(p.lit ? (i % 2 ? "glow" : tone) : i % 2 ? "card" : tone),
                calm(c, 1.1),
            );
        }
        return {
            centre: [cx, cy, "right"],
            top: [cx, cy - ry, "up"],
            bottom: [cx, cy + ry, "down"],
        };
    },
    describe: (p) =>
        `A striped ${MARKER_WORD[MARKERS.find((t) => t === p.tone) ?? "berry"]} hoop standing on its edge, seen from the side with bands of colour and white all the way round, drawn ${p.part === "back" ? "as its back half" : p.part === "front" ? "as its front half" : "whole"}${p.lit ? " and lit yellow" : ""}.`,
});
