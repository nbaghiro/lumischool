import { plain, letter, type Ctx, type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

/** The marks a map's key can explain, one to a row. */
const KEY_MARKS = [
    "path",
    "road",
    "rails",
    "river",
    "sea",
    "walked",
    "ahead",
    "stamp",
    "lantern",
    "woods",
    "hills",
    "peaks",
    "bridge",
    "town",
] as const;

type KeyMark = (typeof KEY_MARKS)[number];

function keyMark<G>(c: Ctx<G>, m: KeyMark, x0: number, x1: number, y: number): void {
    const { pen, g } = c,
        soft2 = c.t["ink-soft"],
        mid = (x0 + x1) / 2;
    const band = (marker: Marker, w: number, o: number) =>
        plain(c, {
            kind: "path",
            d: `M${x0} ${y}L${x1} ${y}`,
            stroke: c.paper ? c.t.card : c.t[marker],
            width: w,
            cap: "round",
            opacity: o,
        });
    switch (m) {
        case "path":
            band("tang", 9, 0.35);
            pen.line(g, x0, y, x1, y, "pencil", { strokeWidth: 1.6, strokeLineDash: [6, 5] });
            break;
        case "road":
            band("glow", 13, 0.5);
            for (const s of [-1, 1])
                pen.line(g, x0, y + s * 5, x1, y + s * 5, "pencil", { strokeWidth: 1.4 });
            break;
        case "rails":
            for (let x = x0 + 3; x < x1; x += 7)
                pen.line(g, x, y - 6, x, y + 6, "ruler", { strokeWidth: 1.4, stroke: soft2 });
            for (const s of [-1, 1])
                pen.line(g, x0, y + s * 3, x1, y + s * 3, "ruler", { strokeWidth: 1.4 });
            break;
        case "river":
            band("sky", 12, 0.7);
            pen.curve(
                g,
                [
                    [x0, y],
                    [mid - 8, y - 4],
                    [mid + 8, y + 4],
                    [x1, y],
                ],
                "pencil",
                { strokeWidth: 1.3 },
            );
            break;
        case "sea":
            band("sky", 12, 0.35);
            pen.line(g, x0, y, x1, y, "pencil", { strokeWidth: 2, strokeLineDash: [2, 7] });
            break;
        case "walked":
            band("glow", 16, 0.8);
            pen.line(g, x0, y, x1, y, "pencil", { strokeWidth: 1.8, strokeLineDash: [6, 5] });
            break;
        case "ahead":
            pen.line(g, x0, y, x1, y, "pencil", {
                strokeWidth: 1.4,
                strokeLineDash: [5, 5],
                stroke: soft2,
            });
            break;
        case "stamp":
            pen.circle(g, mid, y, 26, "ruler", pen.fill("card"), {
                strokeWidth: 2,
                stroke: c.t.berry,
            });
            pen.circle(g, mid, y, 18, "ruler", null, { strokeWidth: 1, stroke: c.t.berry });
            break;
        case "lantern":
            if (!c.paper)
                plain(c, {
                    kind: "circle",
                    cx: mid,
                    cy: y - 4,
                    r: 13,
                    fill: c.t.glow,
                    opacity: 0.45,
                });
            pen.line(g, mid, y - 2, mid, y + 12, "pencil", { strokeWidth: 1.5 });
            pen.rect(g, mid - 5, y - 11, 10, 11, "pencil", pen.fill("glow"), { strokeWidth: 1.2 });
            break;
        case "woods":
            for (const dx of [-13, 0, 13]) {
                pen.line(g, mid + dx, y + 9, mid + dx, y + 3, "pencil", { strokeWidth: 1.1 });
                pen.circle(g, mid + dx, y - 2, 13, "pencil", pen.fill("mint"), {
                    strokeWidth: 1.1,
                });
            }
            break;
        case "hills":
            for (const dx of [-10, 9])
                pen.arc(g, mid + dx, y + 8, 24, 26, Math.PI, Math.PI * 2, "pencil", {
                    strokeWidth: 1.4,
                });
            break;
        case "peaks":
            // the hand the map's own ranges are drawn in (engine/parts/outdoors/peaks.ts): a pencil
            // ridge with the paper showing through, a zigzag under the snow, and the blue shadow on
            // the side away from the light
            for (const dx of [-9, 8]) {
                const x = mid + dx,
                    top = y - 9,
                    snow = top + 6.6;
                pen.path(
                    g,
                    `M${x - 12} ${y + 9}L${x + 1} ${top}L${x + 12} ${y + 9}`,
                    "pencil",
                    null,
                    {
                        strokeWidth: 1.3,
                        preserveVertices: true,
                    },
                );
                pen.path(
                    g,
                    `M${x - 3.4} ${snow}L${x - 1.2} ${snow + 1.3}L${x + 1} ${snow - 0.4}L${x + 3.2} ${snow + 1.3}L${x + 5.4} ${snow}`,
                    "pencil",
                    null,
                    { strokeWidth: 0.9, preserveVertices: true },
                );
                pen.polygon(
                    g,
                    [
                        [x + 1, top],
                        [x + 5.4, snow],
                        [x + 1.6, snow],
                    ],
                    "pencil",
                    pen.fill("sky"),
                    { stroke: "none", roughness: 0.8 },
                );
            }
            break;
        case "bridge":
            band("sky", 9, 0.6);
            pen.path(
                g,
                `M${mid - 16} ${y + 6}L${mid - 16} ${y - 4}L${mid + 16} ${y - 4}L${mid + 16} ${y + 6}Q${mid} ${y - 8} ${mid - 16} ${y + 6}Z`,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.3 },
            );
            break;
        case "town":
            for (const dx of [-9, 8]) {
                pen.rect(g, mid + dx - 6, y - 2, 12, 11, "pencil", pen.fill("card"), {
                    strokeWidth: 1.1,
                });
                pen.polygon(
                    g,
                    [
                        [mid + dx - 8, y - 2],
                        [mid + dx, y - 10],
                        [mid + dx + 8, y - 2],
                    ],
                    "pencil",
                    pen.fill("berry"),
                    { strokeWidth: 1.1 },
                );
            }
            break;
    }
}

export const mapKey = defineDrawing({
    id: "mapkey",
    family: "travel",
    title: "Map key",
    group: "Marks",
    about: "The key to a map: a card with one row for each kind of mark and what it means, from a footpath, a road and the railway to a river, the way across the sea, woods, hills and mountains. Reading a mark off the key is where reading a map starts.",
    params: {
        title: "Key",
        marks: ["path", "road", "rails", "river", "sea"] as string[],
        labels: ["Footpath", "Road", "Railway", "River", "Across the sea"] as string[],
    },
    settings: {
        title: { kind: "text", most: 12 },
        marks: { kind: "words", most: 10, of: KEY_MARKS },
        labels: { kind: "words", most: 10 },
    },
    takes: [
        {
            label: "Five ways to travel",
            params: {
                title: "Key",
                marks: ["path", "road", "rails", "river", "sea"],
                labels: ["Footpath", "Road", "Railway", "River", "Across the sea"],
            },
        },
        {
            label: "Where you have been",
            params: {
                title: "Key",
                marks: ["walked", "ahead", "stamp", "lantern"],
                labels: [
                    "The way you came",
                    "Still to walk",
                    "You have been here",
                    "A world finished",
                ],
            },
        },
        {
            label: "The land",
            params: {
                title: "On the map",
                marks: ["woods", "hills", "peaks", "bridge", "town"],
                labels: ["Woods", "Hills", "Mountains", "Bridge", "Town"],
            },
        },
    ],
    box: (p) => ({ w: 12, h: 3 + Math.max(1, Math.min(10, p.marks.length)) * 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(1, Math.min(10, p.marks.length)),
            W = 12 * U,
            H = (3 + n * 2) * U,
            a: RawAnchors = {};
        pen.rect(g, 0.3 * U, 0.3 * U, W - 0.6 * U, H - 0.6 * U, "pencil", pen.fill("card"), {
            strokeWidth: 2,
        });
        letter(c, {
            x: 1.2 * U,
            y: 2 * U,
            s: p.title,
            face: "hand",
            weight: 740,
            size: 22,
            informal: 100,
            fill: c.t.ink,
            anchor: "start",
        });
        pen.line(g, 1.1 * U, 2.45 * U, W - 1.1 * U, 2.45 * U, "pencil", {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
        });
        for (let i = 0; i < n; i++) {
            const y = (3.5 + i * 2) * U,
                m = p.marks[i] ?? "";
            if ((KEY_MARKS as readonly string[]).includes(m))
                keyMark(c, m as KeyMark, 1.2 * U, 3.8 * U, y);
            say(c, 4.5 * U, y + 5, p.labels[i] ?? "", 14, "start");
            a[`row(${i})`] = [4.4 * U, y, "left"];
        }
        return a;
    },
    describe: () =>
        "A card headed with a title and ruled under it, with one row for each kind of mark on a map and the word for it written beside each.",
});
