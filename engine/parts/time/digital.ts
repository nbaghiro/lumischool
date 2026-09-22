import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { soft } from "../lettering";

/** Which of the seven segments each digit lights. */
const LIT: Record<string, string> = {
    "0": "abcdef",
    "1": "bc",
    "2": "abged",
    "3": "abgcd",
    "4": "fgbc",
    "5": "afgcd",
    "6": "afgedc",
    "7": "abc",
    "8": "abcdefg",
    "9": "abcdfg",
};

/** One seven-segment digit, top-left at (x, y), in a cell w by h. */
function segments<G>(c: Ctx<G>, ch: string, x: number, y: number, w: number, h: number): void {
    const on = LIT[ch];
    if (!on) return;
    const t = Math.min(w, h) * 0.17,
        x1 = x + w,
        ym = y + h / 2,
        y1 = y + h;
    const fill = { fill: c.t.ink, fillStyle: "solid" as const };
    const horiz = (yy: number): [number, number][] => [
        [x, yy],
        [x + t, yy - t],
        [x1 - t, yy - t],
        [x1, yy],
        [x1 - t, yy + t],
        [x + t, yy + t],
    ];
    const vert = (xx: number, ya: number, yb: number): [number, number][] => [
        [xx, ya],
        [xx + t, ya + t],
        [xx + t, yb - t],
        [xx, yb],
        [xx - t, yb - t],
        [xx - t, ya + t],
    ];
    const bars: Record<string, [number, number][]> = {
        a: horiz(y),
        g: horiz(ym),
        d: horiz(y1),
        f: vert(x, y, ym),
        b: vert(x1, y, ym),
        e: vert(x, ym, y1),
        c: vert(x1, ym, y1),
    };
    for (const s of on) c.pen.polygon(c.g, bars[s] ?? [], "ruler", fill, { strokeWidth: 0.7 });
}

/** Cell width in squares for each character of a readout: a digit is two, a colon is one. */
const cells = (s: string): number[] => Array.from(s).map((ch) => (ch === ":" ? 1 : 2));

export const digitalClock = defineDrawing({
    id: "digital",
    family: "time",
    title: "Digital clock",
    group: "Structures",
    about: "A seven-segment readout, drawn as bars rather than type, so the time is the same shape at any size and needs no font. Pairs with the analogue clock for telling one from the other.",
    params: { time: "07:45", suffix: "" },
    settings: { time: { kind: "text", most: 5 }, suffix: { kind: "text", most: 2 } },
    takes: [
        { label: "Quarter to eight", params: { time: "07:45", suffix: "" } },
        { label: "Afternoon", params: { time: "3:20", suffix: "pm" } },
        { label: "Midday", params: { time: "12:00", suffix: "" } },
        { label: "With seconds", params: { time: "08:06:30", suffix: "" } },
    ],
    box: (p) => ({ w: cells(p.time).reduce((s, n) => s + n, 0) + (p.suffix ? 2 : 0) + 2, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const w = cells(p.time).reduce((s, n) => s + n, 0) + (p.suffix ? 2 : 0) + 2;
        pen.path(g, roundedRect(0.5 * U, U, (w - 1) * U, 3 * U, 10), "ruler", pen.fill("card"), {
            strokeWidth: 2.2,
        });
        pen.path(g, roundedRect(0.9 * U, 1.3 * U, (w - 1.8) * U, 2.4 * U, 7), "ruler", null, {
            strokeWidth: 0.9,
            stroke: c.t["ink-soft"],
        });
        const a: RawAnchors = { screen: [(w / 2) * U, U, "up"] };
        let x = U;
        Array.from(p.time).forEach((ch, i) => {
            const cw = ch === ":" ? U : 2 * U;
            if (ch === ":") {
                for (const dy of [0.9, 2.1])
                    pen.circle(
                        g,
                        x + U / 2,
                        U + dy * U,
                        7,
                        "ruler",
                        { fill: c.t.ink, fillStyle: "solid" },
                        { strokeWidth: 0.6 },
                    );
            } else {
                segments(c, ch, x + 7, 1.3 * U, 2 * U - 14, 2.4 * U);
                a[`digit(${i})`] = [x + cw / 2, U, "up"];
            }
            x += cw;
        });
        if (p.suffix) soft(c, x + U, 3.1 * U, p.suffix, 17);
        a.time = [(w / 2) * U, 4 * U, "down"];
        return a;
    },
    describe: () =>
        "A digital clock, a dark screen in a frame with the time shown in four large seven-segment digits with a colon between.",
    motion: { still: STILL.instrument },
});
