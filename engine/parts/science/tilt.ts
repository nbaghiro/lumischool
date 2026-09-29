import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, patch, say, soft } from "../lettering";

/** How far north of the equator the sun is overhead: the tilt in June (season 0), minus it in December (1). */
export const sunOverhead = (season: number, tilt: number): number =>
    Math.round(season) === 1 ? -tilt : tilt;

/**
 * Whether a place at a latitude has the sun all day, all night, or a day and a night, as the Earth
 * turns once with the sun overhead at `over` degrees north: the sun never sets where the whole circle
 * of latitude stays on the lit side. "edge" is a place whose circle just touches the line between
 * day and night, where the sun grazes the horizon at midnight or noon.
 */
export function sunAt(
    lat: number,
    over: number,
): "all day" | "all night" | "day and night" | "edge" {
    const q = Math.tan((lat * Math.PI) / 180) * Math.tan((over * Math.PI) / 180);
    if (Math.abs(lat) >= 90) return over === 0 ? "edge" : lat * over > 0 ? "all day" : "all night";
    if (Math.abs(Math.abs(q) - 1) < 1e-9) return "edge";
    return q > 1 ? "all day" : q < -1 ? "all night" : "day and night";
}

/** How high the sun stands above the horizon at noon, in degrees; 0 or less is below it all day. */
export const noonHeight = (lat: number, over: number): number => 90 - Math.abs(lat - over);

/** How high the sun stands above the horizon at midnight, in degrees; 0 or less is below it. */
export const midnightHeight = (lat: number, over: number): number => Math.abs(lat + over) - 90;

const CX = 14 * U;
const CY = 7.2 * U;
const R = 5.2 * U;

export const tilt = defineDrawing({
    id: "tilt",
    family: "science",
    title: "The tilted Earth",
    group: "Structures",
    about: "The Earth seen side on, with the sun's light coming from the left, so its left half is in day and its right half in night. Its axis leans 23.5 degrees (`tilt`) towards the sun in June (`season` 0) and away from it in December (1). Lettered places sit on their circles of latitude, drawn edge on as dashed lines and marked where each place is at noon; as the Earth turns, a place goes round its circle, so a circle wholly on the lit side has the sun all day and one wholly in the night has no sun at all. The sun is overhead at the latitude the tilt says, so its height at noon is 90 degrees less the difference between the two. `circles` draws the polar circles, where the sun first stays up all day, and `names` writes each place's latitude.",
    params: { places: [78, 45, 0], season: 0, tilt: 23.5, circles: 1, names: 1 },
    settings: {
        places: { kind: "numbers", min: -90, max: 90, most: 3 },
        season: { kind: "whole", min: 0, max: 1 },
        tilt: { kind: "number", min: 0, max: 30, step: 0.5 },
        circles: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "June, the north leaning to the sun",
            params: { places: [78, 45, 0], season: 0, tilt: 23.5, circles: 1, names: 1 },
        },
        {
            label: "December, the north leaning away",
            params: { places: [78, 45, 0], season: 1, tilt: 23.5, circles: 1, names: 1 },
        },
        {
            label: "No tilt at all",
            params: { places: [70, 30], season: 0, tilt: 0, circles: 0, names: 1 },
        },
        {
            label: "North and south, unnamed",
            params: { places: [70, 20, -70], season: 0, tilt: 23.5, circles: 0, names: 0 },
        },
    ],
    box: () => ({ w: 24, h: 15 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            lean = (sunOverhead(p.season, p.tilt) * Math.PI) / 180;
        // the axis's north end, leaning left towards the sun in June; ex is along the equator, sunward
        const nx = -Math.sin(lean),
            ny = -Math.cos(lean),
            ex = -Math.cos(lean),
            ey = Math.sin(lean);
        const at = (lat: number, side: number): [number, number] => {
            const t = (lat * Math.PI) / 180;
            return [
                CX + R * (Math.sin(t) * nx + side * Math.cos(t) * ex),
                CY + R * (Math.sin(t) * ny + side * Math.cos(t) * ey),
            ];
        };
        for (const y of [3, 6, 9, 12])
            pen.arrow(g, [0.3 * U, y * U], [4.4 * U, y * U], c.t.glow, 0);
        soft(c, 2.3 * U, 14.4 * U, "sunlight", 12);
        pen.circle(
            g,
            CX,
            CY,
            2 * R,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.7 }),
            { strokeWidth: 1.8 },
        );
        pen.path(
            g,
            `M${CX} ${CY - R}A${R} ${R} 0 0 0 ${CX} ${CY + R}Z`,
            "ruler",
            pen.fill(c.paper ? "card" : "sky"),
            { strokeWidth: 1.8 },
        );
        cap(c, CX - 4.5 * U, 13.6 * U, "day", 11);
        cap(c, CX + 4.5 * U, 13.6 * U, "night", 11);
        const line = (lat: number, dash: number[], w: number) => {
            const [x0, y0] = at(lat, 1),
                [x1, y1] = at(lat, -1);
            pen.line(g, x0, y0, x1, y1, "ruler", {
                strokeWidth: w,
                stroke: c.t["ink-soft"],
                strokeLineDash: dash,
            });
        };
        line(0, [8, 4], 1.4);
        if (p.circles > 0)
            for (const lat of [90 - Math.abs(p.tilt), Math.abs(p.tilt) - 90])
                line(lat, [2, 4], 1.4);
        // the axis, through both poles and out beyond them
        pen.line(
            g,
            CX - nx * (R + 1.1 * U),
            CY - ny * (R + 1.1 * U),
            CX + nx * (R + 1.1 * U),
            CY + ny * (R + 1.1 * U),
            "ruler",
            { strokeWidth: 2.2 },
        );
        say(c, CX + nx * (R + 1.7 * U), CY + ny * (R + 1.7 * U) + 6, "N", 15);
        say(c, CX - nx * (R + 1.7 * U), CY - ny * (R + 1.7 * U) + 6, "S", 15);
        a.north = [CX + nx * R, CY + ny * R, "up"];
        a.south = [CX - nx * R, CY - ny * R, "down"];
        p.places.slice(0, 3).forEach((lat, i) => {
            const clamped = Math.max(-90, Math.min(90, lat));
            line(clamped, [5, 4], 1.6);
            const [x, y] = at(clamped, 1);
            pen.circle(g, x, y, 0.55 * U, "ruler", pen.fill("tang"), { strokeWidth: 1.4 });
            const t = (clamped * Math.PI) / 180,
                ox = Math.sin(t) * nx + Math.cos(t) * ex,
                oy = Math.sin(t) * ny + Math.cos(t) * ey,
                lx = CX + (R + 1.1 * U) * ox,
                ly = CY + (R + 1.1 * U) * oy;
            patch(c, lx, ly, 18, 18);
            say(c, lx, ly + 6, "ABC"[i] ?? "?", 16);
            if (p.names > 0) {
                const words =
                    `${Math.abs(clamped)}° ${clamped > 0 ? "N" : clamped < 0 ? "S" : ""}`.trim();
                soft(c, lx - 0.9 * U, ly + 5, words, 11, "end");
            }
            a[`place(${i})`] = [x, y, oy < 0 ? "up" : "down"];
        });
        a.earth = [CX, CY - R, "up"];
        a.sun = [2.3 * U, 3 * U, "up"];
        return a;
    },
    describe: (p) =>
        `The Earth side on in ${Math.round(p.season) === 1 ? "December" : "June"}, lit from the left, its axis through the poles and ${p.places.length} lettered places on their dashed circles of latitude.`,
    reads: true,
});
