import { plain } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing, STILL } from "../drawing";

const whole = (v: number) => Math.max(8, Math.min(14, Math.round(Number(v) || 10)));

export const garage = defineDrawing<{ w: number; door: Marker }>({
    id: "garage",
    family: "home",
    title: "Garage",
    group: "Structures",
    about: "A garage beside a house, seen from the front: a pale brick wall under a sloping roof, a wide up-and-over door in a soft colour, and a lamp beside it.",
    params: { w: 10, door: "sky" },
    settings: { w: { kind: "whole", min: 8, max: 14 }, door: { kind: "one of", of: MARKERS } },
    takes: [
        { label: "A blue door", params: { w: 10, door: "sky" } },
        { label: "A wide green door", params: { w: 13, door: "mint" } },
    ],
    box: (p) => ({ w: whole(p.w), h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = whole(p.w),
            w = n * U,
            eave = 2.2 * U,
            base = 7.85 * U,
            ink = { strokeWidth: 1.6, roughness: 0.4 };
        pen.polygon(
            g,
            [
                [0.1 * U, eave],
                [0.6 * U, 0.3 * U],
                [w - 0.6 * U, 0.3 * U],
                [w - 0.1 * U, eave],
            ],
            "pencil",
            pen.fill("berry", "hachure", { hachureGap: 6 }),
            ink,
        );
        pen.rect(g, 0.5 * U, eave, w - 1 * U, base - eave, "pencil", pen.fill("card"), ink);
        if (!c.paper)
            for (let row = 0; row < 7; row++) {
                const y = eave + (row + 1) * 0.75 * U;
                if (y > base - 0.3 * U) break;
                plain(c, {
                    kind: "path",
                    d: `M${0.6 * U} ${y}H${w - 0.6 * U}`,
                    fill: "none",
                    stroke: c.t["ink-soft"],
                    width: 0.6,
                    opacity: 0.35,
                });
            }
        const door = MARKERS.find((m) => m === p.door) ?? "sky";
        // the door to the left, leaving a stretch of plain wall on the right for a lamp and a board
        const x0 = 1 * U,
            x1 = Math.round(n * 0.62) * U,
            dy = 3.4 * U;
        pen.rect(g, x0, dy, x1 - x0, base - dy, "ruler", pen.fill(door, "solid"), ink);
        for (let k = 1; k < 5; k++) {
            const y = dy + ((base - dy) * k) / 5;
            pen.line(g, x0 + 0.2 * U, y, x1 - 0.2 * U, y, "ruler", {
                strokeWidth: 0.9,
                roughness: 0.2,
            });
        }
        const mid = (x0 + x1) / 2;
        pen.line(g, mid - 0.5 * U, base - 0.9 * U, mid + 0.5 * U, base - 0.9 * U, "ruler", {
            strokeWidth: 2,
            roughness: 0.2,
        });
        const lamp = x1 + 0.7 * U;
        pen.rect(g, lamp - 0.2 * U, 3.6 * U, 0.4 * U, 0.6 * U, "ruler", pen.fill("glow"), ink);
        return {
            wall: [(x1 + w) / 2, eave + 0.6 * U, "up"],
            door: [mid, dy, "up"],
            foot: [w / 2, base, "down"],
        };
    },
    describe: (p) =>
        `A garage from the front: a pale brick wall, a sloping pink roof, a wide ${MARKER_WORD[p.door]} up-and-over door with panels, and a lamp on the wall beside it.`,
    motion: { still: STILL.building },
});
