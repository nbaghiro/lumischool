import { type Ctx, type RawAnchors } from "../../ink/surface";
import { rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap } from "../lettering";
import { STATES } from "./substances";

/**
 * How particles move, as marks a pencil can make: a solid's particles jiggle where they are (a pair
 * of short arcs either side), a liquid's slide past one another (a curl behind some of them) and a
 * gas's fly in straight lines (a dash behind each, pointing the way it came). `hot` at 2 makes every
 * mark longer, because hotter is faster and not more.
 */
function motionMarks<G>(
    c: Ctx<G>,
    places: [number, number][],
    d: number,
    spread: number,
    hot: number,
): void {
    const { pen, g } = c,
        r = rng(577),
        long = hot >= 2 ? 1.5 : 1,
        soft2 = { strokeWidth: 1.3, stroke: c.t["ink-soft"] };
    const xs = places.map((q) => q[0]),
        ys = places.map((q) => q[1]);
    const minX = Math.min(...xs),
        maxX = Math.max(...xs),
        minY = Math.min(...ys);
    // A solid's particles are packed, so its jiggle is drawn where there is room: round the outside of the block.
    const arcs = (x: number, y: number, mid: number) => {
        for (let k = 1; k <= (hot >= 2 ? 2 : 1); k++) {
            const w = d * (0.95 + 0.3 * k);
            pen.arc(g, x, y, w, w, mid - 0.5, mid + 0.5, "pencil", soft2);
        }
    };
    places.forEach(([x, y], i) => {
        if (spread === 0) {
            if (x - minX < d * 0.3) arcs(x, y, Math.PI);
            if (maxX - x < d * 0.3) arcs(x, y, 0);
            if (y - minY < d * 0.3) arcs(x, y, -Math.PI / 2);
            return;
        }
        if (spread === 1) {
            // the top of the heap slides, so the particles with nothing above them carry the marks
            const covered = places.some(
                ([x2, y2], j) => j !== i && Math.abs(x2 - x) < d * 0.7 && y2 < y - d * 0.5,
            );
            if (covered) return;
            const dir = r() < 0.5 ? -1 : 1,
                len = d * 1.1 * long;
            pen.curve(
                g,
                [
                    [x - dir * d * 0.2, y - d * 0.75],
                    [x + dir * len * 0.45, y - d * 1.05],
                    [x + dir * len, y - d * 0.7],
                ],
                "pencil",
                soft2,
            );
            pen.line(
                g,
                x + dir * len,
                y - d * 0.7,
                x + dir * (len - 4),
                y - d * 0.95,
                "pencil",
                soft2,
            );
            return;
        }
        const ang = r() * Math.PI * 2,
            len = d * 1.3 * long;
        for (const off of [-0.2, 0.2]) {
            const ox = Math.cos(ang + Math.PI / 2) * d * off,
                oy = Math.sin(ang + Math.PI / 2) * d * off;
            const x0 = x - Math.cos(ang) * d * 0.62 + ox,
                y0 = y - Math.sin(ang) * d * 0.62 + oy;
            pen.line(
                g,
                x0,
                y0,
                x0 - Math.cos(ang) * len,
                y0 - Math.sin(ang) * len,
                "pencil",
                soft2,
            );
        }
    });
}

/** How the particles are laid out in each spread, for the description. */
const ARRANGED = [
    "packed in tidy rows on its floor",
    "heaped loosely on its floor",
    "scattered far apart all through it",
];
export const particles = defineDrawing({
    id: "particles",
    family: "science",
    title: "Particles in a jar",
    group: "Structures",
    about: 'The same jar three times over: packed in rows for a solid, loose and heaped at the bottom for a liquid, far apart and everywhere for a gas. It is the only drawing on the shelf that explains a state rather than showing one, and with a second colour it is a mixture. `spread` is a number (0 packed, 1 loose, 2 far apart) rather than the name of a state, because a word setting cannot be a parameter and "which state is this?" is the question the drawing exists for; `name` writes the state under the jar, so a question can turn it off. `moving` draws how the particles move, drawn rather than animated so it prints: 1 is a jiggle on the spot for a solid, a slide for a liquid and a dash across the jar for a gas, and 2 is the same jar hotter, with every mark longer.',
    params: { spread: 0, count: 16, second: 0, lid: true, name: 1, moving: 0 },
    settings: {
        spread: { kind: "whole", min: 0, max: 2 },
        count: { kind: "whole", min: 1, max: 48 },
        second: { kind: "whole", min: 0, max: 48 },
        lid: { kind: "flag" },
        name: { kind: "whole", min: 0, max: 1 },
        moving: { kind: "whole", min: 0, max: 2 },
    },
    takes: [
        {
            label: "A solid",
            params: { spread: 0, count: 16, second: 0, lid: true, name: 1, moving: 0 },
        },
        {
            label: "A liquid",
            params: { spread: 1, count: 16, second: 0, lid: true, name: 1, moving: 0 },
        },
        {
            label: "A gas",
            params: { spread: 2, count: 16, second: 0, lid: true, name: 1, moving: 0 },
        },
        {
            label: "A solid, jiggling on the spot",
            params: { spread: 0, count: 16, second: 0, lid: true, name: 1, moving: 1 },
        },
        {
            label: "A liquid, sliding about",
            params: { spread: 1, count: 16, second: 0, lid: true, name: 1, moving: 1 },
        },
        {
            label: "A gas, hotter and faster",
            params: { spread: 2, count: 12, second: 0, lid: true, name: 1, moving: 2 },
        },
    ],
    // Ten squares rather than twelve, because three jars side by side is the picture this drawing
    // exists for and three twelves do not fit the printable width of a sheet.
    box: () => ({ w: 10, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const lx = 1.1 * U,
            rx = 8.9 * U,
            top = 2 * U,
            bottom = 9.6 * U;
        pen.path(
            g,
            `M${lx} ${top}V${bottom - 12}Q${lx} ${bottom} ${lx + 12} ${bottom}H${rx - 12}Q${rx} ${bottom} ${rx} ${bottom - 12}V${top}`,
            "ruler",
            null,
            { strokeWidth: 2.6 },
        );
        if (p.lid) {
            pen.rect(
                g,
                lx - 0.4 * U,
                top - 0.8 * U,
                rx - lx + 0.8 * U,
                0.8 * U,
                "ruler",
                pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                { strokeWidth: 2 },
            );
        } else {
            pen.line(g, lx - 6, top, rx + 6, top, "ruler", { strokeWidth: 1.8 });
        }
        const n = Math.max(1, Math.min(48, p.count)),
            d = 0.62 * U;
        const places: [number, number][] = [];
        const inX = (t: number) => lx + 0.7 * U + t * (rx - lx - 1.4 * U);
        if (p.spread >= 2) {
            // far apart and everywhere: a jittered grid over the whole jar, so no two takes look traced
            const r = rng(311),
                cols = Math.ceil(Math.sqrt(n * 1.4)),
                rows = Math.ceil(n / cols);
            for (let i = 0; i < n; i++) {
                const cx = i % cols,
                    cy = Math.floor(i / cols);
                places.push([
                    inX((cx + 0.3 + r() * 0.4) / cols),
                    top + 0.8 * U + ((cy + 0.25 + r() * 0.5) / rows) * (bottom - top - 1.4 * U),
                ]);
            }
        } else if (p.spread === 1) {
            // touching, but not in rows, and only as high as the liquid reaches
            const r = rng(733),
                cols = Math.max(3, Math.floor((rx - lx - 1.4 * U) / d));
            for (let i = 0; i < n; i++) {
                const cx = i % cols,
                    cy = Math.floor(i / cols);
                places.push([
                    inX((cx + 0.5 + (r() - 0.5) * 0.55) / cols),
                    bottom - 0.7 * U - cy * d * 1.02 - (r() - 0.5) * 0.3 * U,
                ]);
            }
        } else {
            // A lattice, and the pitch has to be the particle's own size rather than the jar's width
            // divided up: a solid whose particles do not touch is the one thing the drawing must not say.
            const cols = Math.max(2, Math.round(Math.sqrt(n)));
            const rows = Math.ceil(n / cols);
            const pitch = d * 1.04,
                mid = (lx + rx) / 2,
                left = mid - ((cols - 1) * pitch) / 2;
            for (let i = 0; i < n; i++) {
                const cx = i % cols,
                    cy = Math.floor(i / cols);
                places.push([left + cx * pitch, bottom - 0.7 * U - (rows - 1 - cy) * pitch]);
            }
        }
        const move = Math.max(0, Math.min(2, Math.round(p.moving))),
            spread = Math.max(0, Math.min(2, Math.round(p.spread)));
        if (move > 0) motionMarks(c, places, d, spread, move);
        places.forEach(([x, y], i) => {
            const second = i >= n - Math.max(0, Math.min(n, p.second));
            pen.circle(g, x, y, d, "pencil", pen.fill(second ? "berry" : "sky"), {
                strokeWidth: 1.4,
            });
            a[`bit(${i})`] = [x, y - d / 2, "up"];
        });
        if (p.name > 0)
            cap(c, (lx + rx) / 2, 11.2 * U, STATES[Math.max(0, Math.min(2, p.spread))] ?? "", 12);
        a.jar = [(lx + rx) / 2, top, "up"];
        return a;
    },
    describe: (p) =>
        `A tall glass jar${p.lid ? " with a lid" : " open at the top"} holding round particles ${ARRANGED[Math.max(0, Math.min(2, Math.round(p.spread)))] ?? ""}${p.second > 0 ? ", some a second colour" : ""}${p.moving > 0 ? ", marks showing how they move" : ""}${p.name > 0 ? ", a word underneath" : ""}.`,
    reads: true,
});
