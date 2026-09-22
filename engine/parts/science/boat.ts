import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, patch, soft } from "../lettering";

/** A loaded boat as drawn: its side in squares, its blocks, how deep it sits (one square lower a block) and whether the water comes over. */
export const boatOf = (p: {
    cargo: number;
    side: number;
    sits: number;
}): { side: number; cargo: number; depth: number; sunk: boolean } => {
    const side = Math.max(3, Math.min(6, Math.round(p.side))),
        cargo = Math.max(0, Math.min(6, Math.round(p.cargo)));
    const depth = Math.max(0, Math.round(p.sits)) + cargo;
    return { side, cargo, depth, sunk: depth >= side };
};

export const boat = defineDrawing({
    id: "boat",
    family: "science",
    title: "Loading a boat",
    group: "Structures",
    about: "A box-shaped boat floating in a tank with blocks loaded into it and its side marked off in squares. The water pushes up on the boat, and each block makes it sit one square lower before the push balances its weight again; when the water would come over the side, it sinks to the bottom. How deep it sits and whether it sinks are worked out from the settings, so the drawing is the prediction's answer.",
    params: { cargo: 2, side: 5, sits: 1, arrows: 0 },
    settings: {
        cargo: { kind: "whole", min: 0, max: 6 },
        side: { kind: "whole", min: 3, max: 6 },
        sits: { kind: "whole", min: 0, max: 3 },
        arrows: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Two blocks aboard", params: { cargo: 2, side: 5, sits: 1, arrows: 0 } },
        { label: "The push of the water", params: { cargo: 3, side: 5, sits: 1, arrows: 1 } },
        { label: "One block too many", params: { cargo: 4, side: 5, sits: 1, arrows: 0 } },
    ],
    box: () => ({ w: 16, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            { side, cargo, depth, sunk } = boatOf(p);
        const water = 6 * U,
            bed = 13 * U,
            x0 = 4.5 * U,
            w = 7 * U;
        const bottom = sunk ? bed : water + depth * U,
            hullTop = bottom - side * U;
        pen.rect(
            g,
            0.6 * U,
            water,
            14.8 * U,
            bed - water,
            "ruler",
            pen.fill("sky", "solid", { hachureGap: 7 }),
            { strokeWidth: 0 },
        );
        pen.path(g, `M${0.6 * U} ${1.2 * U}V${bed}H${15.4 * U}V${1.2 * U}`, "ruler", null, {
            strokeWidth: 2.6,
        });
        // the hull, marked a square at a time from its bottom
        pen.rect(g, x0, hullTop, w, side * U, "ruler", pen.fill("card"), { strokeWidth: 2.4 });
        for (let k = 1; k < side; k++) {
            pen.line(g, x0, bottom - k * U, x0 + 0.5 * U, bottom - k * U, "ruler", {
                strokeWidth: 1.2,
            });
            if (!sunk) {
                patch(c, x0 - 0.55 * U, bottom - k * U - 1, 14, 14);
                soft(c, x0 - 0.55 * U, bottom - k * U + 4, String(k), 11);
            }
        }
        for (let i = 0; i < cargo; i++) {
            const bx = x0 + 0.5 * U + (i % 6) * U,
                by = bottom - U - Math.floor(i / 6) * U;
            pen.rect(g, bx, by, 0.9 * U, 0.9 * U, "ruler", pen.fill("tang"), { strokeWidth: 1.4 });
        }
        // the surface is drawn over the hull, so a boat that sits deep is plainly in the water
        pen.line(g, 0.6 * U, water, 15.4 * U, water, "ruler", { strokeWidth: 2 });
        if (!sunk && p.arrows > 0) {
            // the weight pulls down from inside the boat and the water pushes up on its bottom, equal while it floats
            const mx = x0 + w - 1.3 * U,
                len = 2 * U;
            pen.line(g, mx, hullTop + 0.5 * U, mx, hullTop + 0.5 * U + len - 10, "ruler", {
                strokeWidth: 3,
            });
            pen.polygon(
                g,
                [
                    [mx, hullTop + 0.5 * U + len],
                    [mx - 8, hullTop + 0.5 * U + len - 13],
                    [mx + 8, hullTop + 0.5 * U + len - 13],
                ],
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 1 },
            );
            pen.line(g, mx, bottom + len, mx, bottom + 10, "ruler", { strokeWidth: 3 });
            pen.polygon(
                g,
                [
                    [mx, bottom],
                    [mx - 8, bottom + 13],
                    [mx + 8, bottom + 13],
                ],
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 1 },
            );
            cap(c, mx - 0.4 * U, hullTop + 0.5 * U + len / 2 + 4, "weight", 9, "end");
            patch(c, mx + 1.6 * U, bottom + len / 2, 58, 14);
            cap(c, mx + 0.4 * U, bottom + len / 2 + 4, "push up", 9, "start");
        }
        if (sunk) cap(c, x0 + w / 2, water - 0.5 * U, "sunk", 11);
        a.boat = [x0 + w / 2, hullTop, "up"];
        return a;
    },
    describe: (p) =>
        `A box shaped boat floating in a tank of water with blocks loaded into it, its side marked off in squares${p.arrows > 0 ? " and the water's push drawn as an arrow" : ""}.`,
    reads: true,
});
