import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

/** Water, juice, or whatever is in the container: one colour, so a level is never ambiguous. */
const WATER: Marker = "sky";

interface Vessel {
    shape: string;
    fill: number;
    label: string;
}

/**
 * One container, standing on `bottom` inside a four-square cell. It returns the inside of the
 * vessel as a function of height, because the water has to take the vessel's own width at its own
 * level: a bucket that flares outwards holds a wider slab of water near the top than near the base.
 */
interface Inside {
    top: number;
    sides: (y: number) => [number, number];
}

function vessel<G>(c: Ctx<G>, kind: string, x: number, bottom: number): Inside {
    const { pen, g } = c,
        mid = x + 2 * U;
    if (kind === "bottle") {
        const top = bottom - 3 * U,
            neck = bottom - 4.6 * U,
            half = 1.05 * U,
            nHalf = 0.34 * U;
        pen.path(
            g,
            `M${mid - nHalf} ${neck}V${neck + 18}L${mid - half} ${top}V${bottom - 12}` +
                `Q${mid - half} ${bottom} ${mid - half + 12} ${bottom}H${mid + half - 12}Q${mid + half} ${bottom} ${mid + half} ${bottom - 12}` +
                `V${top}L${mid + nHalf} ${neck + 18}V${neck}Z`,
            "ruler",
            null,
            { strokeWidth: 2.2 },
        );
        pen.line(g, mid - nHalf - 3, neck + 7, mid + nHalf + 3, neck + 7, "ruler", {
            strokeWidth: 1.4,
        });
        return {
            top: neck + 6,
            sides: (y) => {
                if (y >= top) return [mid - half + 3, mid + half - 3];
                const t = Math.max(0, (top - y) / (top - neck - 18));
                const w = half - (half - nHalf) * Math.min(1, t);
                return [mid - w + 2, mid + w - 2];
            },
        };
    }
    if (kind === "cup") {
        const top = bottom - 2.6 * U,
            half = 0.95 * U,
            foot = 0.62 * U;
        pen.path(
            g,
            `M${mid - half} ${top}L${mid - foot} ${bottom}H${mid + foot}L${mid + half} ${top}`,
            "ruler",
            null,
            { strokeWidth: 2.2 },
        );
        pen.line(g, mid - half, top, mid + half, top, "ruler", { strokeWidth: 1.4 });
        return {
            top,
            sides: (y) => {
                const t = (bottom - y) / (bottom - top),
                    w = foot + (half - foot) * t;
                return [mid - w + 3, mid + w - 3];
            },
        };
    }
    if (kind === "bucket") {
        const top = bottom - 3.4 * U,
            half = 1.7 * U,
            foot = 1.15 * U;
        pen.path(
            g,
            `M${mid - half} ${top}L${mid - foot} ${bottom}H${mid + foot}L${mid + half} ${top}Z`,
            "ruler",
            null,
            { strokeWidth: 2.2 },
        );
        pen.arc(g, mid, top, half * 2, 1.8 * U, Math.PI, 2 * Math.PI, "ruler", {
            strokeWidth: 1.6,
        });
        return {
            top,
            sides: (y) => {
                const t = (bottom - y) / (bottom - top),
                    w = foot + (half - foot) * t;
                return [mid - w + 3, mid + w - 3];
            },
        };
    }
    // A plain jar: straight sides and a rim, the shape the others get compared against.
    const top = bottom - 4.2 * U,
        half = 1.15 * U;
    pen.path(
        g,
        `M${mid - half} ${top}V${bottom - 12}Q${mid - half} ${bottom} ${mid - half + 12} ${bottom}` +
            `H${mid + half - 12}Q${mid + half} ${bottom} ${mid + half} ${bottom - 12}V${top}`,
        "ruler",
        null,
        { strokeWidth: 2.2 },
    );
    pen.line(g, mid - half - 5, top, mid + half + 5, top, "ruler", { strokeWidth: 1.8 });
    return { top, sides: () => [mid - half + 3, mid + half - 3] };
}

export const containers = defineDrawing({
    id: "containers",
    family: "measuring",
    title: "Containers",
    group: "Props",
    about: "Vessels of different shapes with water in them, for the question that comes before millilitres: which holds more, and can you tell from the height of the water alone.",
    params: {
        items: [
            { shape: "jar", fill: 0.6, label: "A" },
            { shape: "bottle", fill: 0.75, label: "B" },
            { shape: "cup", fill: 0.4, label: "C" },
        ] as Vessel[],
    },
    settings: { items: { kind: "fixed" } },
    takes: [
        {
            label: "Three shapes",
            params: {
                items: [
                    { shape: "jar", fill: 0.6, label: "A" },
                    { shape: "bottle", fill: 0.75, label: "B" },
                    { shape: "cup", fill: 0.4, label: "C" },
                ],
            },
        },
        {
            label: "Same height, different width",
            params: {
                items: [
                    { shape: "jar", fill: 0.5, label: "A" },
                    { shape: "bucket", fill: 0.5, label: "B" },
                ],
            },
        },
        {
            label: "A full bucket",
            params: {
                items: [
                    { shape: "bucket", fill: 1, label: "" },
                    { shape: "cup", fill: 0.9, label: "" },
                ],
            },
        },
        {
            label: "Four to order",
            params: {
                items: [
                    { shape: "cup", fill: 0.8, label: "1" },
                    { shape: "jar", fill: 0.3, label: "2" },
                    { shape: "bottle", fill: 0.55, label: "3" },
                    { shape: "bucket", fill: 0.25, label: "4" },
                ],
            },
        },
    ],
    box: (p) => ({ w: p.items.length * 4 + 1, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            bottom = 7 * U,
            a: RawAnchors = {};
        p.items.forEach((item, i) => {
            const x = U / 2 + i * 4 * U,
                mid = x + 2 * U;
            const v = vessel(c, item.shape, x, bottom);
            const level = bottom - (bottom - v.top) * Math.max(0, Math.min(1, item.fill));
            if (item.fill > 0) {
                // Ten slices down the vessel, so the water follows a neck or a flare instead of cutting it.
                const steps = 10,
                    left: string[] = [],
                    right: string[] = [];
                for (let k = 0; k <= steps; k++) {
                    const y = level + ((bottom - 3 - level) * k) / steps,
                        [l, r] = v.sides(y);
                    left.push(`${l} ${y}`);
                    right.unshift(`${r} ${y}`);
                }
                pen.path(
                    g,
                    `M${left.join("L")}L${right.join("L")}Z`,
                    "ruler",
                    pen.fill(WATER, "solid", { hachureGap: 6 }),
                    { strokeWidth: 0 },
                );
                const [l, r] = v.sides(level);
                pen.line(g, l, level, r, level, "ruler", { strokeWidth: 1.8 });
            }
            if (item.label) say(c, mid, 8.3 * U, item.label, 17);
            a[`item(${i})`] = [mid, v.top, "up"];
            a[`level(${i})`] = [v.sides(level)[1], level, "right"];
        });
        return a;
    },
    describe: () =>
        "Containers of different shapes standing side by side, a jar, a bottle, a cup or a jug, each part filled with blue water and lettered underneath.",
    reads: true,
});
