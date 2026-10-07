import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { BEAMS } from "./trussbeam";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

/** The tray's box and each tile's width, in squares: the game finds a tap's tile by these. */
export const BRIDGETRAY = { w: 6, h: 2, tile: 2 } as const;

export const bridgeTray = defineDrawing({
    id: "bridgetray",
    family: "travel",
    title: "Bridge materials tray",
    group: "Props",
    about: "The tray a bridge builder takes beams from: three tiles side by side, wood, road and rope, each with a short piece of its beam and its name, the one in use marked with a thick outline.",
    params: { chosen: "wood" },
    settings: { chosen: { kind: "one of", of: BEAMS } },
    takes: [
        { label: "Wood chosen", params: { chosen: "wood" } },
        { label: "Rope chosen", params: { chosen: "rope" } },
    ],
    box: () => ({ w: BRIDGETRAY.w, h: BRIDGETRAY.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            a: RawAnchors = {};
        for (const [i, kind] of BEAMS.entries()) {
            const x0 = i * BRIDGETRAY.tile * U,
                chosen = p.chosen === kind;
            pen.rect(
                g,
                x0 + 3,
                3,
                BRIDGETRAY.tile * U - 6,
                BRIDGETRAY.h * U - 6,
                "ruler",
                pen.fill(chosen ? "mint" : "card"),
                { strokeWidth: chosen ? 3 : 1.2, ...FIRM },
            );
            const y = 0.75 * U,
                l = x0 + 0.35 * U,
                r = x0 + 1.65 * U;
            if (kind === "wood")
                pen.rect(
                    g,
                    l,
                    y - 0.17 * U,
                    r - l,
                    0.34 * U,
                    "pencil",
                    pen.fill("tang", "hachure", { hachureGap: 4, hachureAngle: 90 }),
                    { strokeWidth: 1.3, ...FIRM },
                );
            else if (kind === "road") {
                pen.rect(g, l, y - 0.24 * U, r - l, 0.48 * U, "pencil", pen.fill("ink"), {
                    strokeWidth: 1.3,
                    ...FIRM,
                });
                pen.line(g, l + 6, y, r - 6, y, "ruler", {
                    strokeWidth: 1.5,
                    stroke: c.t.card,
                    strokeLineDash: [5, 4],
                    ...FIRM,
                });
            } else pen.line(g, l, y, r, y, "pencil", { strokeWidth: 2.4, ...FIRM });
            say(c, x0 + U, 1.62 * U, kind, 12);
            a[kind] = [x0 + U, U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A tray of three tiles for building a bridge, holding wood, road and rope, each with a short piece and its name, with ${String(p.chosen)} marked as the one in use.`,
    motion: { still: "A place a child taps to choose a material holds still." },
});
