import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const whole = (v: number): number => Math.max(2, Math.min(8, Math.round(v)));

/** A fallen log lying on its side, hollow from end to end, big enough for a small animal to hide in. */
export const hollowLog = defineDrawing<{ w: number }>({
    id: "hollowlog",
    family: "outdoors",
    title: "Hollow log",
    group: "Structures",
    about: "A fallen log lying along the ground, hollow right through, with a dark opening at its near end, rough bark, a little moss and a toadstool.",
    params: { w: 3 },
    settings: { w: { kind: "whole", min: 2, max: 8 } },
    takes: [
        { label: "A short log", params: { w: 3 } },
        { label: "A long log", params: { w: 6 } },
    ],
    box: (p) => ({ w: whole(p.w), h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = whole(p.w) * U,
            line = { strokeWidth: 1.6, roughness: 0.3 };
        pen.rect(
            g,
            0.6 * U,
            0.35 * U,
            w - 1.2 * U,
            1.55 * U,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 5 }),
            line,
        );
        pen.ellipse(
            g,
            0.65 * U,
            1.12 * U,
            1.0 * U,
            1.55 * U,
            "pencil",
            pen.fill("tang", "solid"),
            line,
        );
        pen.ellipse(
            g,
            0.68 * U,
            1.12 * U,
            0.6 * U,
            1.1 * U,
            "pencil",
            pen.fill("ink-soft", "solid"),
            {
                strokeWidth: 1,
            },
        );
        pen.ellipse(
            g,
            w - 0.65 * U,
            1.12 * U,
            1.0 * U,
            1.55 * U,
            "pencil",
            pen.fill("tang", "solid"),
            line,
        );
        pen.ellipse(
            g,
            w - 0.62 * U,
            1.12 * U,
            0.6 * U,
            1.1 * U,
            "pencil",
            pen.fill("ink-soft", "solid"),
            {
                strokeWidth: 1,
            },
        );
        pen.path(
            g,
            `M${1.4 * U} ${0.4 * U}Q${w / 2} ${0.05 * U} ${w - 1.6 * U} ${0.4 * U}`,
            "pencil",
            null,
            { strokeWidth: 3, stroke: c.paper ? c.t.ink : c.t.mint },
        );
        pen.path(
            g,
            `M${w / 2 - 0.3 * U} ${0.42 * U}Q${w / 2} ${-0.05 * U} ${w / 2 + 0.3 * U} ${0.42 * U}Z`,
            "pencil",
            pen.fill("berry"),
            {
                strokeWidth: 0.9,
            },
        );
        return { top: [w / 2, 0.3 * U, "up"] };
    },
    describe: (p) =>
        `A fallen ${whole(p.w) > 4 ? "long " : ""}log lying on the ground, hollow right through with dark openings at both ends, rough bark, moss and a tiny pink toadstool on top.`,
    motion: { still: "A fallen log lies where it fell." },
});
