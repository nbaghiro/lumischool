import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { wash } from "../outdoors/wash";

const KINDS = ["boards", "tiles"] as const;
const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

export const floorBoards = defineDrawing<{ kind: string; width: number; height: number }>({
    id: "floorboards",
    family: "home",
    title: "Floor",
    group: "Structures",
    about: "A stretch of a room's floor seen from above, quietly washed so what stands on it reads first: long wooden boards with their joins staggered, or square kitchen tiles.",
    params: { kind: "boards", width: 20, height: 20 },
    settings: {
        kind: { kind: "one of", of: KINDS },
        width: { kind: "whole", min: 4, max: 20 },
        height: { kind: "whole", min: 4, max: 20 },
    },
    takes: [
        { label: "Wooden boards", params: { kind: "boards", width: 12, height: 8 } },
        { label: "Kitchen tiles", params: { kind: "tiles", width: 12, height: 8 } },
    ],
    box: (p) => ({ w: p.width, h: p.height }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = p.width * U,
            h = p.height * U,
            soft = { strokeWidth: 1, stroke: c.t.grid, ...FIRM };
        if (p.kind === "tiles") {
            wash(c, `M0 0H${w}V${h}H0Z`, "sky", 0.12, false);
            for (let x = 2; x < p.width; x += 2) pen.line(g, x * U, 0, x * U, h, "ruler", soft);
            for (let y = 2; y < p.height; y += 2) pen.line(g, 0, y * U, w, y * U, "ruler", soft);
            return { middle: [w / 2, h / 2, "up"] };
        }
        wash(c, `M0 0H${w}V${h}H0Z`, "tang", 0.14, false);
        // boards run across, each row's joins set half a board along from the row above
        for (let y = 1.5, row = 0; y < p.height; y += 1.5, row++) {
            pen.line(g, 0, y * U, w, y * U, "ruler", soft);
            for (let x = row % 2 ? 3 : 6; x < p.width; x += 6)
                pen.line(g, x * U, (y - 1.5) * U, x * U, y * U, "ruler", soft);
        }
        return { middle: [w / 2, h / 2, "up"] };
    },
    describe: (p) =>
        p.kind === "tiles"
            ? "A kitchen floor seen from above, washed pale blue and ruled into even square tiles, a quiet ground for whatever stands on it."
            : "A wooden floor seen from above, long pale boards running across with their joins staggered from row to row, a quiet ground for a room.",
    motion: { still: "A floor is the ground of a room and never moves." },
});
