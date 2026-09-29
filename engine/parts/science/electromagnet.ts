import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch, penned, soft, wide } from "../lettering";
import { cellPlates, cellsWide, switchUp } from "./wiring";

/** What the coil is wound round: iron and steel become a magnet, wood and aluminium do not. */
export const CORES = ["iron nail", "wooden rod", "aluminium rod"] as const;

/** The coil as drawn: turns in tens from 10 to 50, one to three cells, the core and the switch. */
export const coilOf = (p: {
    turns: number;
    cells: number;
    core: number;
    closed: number;
}): { turns: number; cells: number; core: number; closed: boolean } => ({
    turns: Math.max(1, Math.min(5, Math.round(p.turns / 10))) * 10,
    cells: Math.max(1, Math.min(3, Math.round(p.cells))),
    core: Math.max(0, Math.min(2, Math.round(p.core))),
    closed: p.closed > 0,
});

/**
 * How many paper clips the coil holds: none unless the switch is closed round an iron core, and then
 * one clip for every ten turns on each cell, so doubling the turns or the cells doubles the clips.
 */
export const clipsHeld = (p: {
    turns: number;
    cells: number;
    core: number;
    closed: number;
}): number => {
    const k = coilOf(p);
    return k.closed && k.core === 0 ? (k.turns / 10) * k.cells : 0;
};

export const electromagnet = defineDrawing({
    id: "electromagnet",
    family: "science",
    title: "Electromagnet",
    group: "Structures",
    about: "A coil of wire wound round a nail, joined through a switch to one, two or three cells, with paper clips hanging from the nail's point and a heap of loose clips on the bench. While the switch is closed the coil makes the iron nail a magnet, and it holds one clip for every ten turns on each cell, so more turns or more cells make it stronger; round a wooden or aluminium rod it holds none, since only iron and steel become a magnet, and with the switch open it lets them all go. How many clips hang is worked out from the settings, and with `show` at 0 the clips wait under a question mark, for a prediction.",
    params: { turns: 20, cells: 1, core: 0, closed: 1, show: 1, tag: "" },
    settings: {
        turns: { kind: "whole", min: 10, max: 50 },
        cells: { kind: "whole", min: 1, max: 3 },
        core: { kind: "whole", min: 0, max: 2 },
        closed: { kind: "whole", min: 0, max: 1 },
        show: { kind: "whole", min: 0, max: 1 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        {
            label: "Twenty turns on one cell",
            params: { turns: 20, cells: 1, core: 0, closed: 1, show: 1, tag: "" },
        },
        {
            label: "More turns, more cells",
            params: { turns: 40, cells: 2, core: 0, closed: 1, show: 1, tag: "" },
        },
        {
            label: "A wooden rod holds none",
            params: { turns: 30, cells: 2, core: 1, closed: 1, show: 1, tag: "" },
        },
        {
            label: "How many will it hold?",
            params: { turns: 30, cells: 1, core: 0, closed: 1, show: 0, tag: "A" },
        },
    ],
    box: () => ({ w: 15, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            k = coilOf(p),
            held = clipsHeld(p),
            show = p.show > 0;
        const nx = 10 * U,
            head = 1.3 * U,
            point = 7 * U,
            bench = 13.2 * U,
            wy = 10.4 * U;
        if (p.tag) num(c, 0.4 * U, 1.1 * U, p.tag, 22, "start");
        const wire = (pts: [number, number][]) => pen.linear(g, pts, "ruler", { strokeWidth: 2.2 });
        // the core, upright with its head at the top and its point down
        const w = 0.3 * U;
        const coreFill =
            k.core === 0
                ? pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.6 })
                : k.core === 1
                  ? pen.fill("tang", "hachure", { hachureGap: 5 })
                  : pen.fill("card");
        pen.polygon(
            g,
            k.core === 0
                ? [
                      [nx - w, head + 0.2 * U],
                      [nx + w, head + 0.2 * U],
                      [nx + w, point - 0.6 * U],
                      [nx, point],
                      [nx - w, point - 0.6 * U],
                  ]
                : [
                      [nx - w, head],
                      [nx + w, head],
                      [nx + w, point],
                      [nx - w, point],
                  ],
            "pencil",
            coreFill,
            { strokeWidth: 1.5 },
        );
        if (k.core === 0)
            pen.rect(g, nx - 0.6 * U, head, 1.2 * U, 0.24 * U, "pencil", coreFill, {
                strokeWidth: 1.5,
            });
        // the coil: two loops drawn for every ten turns, evenly up the core
        const loops = (k.turns / 10) * 2,
            top = 2.1 * U,
            low = 5.7 * U,
            step = (low - top) / Math.max(1, loops - 1);
        for (let i = 0; i < loops; i++) {
            const y = top + i * step;
            pen.path(
                g,
                `M${nx - 0.55 * U} ${y + 0.12 * U}Q${nx} ${y + 0.34 * U} ${nx + 0.55 * U} ${y - 0.02 * U}`,
                "pencil",
                null,
                { strokeWidth: 1.8, stroke: c.paper ? c.t.ink : "#b8642a" },
            );
        }
        // the patch starts right of the coil, so in ink it never cuts the nail where the turns are counted
        const turnsW = wide(`${k.turns} turns`, 12) + 6;
        patch(c, nx + 0.9 * U - 3 + turnsW / 2, (top + low) / 2 - 3, turnsW, 16);
        soft(c, nx + 0.9 * U, (top + low) / 2 + 1, `${k.turns} turns`, 12, "start");
        patch(c, nx - 3.4 * U, head + 0.1 * U, 110, 16);
        cap(c, nx - 0.8 * U, head + 0.4 * U, CORES[k.core] ?? "", 11, "end");
        // the loop: from the top of the coil round the left to the cells and the switch, and back
        const lx = 1.6 * U,
            cx0 = 3 * U,
            cw = cellsWide(k.cells),
            rx = Math.max(cx0 + cw + 1.2 * U, 6.6 * U);
        wire([
            [nx - 0.55 * U, top + 0.12 * U],
            [lx, top + 0.12 * U],
            [lx, 4.4 * U],
        ]);
        switchUp(c, lx, 4.4 * U, 6.2 * U, k.closed, true);
        soft(c, lx + (k.closed ? 0.9 : 2) * U, 5.5 * U, k.closed ? "closed" : "open", 11, "start");
        a.switch = [lx, 5.3 * U, "left"];
        wire([
            [lx, 6.2 * U],
            [lx, wy],
            [cx0 - 4, wy],
        ]);
        cellPlates(c, cx0, wy, k.cells);
        wire([
            [cx0 + cw + 4, wy],
            [rx, wy],
            [rx, low + 0.1 * U],
            [nx - 0.55 * U, low + 0.1 * U],
        ]);
        soft(c, cx0 + cw / 2, wy + 1.9 * U, k.cells === 1 ? "1 cell" : `${k.cells} cells`, 13);
        a.cell = [cx0 + cw / 2, wy + 1.2 * U, "down"];
        // the bench, with a heap of loose clips at its end
        pen.line(g, 0.4 * U, bench, 14.6 * U, bench, "ruler", { strokeWidth: 2 });
        const clip = (x: number, y: number, turn = 0) => {
            const hw = 0.16 * U,
                hh = 0.4 * U,
                t = (turn * Math.PI) / 180,
                at = (u: number, v: number): string =>
                    `${x + u * Math.cos(t) - v * Math.sin(t)} ${y + u * Math.sin(t) + v * Math.cos(t)}`;
            pen.path(
                g,
                `M${at(-hw * 0.4, hh * 0.5)}L${at(-hw * 0.4, -hh * 0.6)}Q${at(0, -hh * 1.1)} ${at(hw * 0.5, -hh * 0.6)}L${at(hw * 0.5, hh * 0.8)}Q${at(-hw * 0.2, hh * 1.3)} ${at(-hw, hh * 0.8)}L${at(-hw, -hh * 0.8)}Q${at(-hw * 0.1, -hh * 1.4)} ${at(hw, -hh * 0.8)}L${at(hw, hh * 0.3)}`,
                "pencil",
                null,
                { strokeWidth: 1.3, stroke: c.t["ink-soft"] },
            );
        };
        for (const [x, t] of [
            [11.4, 80],
            [12.1, 100],
            [12.8, 70],
            [13.5, 95],
            [12.4, 20],
            [13.1, -15],
        ] as const)
            clip(x * U, bench - 0.3 * U - (t < 45 ? 0.35 * U : 0), t);
        a.heap = [12.5 * U, bench - 0.8 * U, "up"];
        // the clips it holds, three to a row, each row hanging from the one above
        if (!show) {
            penned(c, nx, point + 1.6 * U, "?", 26);
        } else {
            for (let i = 0; i < held; i++) {
                const row = Math.floor(i / 3),
                    col = (i % 3) - 1;
                clip(nx + col * 0.62 * U, point + 0.45 * U + row * U, col * 12);
            }
        }
        a.clips = [nx, point + 0.4 * U, "down"];
        a.coil = [nx + 0.6 * U, (top + low) / 2, "right"];
        return a;
    },
    describe: (p) =>
        `A coil of wire wound round a rod and joined through a switch to cells, with paper clips${p.show > 0 ? " hanging from its point" : " waiting under a question mark"} and loose clips on the bench.`,
    reads: true,
});
