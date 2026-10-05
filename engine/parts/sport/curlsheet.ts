import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash } from "../outdoors/wash";

/** The house's rings from the outside in, in squares: a stone touching each scores 1, 2, 3 and 4. */
const RINGS = [3.6, 2.6, 1.6, 0.7] as const;

export const curlSheet = defineDrawing<{
    length: number;
    width: number;
    tee: number;
    hog: number;
    hack: number;
}>({
    id: "curlsheet",
    family: "sport",
    title: "Curling sheet",
    group: "Structures",
    about: "A frozen pond laid out for curling, seen from above: pale ice with skate scratches and a little frost, the house's four rings painted under it, the tee, hog and back lines, and the hack a stone is thrown from.",
    params: { length: 48, width: 12, tee: 42, hog: 31, hack: 3 },
    settings: {
        length: { kind: "number", min: 20, max: 60, step: 0.1 },
        width: { kind: "number", min: 8, max: 16, step: 0.5 },
        tee: { kind: "number", min: 10, max: 56, step: 0.5 },
        hog: { kind: "number", min: 6, max: 50, step: 0.5 },
        hack: { kind: "number", min: 1, max: 10, step: 0.5 },
    },
    takes: [
        { label: "A full sheet", params: { length: 36, width: 12, tee: 31, hog: 23, hack: 3 } },
        { label: "A short sheet", params: { length: 26, width: 10, tee: 20, hog: 12, hack: 2 } },
    ],
    box: (p) => ({ w: p.length, h: p.width }),
    draw: (c, p) => {
        const w = p.length * U,
            h = p.width * U,
            m = 0.15 * U,
            mid = h / 2,
            tx = p.tee * U;
        if (!c.paper) {
            plain(c, {
                kind: "rect",
                x: m,
                y: m,
                w: w - 2 * m,
                h: h - 2 * m,
                fill: c.t.card,
                opacity: 0.55,
            });
            plain(c, {
                kind: "rect",
                x: m,
                y: m,
                w: w - 2 * m,
                h: h - 2 * m,
                fill: c.t.sky,
                opacity: 0.07,
            });
            // the pebble sprinkled on curling ice, a fine grain only seen up close
            for (let i = 0; i < Math.round(p.length * p.width * 0.9); i++)
                plain(c, {
                    kind: "circle",
                    cx: (0.4 + hash(i, 31) * (p.length - 0.8)) * U,
                    cy: (0.4 + hash(i, 37) * (p.width - 0.8)) * U,
                    r: 0.035 * U,
                    fill: c.t.sky,
                    opacity: 0.35,
                });
            // the house painted under the ice, the outer ring blue and the third ring pink, the others white
            const tints = [c.t.sky, c.t.card, c.t.berry, c.t.card] as const;
            const strength = [0.38, 0.9, 0.32, 0.95] as const;
            RINGS.forEach((r, i) =>
                plain(c, {
                    kind: "circle",
                    cx: tx,
                    cy: mid,
                    r: r * U,
                    fill: tints[i],
                    opacity: strength[i],
                }),
            );
        }
        RINGS.forEach((r) =>
            plain(c, {
                kind: "circle",
                cx: tx,
                cy: mid,
                r: r * U,
                fill: "none",
                stroke: c.paper ? c.t.ink : c.t.sky,
                width: 1.4,
                opacity: c.paper ? 1 : 0.9,
            }),
        );
        // a glaze of ice over the paint, the light catching it towards the top of the house
        if (!c.paper)
            plain(c, {
                kind: "path",
                d: `M${tx - RINGS[0] * 0.75 * U} ${mid - RINGS[0] * 0.35 * U}Q${tx} ${mid - RINGS[0] * 0.95 * U} ${tx + RINGS[0] * 0.75 * U} ${mid - RINGS[0] * 0.35 * U}`,
                fill: "none",
                stroke: c.t.card,
                width: 3,
                cap: "round",
                opacity: 0.7,
            });
        // the painted lines: the centre line along the pond, and the tee, hog and back lines across it
        const across = (x: number, weight: number, opacity: number, dash?: string) =>
            plain(c, {
                kind: "path",
                d: `M${x} ${m * 2}V${h - m * 2}`,
                fill: "none",
                stroke: c.paper ? c.t.ink : c.t["ink-soft"],
                width: weight,
                opacity,
                ...(dash ? { dash } : {}),
            });
        plain(c, {
            kind: "path",
            d: `M${p.hack * U} ${mid}H${w - m * 2}`,
            fill: "none",
            stroke: c.paper ? c.t.ink : c.t["ink-soft"],
            width: 0.8,
            opacity: 0.35,
        });
        across(tx, 0.8, 0.4);
        across(p.hog * U, 1.6, 0.5);
        across((p.tee + RINGS[0]) * U, 0.8, 0.4, "5 4");
        // the hack, two rubber footholds the thrower pushes off from
        for (const dy of [-0.35, 0.35])
            c.pen.rect(
                c.g,
                (p.hack - 1.4) * U,
                mid + (dy - 0.18) * U,
                0.6 * U,
                0.36 * U,
                "ruler",
                c.pen.fill("ink-soft", "solid"),
                {
                    strokeWidth: 1,
                    roughness: 0.2,
                },
            );
        // skate scratches and frost, faint and few, kept off the house so its rings read clean
        if (!c.paper) {
            for (let i = 0; i < Math.round(p.length / 2.2); i++) {
                const x = (1 + hash(i, 3) * (p.length - 2)) * U,
                    y = (0.8 + hash(i, 7) * (p.width - 1.6)) * U;
                if (Math.hypot(x - tx, y - mid) < (RINGS[0] + 0.6) * U) continue;
                const len = (1.2 + hash(i, 11) * 2.4) * U,
                    bow = (hash(i, 13) - 0.5) * 0.9 * U;
                plain(c, {
                    kind: "path",
                    d: `M${x} ${y}Q${x + len / 2} ${y + bow} ${x + len} ${y + bow * 0.4}`,
                    fill: "none",
                    stroke: c.t.sky,
                    width: 0.8,
                    cap: "round",
                    opacity: 0.35,
                });
            }
            for (let i = 0; i < Math.round(p.length / 3); i++) {
                const x = (0.6 + hash(i, 17) * (p.length - 1.2)) * U,
                    y =
                        (hash(i, 19) < 0.5
                            ? 0.5 + hash(i, 23) * 1.4
                            : p.width - 0.5 - hash(i, 23) * 1.4) * U,
                    r = (0.12 + hash(i, 29) * 0.12) * U;
                plain(c, {
                    kind: "path",
                    d: `M${x - r} ${y}H${x + r}M${x} ${y - r}V${y + r}`,
                    fill: "none",
                    stroke: c.t.sky,
                    width: 0.7,
                    cap: "round",
                    opacity: 0.55,
                });
            }
        }
        // the sheet's edges: drawn whole on paper, and painted as two soft side lines on the pond
        if (c.paper)
            c.pen.rect(c.g, m, m, w - 2 * m, h - 2 * m, "ruler", null, {
                strokeWidth: 1.4,
                stroke: c.t.ink,
                roughness: 0.25,
            });
        else
            for (const y of [m, h - m])
                plain(c, {
                    kind: "path",
                    d: `M${m} ${y}H${w - m}`,
                    fill: "none",
                    stroke: c.t.sky,
                    width: 1.2,
                    cap: "round",
                    opacity: 0.6,
                });
        return { button: [tx, mid, "up"], hack: [p.hack * U, mid, "left"] };
    },
    describe: (p) =>
        `A frozen pond laid out for curling, seen from above, ${Math.round(p.length)} squares long: pale ice, four painted rings at the far end, the hog and tee lines, and a hack.`,
    motion: { still: "The ice and its painted lines never move." },
});
