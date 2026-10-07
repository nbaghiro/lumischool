import { plain, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { COAST, DOCK, GRID, JUNGLE, POND, SPOTS, type Spot } from "../outdoors/islandground";

/** The part of the island the map shows, in the island's squares. */
const SHOWN = { x: 6, y: 3.5, w: 49, h: 43 } as const;
/** Where the island sits on the card, and how many of the card's squares one of the island's takes. */
const AT = { x: 2.6, y: 1.5, k: 0.23 } as const;

const toCard = (x: number, y: number): [number, number] => [
    (AT.x + (x - SHOWN.x) * AT.k) * U,
    (AT.y + (y - SHOWN.y) * AT.k) * U,
];
const squareMiddle = (c: number, r: number): [number, number] =>
    toCard(GRID.x + (c + 0.5) * GRID.cell, GRID.y + (r + 0.5) * GRID.cell);

const SPOT_IDS = Object.keys(SPOTS).filter((k): k is Spot => k in SPOTS);
const isSpot = (v: unknown): v is Spot => SPOT_IDS.some((s) => s === v);

const pairs = (v: readonly number[]): [number, number][] => {
    const out: [number, number][] = [];
    for (let i = 0; i + 1 < v.length; i += 2) {
        const c = v[i],
            r = v[i + 1];
        if (c !== undefined && r !== undefined) out.push([c, r]);
    }
    return out;
};

/** A landmark as a map draws it: small, in a few strokes, standing on its foot. */
function landmark<G>(c: Ctx<G>, kind: Spot, x: number, y: number): void {
    const { pen, g } = c;
    const s = 0.24 * U;
    const line = { strokeWidth: 1.3, roughness: 0.4 };
    if (kind === "palm") {
        pen.path(
            g,
            `M${x} ${y}Q${x + s * 0.6} ${y - s * 2} ${x + s * 0.2} ${y - s * 3.6}`,
            "pencil",
            null,
            line,
        );
        for (const dx of [-1.6, 0, 1.6])
            pen.path(
                g,
                `M${x + s * 0.2} ${y - s * 3.6}Q${x + s * (0.2 + dx * 0.6)} ${y - s * 4.4} ${x + s * (0.2 + dx)} ${y - s * 3.2}`,
                "pencil",
                null,
                {
                    ...line,
                    stroke: c.paper ? c.t.ink : c.t.ok,
                },
            );
    } else if (kind === "rock")
        pen.path(
            g,
            `M${x - s * 1.4} ${y}Q${x - s * 1.2} ${y - s * 2.2} ${x} ${y - s * 2}Q${x + s * 1.5} ${y - s * 1.8} ${x + s * 1.4} ${y}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            line,
        );
    else if (kind === "lighthouse") {
        pen.path(
            g,
            `M${x - s} ${y}L${x - s * 0.6} ${y - s * 4}H${x + s * 0.6}L${x + s} ${y}Z`,
            "pencil",
            pen.fill("card"),
            line,
        );
        pen.line(g, x - s * 0.8, y - s * 1.6, x + s * 0.8, y - s * 1.6, "pencil", {
            ...line,
            stroke: c.paper ? c.t.ink : c.t.berry,
        });
        pen.circle(g, x, y - s * 4.5, s * 1.2, "pencil", pen.fill("glow"), line);
    } else if (kind === "cave")
        pen.path(
            g,
            `M${x - s * 2.4} ${y}Q${x} ${y - s * 4} ${x + s * 2.4} ${y}Z M${x - s * 0.8} ${y}Q${x} ${y - s * 1.8} ${x + s * 0.8} ${y}`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            line,
        );
    else if (kind === "wreck")
        pen.path(
            g,
            `M${x - s * 2.2} ${y - s}Q${x} ${y + s * 0.6} ${x + s * 2.2} ${y - s * 1.2}L${x + s} ${y - s * 1.8}Q${x} ${y - s * 0.6} ${x - s * 1.2} ${y - s * 1.8}Z`,
            "pencil",
            pen.fill("tang"),
            line,
        );
    else {
        pen.line(g, x, y, x, y - s * 1.8, "pencil", line);
        pen.circle(g, x, y - s * 2.8, s * 2.6, "pencil", pen.fill("mint"), line);
        pen.circle(g, x + s * 0.9, y - s * 3.4, s * 0.9, "ruler", pen.fill("berry"), {
            strokeWidth: 0.8,
        });
    }
}

export const clueMap = defineDrawing<{
    grid: boolean;
    ring: string;
    path: number[];
    xs: number[];
    done: number[];
    lines: string[];
    torn: boolean;
}>({
    id: "cluemap",
    family: "writing",
    title: "Treasure island map",
    group: "Props",
    about: "A parchment map of the treasure island with its landmarks drawn small: the palm tree, the big rock, the lighthouse, the cave, the wreck and the parrot's tree. It can carry the grid's letters and numbers, a ring round where to start, a dotted way to walk, Xs where to dig and the clue written underneath.",
    params: {
        grid: true,
        ring: "palm",
        path: [3, 5, 3, 2, 7, 2],
        xs: [7, 2],
        done: [],
        lines: ["Start at the palm tree.", "Walk 3 north, then 4 east."],
        torn: false,
    },
    settings: {
        grid: { kind: "flag" },
        ring: { kind: "text", most: 12 },
        path: { kind: "numbers", min: 0, max: 11, most: 16 },
        xs: { kind: "numbers", min: 0, max: 11, most: 8 },
        done: { kind: "numbers", min: 0, max: 11, most: 8 },
        lines: { kind: "words", most: 3 },
        torn: { kind: "flag" },
    },
    takes: [
        {
            label: "Steps from the palm tree",
            params: {
                grid: false,
                ring: "palm",
                path: [3, 5, 3, 2, 7, 2],
                xs: [7, 2],
                done: [],
                lines: ["Start at the palm tree.", "Walk 3 north, then 4 east."],
                torn: false,
            },
        },
        {
            label: "Three squares to dig",
            params: {
                grid: true,
                ring: "",
                path: [],
                xs: [1, 1, 7, 4, 4, 7],
                done: [1, 1],
                lines: ["Dig at B2, H5 and E8."],
                torn: false,
            },
        },
        {
            label: "Torn, with no clue",
            params: { grid: true, ring: "cave", path: [], xs: [], done: [], lines: [], torn: true },
        },
    ],
    box: (p) => ({ w: 16, h: 12 + (p.lines.length ? Math.min(3, p.lines.length) + 1 : 0) }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const n = Math.min(3, p.lines.length);
        const w = 16 * U,
            h = (12 + (n ? n + 1 : 0)) * U;
        const m = 0.25 * U;
        // the parchment, its edges a little wavy, and torn away at the bottom right on a torn map
        const tear = p.torn
            ? `L${w - m} ${h * 0.55}L${w - 1.4 * U} ${h * 0.62}L${w - 0.9 * U} ${h * 0.72}L${w - 2.4 * U} ${h * 0.8}L${w - 1.6 * U} ${h * 0.9}L${w - 3 * U} ${h - m}`
            : `L${w - m} ${h - m}`;
        const sheet = `M${m} ${m + 4}Q${w / 2} ${m - 2} ${w - m} ${m + 2}${tear}Q${w / 2} ${h - m + 3} ${m} ${h - m - 2}Z`;
        if (!c.paper) plain(c, { kind: "path", d: sheet, fill: c.t.card });
        pen.path(g, sheet, "pencil", pen.fill("glow", "solid", { opacity: 0.3 }), {
            strokeWidth: 1.8,
        });
        // the sea round the island in a few strokes, the island's coast, and its jungle and pond
        const coast = COAST.map((q) => toCard(q.x, q.y));
        const ring = (pts: [number, number][]) =>
            `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
        pen.path(
            g,
            ring(coast),
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 7, fillWeight: 0.5 }),
            {
                strokeWidth: 1.5,
            },
        );
        pen.path(
            g,
            ring(JUNGLE.map((q) => toCard(q.x, q.y))),
            "pencil",
            pen.fill("mint", "hachure", { hachureGap: 4 }),
            {
                strokeWidth: 1,
                stroke: c.paper ? c.t.ink : c.t.ok,
            },
        );
        const [px, py] = toCard(POND.x, POND.y);
        pen.ellipse(
            g,
            px,
            py,
            POND.rx * 2 * AT.k * U,
            POND.ry * 2 * AT.k * U,
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1 },
        );
        const [dx, dy] = toCard(DOCK.x, DOCK.y);
        pen.rect(g, dx, dy, DOCK.w * AT.k * U, DOCK.h * AT.k * U, "ruler", pen.fill("tang"), {
            strokeWidth: 1,
        });
        for (const [x, y] of [
            [3.4, 2.1],
            [14.2, 9.6],
            [13.6, 2.4],
        ] as const)
            if (!(p.torn && x > 12 && y > 8))
                pen.path(
                    g,
                    `M${x * U} ${y * U}Q${(x + 0.2) * U} ${(y - 0.2) * U} ${(x + 0.4) * U} ${y * U}T${(x + 0.8) * U} ${y * U}`,
                    "pencil",
                    null,
                    {
                        strokeWidth: 1,
                        stroke: c.paper ? c.t.ink : c.t.sky,
                    },
                );
        if (p.grid) {
            const [gx0, gy0] = toCard(GRID.x, GRID.y);
            const cell = GRID.cell * AT.k * U;
            for (let k = 0; k <= GRID.cols; k++)
                plain(c, {
                    kind: "path",
                    d: `M${gx0 + k * cell} ${gy0}V${gy0 + GRID.rows * cell}`,
                    fill: "none",
                    stroke: c.t.ink,
                    width: 0.7,
                    opacity: 0.45,
                });
            for (let k = 0; k <= GRID.rows; k++)
                plain(c, {
                    kind: "path",
                    d: `M${gx0} ${gy0 + k * cell}H${gx0 + GRID.cols * cell}`,
                    fill: "none",
                    stroke: c.t.ink,
                    width: 0.7,
                    opacity: 0.45,
                });
            for (let k = 0; k < GRID.cols; k++)
                say(c, gx0 + (k + 0.5) * cell, gy0 - 3, "ABCDEFGHIJKL"[k] ?? "", 11);
            for (let k = 0; k < GRID.rows; k++)
                say(c, gx0 - 7, gy0 + (k + 0.5) * cell + 4, String(k + 1), 11);
        }
        for (const id of SPOT_IDS) {
            const at = SPOTS[id];
            const [x, y] = toCard(at.x, at.y);
            landmark(c, id, x, y);
            a[id] = [x, y, "down"];
        }
        if (isSpot(p.ring)) {
            const at = SPOTS[p.ring];
            const [x, y] = toCard(at.x, at.y);
            pen.circle(g, x, y - 0.35 * U, 1.3 * U, "pencil", null, {
                strokeWidth: 2,
                stroke: c.paper ? c.t.ink : c.t.pen,
            });
        }
        const way = pairs(p.path).map(([cc, r]) => squareMiddle(cc, r));
        for (let i = 0; i + 1 < way.length; i++) {
            const from = way[i],
                to = way[i + 1];
            if (!from || !to) continue;
            const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
            for (let d = 0; d <= len; d += 6)
                plain(c, {
                    kind: "circle",
                    cx: from[0] + ((to[0] - from[0]) * d) / len,
                    cy: from[1] + ((to[1] - from[1]) * d) / len,
                    r: 1.4,
                    fill: c.paper ? c.t.ink : c.t.pen,
                });
        }
        const done = pairs(p.done);
        for (const [cc, r] of pairs(p.xs)) {
            const [x, y] = squareMiddle(cc, r);
            const s = 0.32 * U;
            const ink = c.paper ? c.t.ink : c.t.berry;
            pen.line(g, x - s, y - s, x + s, y + s, "pencil", { strokeWidth: 2.6, stroke: ink });
            pen.line(g, x + s, y - s, x - s, y + s, "pencil", { strokeWidth: 2.6, stroke: ink });
            if (done.some(([dc, dr]) => dc === cc && dr === r))
                pen.circle(g, x, y, s * 3.2, "pencil", null, {
                    strokeWidth: 1.6,
                    stroke: c.paper ? c.t.ink : c.t.ok,
                });
        }
        // the compass's north, so the map can be turned to the island
        const nx = 14.8 * U,
            ny = 1.5 * U;
        pen.line(g, nx, ny + 0.9 * U, nx, ny - 0.3 * U, "pencil", { strokeWidth: 1.6 });
        pen.path(
            g,
            `M${nx - 0.25 * U} ${ny}L${nx} ${ny - 0.4 * U}L${nx + 0.25 * U} ${ny}`,
            "pencil",
            null,
            { strokeWidth: 1.6 },
        );
        say(c, nx - 0.6 * U, ny + 0.5 * U, "N", 13);
        p.lines
            .slice(0, 3)
            .forEach((text, i) => say(c, w / 2, (12.9 + i) * U, text.slice(0, 40), 16));
        return a;
    },
    describe: (p) =>
        `A parchment map of the treasure island with its landmarks drawn small${p.grid ? ", lettered and numbered along its grid" : ""}${pairs(p.xs).length ? ", and an X where to dig" : ""}${p.torn ? ", torn at one corner" : ""}.`,
});
