import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** The cue's length in squares; its tip is at the right-hand end of its box, halfway down. */
export const POOLCUE = { w: 12, h: 1 } as const;

export const poolCue = defineDrawing({
    id: "poolcue",
    family: "sport",
    title: "Pool cue",
    group: "Props",
    about: "A pool cue lying flat, pointing right: a thick wooden butt with a band near the end, tapering to a thin shaft and a small pale tip at the right that strikes the ball.",
    params: { chalk: true },
    settings: { chalk: { kind: "flag" } },
    takes: [
        { label: "With a chalked tip", params: { chalk: true } },
        { label: "A bare tip", params: { chalk: false } },
    ],
    box: () => ({ ...POOLCUE }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = POOLCUE.w * U,
            y = 0.5 * U;
        pen.path(
            g,
            `M${0.1 * U} ${y - 0.32 * U}L${w - 0.5 * U} ${y - 0.1 * U}L${w - 0.5 * U} ${y + 0.1 * U}L${0.1 * U} ${y + 0.32 * U}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.3, roughness: 0.3 },
        );
        pen.rect(g, 0.1 * U, y - 0.32 * U, 3 * U, 0.64 * U, "pencil", pen.fill("ink-soft"), {
            strokeWidth: 1,
            roughness: 0.2,
        });
        pen.line(g, 3.4 * U, y - 0.27 * U, 3.4 * U, y + 0.27 * U, "ruler", { strokeWidth: 1.4 });
        pen.rect(
            g,
            w - 0.5 * U,
            y - 0.12 * U,
            0.42 * U,
            0.24 * U,
            "ruler",
            pen.fill(p.chalk ? "sky" : "card"),
            {
                strokeWidth: 0.9,
                disableMultiStroke: true,
            },
        );
        return { tip: [w - 0.08 * U, y, "right"] };
    },
    describe: (p) =>
        p.chalk
            ? "A long wooden pool cue lying flat, thick at the butt and tapering to a thin shaft with a small blue chalked tip at the right."
            : "A long wooden pool cue lying flat, thick at the butt with a dark band and tapering to a thin shaft with a pale tip.",
    motion: { still: "A cue lies still until the game draws it back to strike." },
});
