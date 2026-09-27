import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const whole = (v: number) => Math.max(2, Math.min(5, Math.round(v)));

/**
 * The slide's platform and chute, in squares from its box's bottom left with y up from the ground,
 * for a platform `h` high. The pups' park builds its bodies to this.
 */
export function slideShape(high: number): {
    w: number;
    h: number;
    platform: { x0: number; x1: number; y: number };
    chute: { x0: number; y0: number; x1: number; y1: number };
} {
    const h = whole(high);
    return {
        w: 3 + h * 1.5,
        h: h + 1,
        platform: { x0: 0.4, x1: 2.4, y: h },
        chute: { x0: 2.4, y0: h, x1: 2.4 + h * 1.5, y1: 0.25 },
    };
}

export const parkSlide = defineDrawing<{ h: number }>({
    id: "parkslide",
    family: "outdoors",
    title: "Playground slide",
    group: "Structures",
    about: "A playground slide seen from the side: a ladder up to a railed platform, and a smooth pink chute running down to the ground, with room under the platform.",
    params: { h: 3 },
    settings: { h: { kind: "whole", min: 2, max: 5 } },
    takes: [
        { label: "A low slide", params: { h: 2 } },
        { label: "A tall slide", params: { h: 4 } },
    ],
    box: (p) => {
        const s = slideShape(p.h);
        return { w: Math.ceil(s.w), h: s.h };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            s = slideShape(p.h),
            H = s.h,
            y = (up: number) => (H - up) * U,
            post = pen.fill("sky");
        pen.rect(g, 0.3 * U, y(s.platform.y), 0.22 * U, s.platform.y * U, "pencil", post, {
            strokeWidth: 1.3,
        });
        pen.rect(g, 2.2 * U, y(s.platform.y), 0.22 * U, s.platform.y * U, "pencil", post, {
            strokeWidth: 1.3,
        });
        for (let r = 0.6; r < s.platform.y; r += 0.7)
            pen.line(g, 0.3 * U, y(r), 0.9 * U, y(r), "ruler", { strokeWidth: 1.3 });
        pen.line(g, 0.9 * U, y(0), 0.9 * U, y(s.platform.y), "pencil", { strokeWidth: 1.6 });
        pen.rect(
            g,
            s.platform.x0 * U,
            y(s.platform.y),
            (s.platform.x1 - s.platform.x0) * U,
            0.28 * U,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.5 },
        );
        pen.line(g, 0.4 * U, y(s.platform.y + 0.9), 2.4 * U, y(s.platform.y + 0.9), "pencil", {
            strokeWidth: 1.6,
        });
        for (const x of [0.4, 1.4, 2.4])
            pen.line(g, x * U, y(s.platform.y), x * U, y(s.platform.y + 0.9), "pencil", {
                strokeWidth: 1.3,
            });
        const { x0, y0, x1, y1 } = s.chute;
        pen.path(
            g,
            `M${x0 * U} ${y(y0)}Q${(x0 + (x1 - x0) * 0.55) * U} ${y(y0 * 0.7)} ${x1 * U} ${y(y1)}L${x1 * U} ${y(y1 - 0.3)}Q${(x0 + (x1 - x0) * 0.55) * U} ${y(y0 * 0.7 - 0.3)} ${x0 * U} ${y(y0 - 0.3)}Z`,
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.6 },
        );
        return { platform: [((s.platform.x0 + s.platform.x1) / 2) * U, y(s.platform.y), "up"] };
    },
    describe: () =>
        "A playground slide seen from the side, with a blue ladder up to an orange railed platform and a curved pink chute running down to the ground.",
});
