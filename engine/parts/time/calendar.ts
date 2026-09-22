import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch, say } from "../lettering";
import { loop } from "../marks";
import { WEEK } from "./spans";

const calRows = (first: number, days: number): number => Math.ceil((first + days) / 7);

export const calendarMonth = defineDrawing({
    id: "calendar",
    family: "time",
    title: "Calendar month",
    group: "Structures",
    about: "One month on a seven-column grid, cells three squares by two. `first` is the column the 1st falls in, so any month of any year can be laid out; days can be shaded or looped in pen.",
    params: { month: "March", days: 31, first: 0, shade: [] as number[], ring: [] as number[] },
    settings: {
        month: { kind: "text", most: 10 },
        days: { kind: "whole", min: 28, max: 31 },
        first: { kind: "whole", min: 0, max: 6 },
        shade: { kind: "fixed" },
        ring: { kind: "fixed" },
    },
    takes: [
        {
            label: "March, starting Sunday",
            params: { month: "March", days: 31, first: 6, shade: [], ring: [17] },
        },
        {
            label: "A week shaded",
            params: { month: "June", days: 30, first: 0, shade: [8, 9, 10, 11, 12], ring: [] },
        },
        {
            label: "February, no leap day",
            params: { month: "February", days: 28, first: 3, shade: [], ring: [] },
        },
        { label: "Plain", params: { month: "September", days: 30, first: 1, shade: [], ring: [] } },
    ],
    box: (p) => ({ w: 23, h: calRows(p.first, p.days) * 2 + 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cw = 3 * U,
            ch = 2 * U,
            x0 = U,
            y0 = 4 * U;
        const rows = calRows(p.first, p.days),
            a: RawAnchors = {};
        say(c, x0 + (7 * cw) / 2, 1.5 * U, p.month, 21);
        for (let k = 0; k < 7; k++)
            cap(
                c,
                x0 + k * cw + cw / 2,
                3.3 * U,
                WEEK[k] ?? "",
                12,
                "middle",
                k > 4 ? c.t["ink-soft"] : c.t.ink,
            );
        pen.line(g, x0, 3.7 * U, x0 + 7 * cw, 3.7 * U, "ruler", { strokeWidth: 1.6 });
        for (let d = 1; d <= p.days; d++) {
            const i = p.first + d - 1,
                col = i % 7,
                row = Math.floor(i / 7);
            const x = x0 + col * cw,
                y = y0 + row * ch;
            pen.rect(
                g,
                x,
                y,
                cw,
                ch,
                "ruler",
                p.shade.includes(d) ? pen.fill("sky", "hachure", { hachureGap: 6 }) : null,
                { strokeWidth: 1.3 },
            );
            patch(c, x + cw / 2, y + ch / 2 - 5, 26, 20);
            num(c, x + cw / 2, y + ch / 2 + 6, d, 16);
            if (p.ring.includes(d)) loop(c, x + cw / 2, y + ch / 2, cw - 10, ch - 8);
            a[`day(${d})`] = [x + cw / 2, y, "up"];
        }
        pen.rect(g, x0, y0, 7 * cw, rows * ch, "ruler", null, { strokeWidth: 2.2 });
        return { ...a, title: [x0 + (7 * cw) / 2, U, "up"] };
    },
    describe: () =>
        "A month on a calendar page: the month's name at the top, the days of the week as column heads and the dates in rows of seven, some marked.",
});
