import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { type Align, cap, patch, wide } from "../lettering";

interface Departure {
    to: string;
    at: string;
    platform: string;
}

/** The mono face runs wider than the reading face, so anything patched under it needs the room. */
const monoW = (s: string, size: number): number => wide(s, size) * 1.25 + 10;

/** One cell of the board, in the mono face. A marked row is a fill, so its text is patched first. */
function cell<G>(c: Ctx<G>, x: number, y: number, s: string, align: Align, marked: boolean): void {
    const size = 16,
        w = monoW(s, size);
    if (marked) patch(c, align === "start" ? x + w / 2 - 5 : x, y - size * 0.34, w, size * 1.3);
    cap(c, x, y, s, size, align, c.t.ink);
}

export const departureBoard = defineDrawing({
    id: "departureboard",
    family: "travel",
    title: "Departure board",
    group: "Structures",
    about: "A station board with a heading row and one train to a row, two squares tall and columns lined up, so a time or a platform can be read off it. One row can be lit up as the one being asked about. With `platforms` at 0 the platform column is left off and the board is half as wide, which is the board a station puts on its platform and the one that fits a margin.",
    params: {
        rows: [
            { to: "Leeds", at: "10:45", platform: "3" },
            { to: "York", at: "11:02", platform: "1" },
            { to: "Hull", at: "11:20", platform: "6" },
            { to: "Bray", at: "11:48", platform: "2" },
        ] as Departure[],
        mark: 1,
        platforms: 1,
    },
    settings: {
        rows: { kind: "fixed" },
        mark: { kind: "whole", min: -1, max: 8 },
        platforms: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Four trains, one lit",
            params: {
                rows: [
                    { to: "Leeds", at: "10:45", platform: "3" },
                    { to: "York", at: "11:02", platform: "1" },
                    { to: "Hull", at: "11:20", platform: "6" },
                    { to: "Bray", at: "11:48", platform: "2" },
                ],
                mark: 1,
                platforms: 1,
            },
        },
        {
            label: "Two trains",
            params: {
                rows: [
                    { to: "Ash", at: "09:15", platform: "2" },
                    { to: "Cole", at: "09:40", platform: "4" },
                ],
                mark: -1,
                platforms: 1,
            },
        },
        {
            label: "Two trains, no platforms",
            params: {
                rows: [
                    { to: "Ash", at: "09:15", platform: "2" },
                    { to: "Cole", at: "09:40", platform: "4" },
                ],
                mark: 0,
                platforms: 0,
            },
        },
    ],
    box: (p) => ({ w: p.platforms > 0 ? 22 : 13, h: p.rows.length * 2 + 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            plats = p.platforms > 0,
            x = U,
            w = (plats ? 20 : 11) * U,
            top = U,
            head = 2 * U;
        const H = head + p.rows.length * 2 * U,
            a: RawAnchors = { board: [x + w / 2, top, "up"] };
        const time = (plats ? 14.4 : 8.6) * U,
            plat = 18.6 * U;
        pen.path(g, roundedRect(x, top, w, H, 10), "ruler", pen.fill("card"), { strokeWidth: 2.6 });
        pen.path(g, roundedRect(x + 8, top + 8, w - 16, H - 16, 6), "ruler", null, {
            strokeWidth: 0.9,
            stroke: c.t["ink-soft"],
        });
        cap(c, x + 0.8 * U, top + 1.25 * U, "to", 11, "start");
        cap(c, time, top + 1.25 * U, "time", 11);
        if (plats) cap(c, plat, top + 1.25 * U, "platform", 11);
        pen.line(g, x + 8, top + head, x + w - 8, top + head, "ruler", { strokeWidth: 1.8 });
        for (const dx of plats ? [11.2, 15.4] : [6.4])
            pen.line(g, x + dx * U, top + head, x + dx * U, top + H - 9, "ruler", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
        p.rows.forEach((r, i) => {
            const y = top + head + i * 2 * U,
                marked = i === p.mark;
            if (marked)
                pen.rect(
                    g,
                    x + 16,
                    y + 5,
                    w - 32,
                    2 * U - 10,
                    "ruler",
                    pen.fill("glow", "solid", { hachureGap: 7, fillWeight: 0.7 }),
                    { strokeWidth: 0 },
                );
            else if (i > 0)
                pen.line(g, x + 14, y, x + w - 14, y, "ruler", {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
            cell(c, x + 0.8 * U, y + 1.25 * U, r.to, "start", marked);
            cell(c, time, y + 1.25 * U, r.at, "middle", marked);
            if (plats) cell(c, plat, y + 1.25 * U, r.platform, "middle", marked);
            a[`row(${i})`] = [x, y + U, "left"];
            a[`time(${i})`] = [time, y + 2 * U, "down"];
        });
        return a;
    },
    describe: (p) =>
        p.platforms > 0
            ? "A station departure board with a heading row for the destination, time and platform, and one train to a row underneath, one row lit up."
            : "A narrow station departure board with a heading row for the destination and the time, and one train to a row underneath, one row lit up.",
    motion: { still: STILL.instrument },
    reads: true,
});
