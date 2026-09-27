import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, wide } from "../lettering";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

/** The board's top and bottom down its one-square box, in squares; a game lays the top where a walker's feet go. */
export const PLANK = { top: 0.15, bottom: 0.85 } as const;

export const plank = defineDrawing({
    id: "plank",
    family: "outdoors",
    title: "Plank",
    group: "Props",
    about: "A wooden plank seen from the side, with its length written on a white tag in the middle, for a bridge a child lays across a stream from stone to stone. Its length in squares is a setting, and the tag can say it in any unit or be left blank.",
    params: { w: 6, label: "6" },
    settings: {
        w: { kind: "whole", min: 1, max: 24 },
        label: { kind: "text", most: 8 },
    },
    takes: [
        { label: "Six squares long", params: { w: 6, label: "6" } },
        { label: "A long one, in centimetres", params: { w: 12, label: "150 cm" } },
        { label: "A short one with a blank tag", params: { w: 3, label: "" } },
    ],
    box: (p) => ({ w: whole(p.w, 1, 24, 6), h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = whole(p.w, 1, 24, 6) * U,
            top = PLANK.top * U,
            bottom = PLANK.bottom * U;
        pen.rect(
            g,
            1,
            top,
            w - 2,
            bottom - top,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 4.5, hachureAngle: 90, fillWeight: 0.6 }),
            calm(c, 1.7),
        );
        for (const x of [0.3 * U, w - 0.3 * U])
            pen.circle(
                g,
                x,
                (top + bottom) / 2,
                3,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.6, disableMultiStroke: true },
            );
        if (p.label) {
            const tag = Math.min(w - 0.8 * U, wide(p.label, 13) + 8);
            pen.rect(
                g,
                (w - tag) / 2,
                top - 1.5,
                tag,
                bottom - top + 3,
                "ruler",
                pen.fill("card"),
                {
                    strokeWidth: 1.1,
                    disableMultiStroke: true,
                    preserveVertices: true,
                },
            );
            num(c, w / 2, bottom - 3, p.label, 13);
        }
        return {
            left: [0, top, "left"],
            right: [w, top, "right"],
            top: [w / 2, top, "up"],
        };
    },
    describe: () =>
        "A long wooden plank seen from the side, with a nail near each end and its length written on a white tag in the middle.",
    motion: {
        still: "A game lays it across a stream and tips it; on the shelf it holds still so its length can be read.",
    },
});
