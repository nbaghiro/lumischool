import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const KINDS = ["kerb", "step", "crate"] as const;
type Kind = (typeof KINDS)[number];

/** How high each one lifts whoever stands on it, in squares: a game stands its shooter this much higher. */
export const STEP_LIFT: Record<Kind, number> = { kerb: 0.5, step: 1, crate: 1.5 };

const kindOf = (v: string): Kind => KINDS.find((k) => k === v) ?? "step";

export const yardStep = defineDrawing<{ kind: string }>({
    id: "yardstep",
    family: "home",
    title: "Kerb, step or crate",
    group: "Props",
    about: "Something low in a yard to stand on, seen from the side: a stone kerb, a concrete step or an upturned wooden crate, each a little higher than the last.",
    params: { kind: "step" },
    settings: { kind: { kind: "one of", of: KINDS } },
    takes: [
        { label: "A kerb", params: { kind: "kerb" } },
        { label: "A step", params: { kind: "step" } },
        { label: "A crate", params: { kind: "crate" } },
    ],
    box: () => ({ w: 3, h: 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            kind = kindOf(p.kind),
            base = 2 * U,
            top = base - STEP_LIFT[kind] * U,
            ink = { strokeWidth: 1.5, roughness: 0.35 };
        if (kind === "crate") {
            pen.rect(g, 0.2 * U, top, 2.6 * U, base - top, "pencil", pen.fill("tang"), ink);
            for (const y of [0.5, 1])
                pen.line(g, 0.25 * U, top + y * U, 2.75 * U, top + y * U, "ruler", {
                    strokeWidth: 1,
                    roughness: 0.3,
                });
            pen.line(g, 0.35 * U, top + 0.1 * U, 2.65 * U, base - 0.1 * U, "ruler", {
                strokeWidth: 1,
                roughness: 0.3,
            });
        } else {
            const w = kind === "kerb" ? 2.8 : 2.6;
            pen.rect(
                g,
                ((3 - w) / 2) * U,
                top,
                w * U,
                base - top,
                "ruler",
                pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.5 }),
                ink,
            );
            pen.line(
                g,
                ((3 - w) / 2 + 0.1) * U,
                top + 0.12 * U,
                ((3 + w) / 2 - 0.1) * U,
                top + 0.12 * U,
                "ruler",
                {
                    strokeWidth: 1,
                    roughness: 0.2,
                },
            );
        }
        return { top: [1.5 * U, top, "up"] };
    },
    describe: (p) =>
        `A ${kindOf(p.kind) === "crate" ? "wooden crate turned upside down" : `low ${kindOf(p.kind) === "kerb" ? "stone kerb" : "concrete step"}`} on a yard's drive, seen from the side, flat on top for a child to stand on and throw from.`,
    motion: { still: "Something to stand on holds still under the feet on it." },
});
