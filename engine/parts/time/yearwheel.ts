import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { onCircle, sayOn, sector } from "../lettering";
import { loop } from "../marks";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Winter is December to February, so the seasons start three months before the year does. */
const SEASONS: { name: string; from: number; fill: Marker }[] = [
    { name: "Winter", from: 11, fill: "sky" },
    { name: "Spring", from: 2, fill: "mint" },
    { name: "Summer", from: 5, fill: "glow" },
    { name: "Autumn", from: 8, fill: "tang" },
];

export const yearWheel = defineDrawing({
    id: "yearwheel",
    family: "time",
    title: "Year wheel",
    group: "Structures",
    about: 'The twelve months round a circle with the four seasons behind them, so "three months after October" is a turn rather than a list. One month can be looped.',
    params: { seasons: true, mark: "" },
    settings: { seasons: { kind: "flag" }, mark: { kind: "text", most: 10 } },
    takes: [
        { label: "Seasons, October looped", params: { seasons: true, mark: "Oct" } },
        { label: "Months only", params: { seasons: false, mark: "" } },
        { label: "Seasons, nothing marked", params: { seasons: true, mark: "" } },
    ],
    box: () => ({ w: 15, h: 15 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 7.5 * U,
            cy = 7.5 * U,
            R = 6.5 * U,
            a: RawAnchors = {};
        if (p.seasons) {
            for (const s of SEASONS) {
                pen.path(
                    g,
                    sector(
                        cx,
                        cy,
                        R,
                        (s.from / 12) * 2 * Math.PI,
                        ((s.from + 3) / 12) * 2 * Math.PI,
                    ),
                    "ruler",
                    pen.fill(s.fill, "solid", { hachureGap: 8, fillWeight: 0.6 }),
                    { strokeWidth: 0 },
                );
                const [lx, ly] = onCircle(cx, cy, R * 0.32, (s.from + 1.5) / 12);
                sayOn(c, lx, ly + 5, s.name, 13);
            }
        }
        for (let m = 0; m < 12; m++) {
            const [ex, ey] = onCircle(cx, cy, R, m / 12),
                [ix, iy] = onCircle(cx, cy, R * 0.58, m / 12);
            pen.line(g, ix, iy, ex, ey, "ruler", { strokeWidth: 1.1, stroke: c.t["ink-soft"] });
            const [lx, ly] = onCircle(cx, cy, R * 0.8, (m + 0.5) / 12);
            sayOn(c, lx, ly + 5, MONTHS[m] ?? "", 15);
            if (p.mark === MONTHS[m]) loop(c, lx, ly, 46, 30);
            a[`month(${MONTHS[m]})`] = [lx, ly - 12, "up"];
        }
        pen.circle(g, cx, cy, R * 2, "ruler", null, { strokeWidth: 2.4 });
        pen.circle(g, cx, cy, R * 1.2, "ruler", null, {
            strokeWidth: 1.1,
            stroke: c.t["ink-soft"],
        });
        return { ...a, centre: [cx, cy, "up"] };
    },
    describe: (p) =>
        `A wheel of the twelve months written round a ring in order${p.seasons ? ", the four seasons coloured behind them" : ", on plain paper"}${p.mark ? ", one month ringed in pencil" : ""}, the year going round clockwise.`,
});
