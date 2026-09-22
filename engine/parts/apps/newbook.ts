// The picture the apps show for an empty page, a first visit and a finished day: a flat lay, things
// lying on the squared paper seen from straight above and square to its grid, so the page it sits on
// is the same paper it is drawn on. See .docs/shelf.md.
import { roundedRect } from "../../ink/pen";
import { group, type Ctx, type RawAnchors } from "../../ink/surface";
import { MARKERS, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, penned } from "../lettering";

type Pt = [number, number];

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});
const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;
/** A cover is several squares of one colour, so on paper its hatch is opened out to stay a light grey. */
const WIDE = { hachureGap: 8.5, fillWeight: 0.6 } as const;

/** A pencil seen from above, from its eraser at `top` to its point, `len` long, turned by `turn` degrees. */
function pencil<G>(c: Ctx<G>, cx: number, top: number, len: number, turn: number): Pt {
    const { pen, g } = group(c, { turn: [["rotate", turn, cx, top + len / 2]] });
    const w = 11;
    const hw = w / 2;
    const eraser = top + 8;
    const ferrule = eraser + 6;
    const wood = top + len - 15;
    const tip = top + len;
    const end = `M${cx - hw} ${eraser}V${top + 3}Q${cx - hw} ${top} ${cx} ${top}Q${cx + hw} ${top} ${cx + hw} ${top + 3}V${eraser}Z`;
    pen.path(g, end, "ruler", c.pen.fill("berry"), { strokeWidth: 1.3, ...FIRM });
    const band = c.pen.fill("ink-soft", "hachure", {
        hachureGap: 1.8,
        hachureAngle: 0,
        fillWeight: 0.6,
    });
    pen.rect(g, cx - hw, eraser, w, ferrule - eraser, "ruler", band, { strokeWidth: 1.3, ...FIRM });
    pen.rect(g, cx - hw, ferrule, w, wood - ferrule, "ruler", c.pen.fill("glow"), calm(c, 1.5));
    for (const dx of [-hw / 3, hw / 3]) {
        const stroke = c.paper ? c.t.ink : c.t["glow-ink"];
        pen.line(g, cx + dx, ferrule + 2, cx + dx, wood - 1, "ruler", {
            strokeWidth: 0.7,
            stroke,
            ...FIRM,
        });
    }
    const cone = `M${cx - hw} ${wood}Q${cx - hw * 0.5} ${wood + 2} ${cx} ${wood}Q${cx + hw * 0.5} ${wood + 2} ${cx + hw} ${wood}L${cx + 1.6} ${tip - 4.5}H${cx - 1.6}Z`;
    pen.path(g, cone, "ruler", c.pen.fill("card"), { strokeWidth: 1.3, ...FIRM });
    const lead = `M${cx - 1.8} ${tip - 5}L${cx} ${tip}L${cx + 1.8} ${tip - 5}Z`;
    pen.path(g, lead, "ruler", { fill: c.t.ink, fillStyle: "solid" }, { strokeWidth: 1, ...FIRM });
    const a = (turn * Math.PI) / 180;
    const mid = top + len / 2;
    return [cx - Math.sin(a) * (tip - mid), mid + Math.cos(a) * (tip - mid)];
}

/** A sprig of three leaves on a curved stem, the one living thing on the desk. */
function sprig<G>(c: Ctx<G>, x: number, y: number, s: number): void {
    const { pen, g } = c;
    const green = c.paper ? c.t.ink : c.t.ok;
    const stem: Pt[] = [
        [x, y + 30 * s],
        [x + 9 * s, y + 16 * s],
        [x + 22 * s, y + 4 * s],
        [x + 32 * s, y],
    ];
    pen.curve(g, stem, "ruler", { strokeWidth: 1.4, stroke: green, ...FIRM });
    const leaf = (at: Pt, ang: number, len: number) => {
        const a = (ang * Math.PI) / 180;
        const tip: Pt = [at[0] + Math.cos(a) * len, at[1] + Math.sin(a) * len];
        const n: Pt = [-Math.sin(a) * len * 0.34, Math.cos(a) * len * 0.34];
        const m: Pt = [(at[0] + tip[0]) / 2, (at[1] + tip[1]) / 2];
        const d = `M${at[0]} ${at[1]}Q${m[0] + n[0]} ${m[1] + n[1]} ${tip[0]} ${tip[1]}Q${m[0] - n[0]} ${m[1] - n[1]} ${at[0]} ${at[1]}Z`;
        pen.path(g, d, "ruler", c.pen.fill("mint"), { strokeWidth: 1.3, ...FIRM });
        const vx = m[0] + (tip[0] - at[0]) * 0.3;
        const vy = m[1] + (tip[1] - at[1]) * 0.3;
        pen.line(g, at[0], at[1], vx, vy, "ruler", { strokeWidth: 0.7, stroke: green, ...FIRM });
    };
    leaf([x + 7 * s, y + 20 * s], 200, 14 * s);
    leaf([x + 15 * s, y + 10 * s], -80, 13 * s);
    leaf([x + 22 * s, y + 4 * s], 10, 13 * s);
    leaf([x + 32 * s, y], -35, 11 * s);
}

/** A closed exercise book lying square to the grid: pages at its edge, a taped spine and a label for a name. */
function closedBook<G>(
    c: Ctx<G>,
    x0: number,
    y0: number,
    w: number,
    h: number,
    cover: Marker,
    name: string,
): RawAnchors {
    const { pen, g, t } = c;
    pen.path(g, roundedRect(x0 + 3, y0 + 3, w, h, 5), "ruler", pen.fill("card"), {
        strokeWidth: 1.1,
        stroke: t["ink-soft"],
        ...FIRM,
    });
    for (const k of [1.4, 2.4]) {
        pen.line(g, x0 + w + k, y0 + 7, x0 + w + k, y0 + h - 2, "ruler", {
            strokeWidth: 0.7,
            stroke: t["ink-soft"],
            ...FIRM,
        });
    }
    pen.path(
        g,
        roundedRect(x0, y0, w, h, 6),
        "pencil",
        pen.fill(cover, "solid", WIDE),
        calm(c, 1.8),
    );
    const spine = pen.fill("ink-soft", "hachure", { hachureGap: 3.2, fillWeight: 0.7 });
    pen.rect(g, x0, y0, 0.9 * U, h, "ruler", spine, calm(c, 1.3));
    const lx = x0 + 1.5 * U;
    const ly = y0 + 1.5 * U;
    const lw = w - 2.2 * U;
    const lh = 2.6 * U;
    pen.path(g, roundedRect(lx, ly, lw, lh, 6), "ruler", pen.fill("card"), calm(c, 1.4));
    pen.path(g, roundedRect(lx + 3, ly + 3, lw - 6, lh - 6, 4), "ruler", null, {
        strokeWidth: 0.7,
        stroke: t["ink-soft"],
        ...FIRM,
    });
    cap(c, lx + 8, ly + 13, "Name", 8.5, "start");
    const writeY = ly + lh - 11;
    if (name)
        penned(c, lx + lw / 2, writeY - 1, name, Math.min(19, (lw - 16) / (name.length * 0.58)));
    else {
        const blank = { strokeWidth: 1, stroke: t["ink-soft"], strokeLineDash: [3, 3], ...FIRM };
        pen.line(c.g, lx + 8, writeY + 1, lx + lw - 8, writeY + 1, "ruler", blank);
    }
    // a patch of squares in the corner, the one mark on the cover, because the pages inside are squared
    const px = x0 + w - 1.9 * U;
    const py = y0 + h - 1.9 * U;
    const ps = 1.3 * U;
    pen.rect(g, px, py, ps, ps, "ruler", pen.fill("card"), { strokeWidth: 1.1, ...FIRM });
    const rule = { strokeWidth: 0.7, stroke: c.paper ? t.ink : t.grid, ...FIRM };
    for (const k of [1, 2]) {
        pen.line(g, px + (k * ps) / 3, py, px + (k * ps) / 3, py + ps, "ruler", rule);
        pen.line(g, px, py + (k * ps) / 3, px + ps, py + (k * ps) / 3, "ruler", rule);
    }
    return { label: [lx + lw / 2, ly + lh / 2, "up"], book: [x0 + w / 2, y0, "up"] };
}

/** The book open at its first page: the inside of the cover on the left, and a squared page with its margin rule. */
function openBook<G>(
    c: Ctx<G>,
    x0: number,
    y0: number,
    pw: number,
    h: number,
    cover: Marker,
    name: string,
): RawAnchors {
    const { pen, g, t } = c;
    pen.path(
        g,
        roundedRect(x0 - 3, y0 - 2, pw * 2 + 6, h + 5, 6),
        "pencil",
        pen.fill(cover, "solid", WIDE),
        calm(c, 1.7),
    );
    pen.path(g, roundedRect(x0, y0, pw, h, 3), "ruler", pen.fill("card"), calm(c, 1.2));
    for (const k of [1, 2, 3]) {
        const y = y0 + 1.6 * U + k * 18;
        pen.line(g, x0 + 12, y, x0 + pw - 12, y, "ruler", {
            strokeWidth: 0.8,
            stroke: t["ink-soft"],
            ...FIRM,
        });
    }
    cap(c, x0 + 12, y0 + 1.3 * U, "Belongs to", 8, "start");
    if (name) penned(c, x0 + pw / 2, y0 + 1.6 * U + 15, name, 16);
    const rx = x0 + pw;
    pen.path(g, roundedRect(rx, y0, pw, h, 3), "ruler", pen.fill("card"), calm(c, 1.2));
    // the grid inside the page falls on the paper's own grid, so the page is the same paper
    const grid = { strokeWidth: 0.6, stroke: t.grid, ...FIRM };
    for (let gx = Math.ceil((rx + 1) / U) * U; gx < rx + pw - 1; gx += U) {
        pen.line(g, gx, y0 + 1, gx, y0 + h - 1, "ruler", grid);
    }
    for (let gy = Math.ceil((y0 + 1) / U) * U; gy < y0 + h - 1; gy += U) {
        pen.line(g, rx + 1, gy, rx + pw - 1, gy, "ruler", grid);
    }
    const margin = rx + 1.5 * U;
    const rule = { strokeWidth: 1.1, stroke: c.paper ? t["ink-soft"] : t.berry, ...FIRM };
    pen.line(g, margin, y0 + 1, margin, y0 + h - 1, "ruler", rule);
    pen.line(g, rx, y0 + 2, rx, y0 + h - 2, "ruler", {
        strokeWidth: 1.4,
        stroke: t["ink-soft"],
        ...FIRM,
    });
    return { page: [rx + pw / 2, y0 + h / 2, "up"], first: [margin + 0.5 * U, y0 + U, "up"] };
}

export const STAGES = ["new", "named", "open"] as const;
export type Stage = (typeof STAGES)[number];

/** What the book shows: which stage, whose name, and the cover's marker. */
export interface BookParams {
    stage: Stage;
    name: string;
    cover: Marker;
}

export const newbook = defineDrawing<BookParams>({
    id: "newbook",
    family: "apps",
    title: "A new exercise book",
    group: "Props",
    about: "The picture for a page with nothing on it yet: a new exercise book lying square to the grid with a pencil beside it and a sprig of leaves. New, its label is blank, which is a family with no child added; named, the child's name is on it; open, it shows the first squared page, empty, for a journal before the first lesson.",
    params: { stage: "new", name: "", cover: "sky" },
    settings: {
        stage: { kind: "one of", of: STAGES },
        name: { kind: "text", most: 16 },
        cover: { kind: "one of", of: MARKERS },
    },
    takes: [
        { label: "New, its label blank", params: { stage: "new", name: "", cover: "sky" } },
        { label: "With a name on it", params: { stage: "named", name: "Maya", cover: "glow" } },
        { label: "Open at the first page", params: { stage: "open", name: "Theo", cover: "mint" } },
    ],
    box: (p) => ({ w: p.stage === "open" ? 15 : 10, h: 8 }),
    draw: (c, p) => {
        const name = p.stage === "new" ? "" : p.name.trim();
        if (p.stage === "open") {
            const a = openBook(c, U, 0.5 * U, 5.5 * U, 7 * U, p.cover, name);
            const tip = pencil(c, 9.5 * U, 1.4 * U, 5.6 * U, 28);
            sprig(c, 12.2 * U, 1.3 * U, 1.05);
            return { ...a, pencil: [tip[0], tip[1], "down"] };
        }
        const a = closedBook(c, U, 0.5 * U, 5 * U, 7 * U, p.cover, name);
        pencil(c, 7.2 * U, 0.9 * U, 6.2 * U, -4);
        sprig(c, 7.8 * U, 1.3 * U, 1);
        return a;
    },
    describe: (p) => {
        const name = p.name.trim();
        if (p.stage === "open") {
            return "An exercise book open at its first page, squared and empty, with a pencil lying across it and a sprig of leaves beside it.";
        }
        if (p.stage === "named" && name) {
            return `A new exercise book with ${name} written on its label, a pencil beside it and a sprig of leaves.`;
        }
        return "A new exercise book with a blank name label, a pencil beside it and a sprig of leaves.";
    },
});
