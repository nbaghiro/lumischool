import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, numOn, say, wide } from "../lettering";
import { BAR, ROW_FILL } from "./bar";

/** A band graph's bar is twenty squares, so each square is five per cent. */
const BAND = 20;

/**
 * Each band's parts as per cent of that band's own total, to one decimal place, with `kinds` parts
 * to a band, band by band. A band whose parts add to nought is all zeros.
 */
export function bandShares(counts: readonly number[], kinds: number): number[][] {
    const per = Math.max(1, kinds),
        out: number[][] = [];
    for (let i = 0; i < counts.length; i += per) {
        const band = counts.slice(i, i + per).map((n) => Math.max(0, n));
        const whole = band.reduce((s, n) => s + n, 0);
        out.push(band.map((n) => (whole ? Math.round((1000 * n) / whole) / 10 : 0)));
    }
    return out;
}

const bandsOf = (p: { counts: readonly number[]; kinds: readonly string[] }): number =>
    Math.ceil(p.counts.length / Math.max(1, p.kinds.length));

export const percentBar = defineDrawing({
    id: "percentbar",
    family: "fractions",
    title: "Percent bar",
    group: "Structures",
    about: "A bar of a hundred with ten marked tenths and the part filled from the left. The same bar carries the fraction and the decimal underneath it, which is where the three ways of saying it meet. With `counts` it is a band graph instead: one band for each name in `bands`, every band twenty squares long for 100 per cent whatever its total, cut into the parts `kinds` names in proportion to their counts (taken band by band), each part's share written in it to one decimal place (or its count, without `show`), the band's total at its right and a key under it. `hide` puts a question mark on parts, numbered along the bands. A part under 10 per cent is too narrow to write in and is left bare.",
    params: {
        percent: 35,
        show: true,
        whole: 0,
        counts: [] as number[],
        bands: [] as string[],
        kinds: [] as string[],
        hide: [] as number[],
    },
    settings: {
        percent: { kind: "whole", min: 0, max: 100 },
        show: { kind: "flag" },
        whole: { kind: "whole", min: 0, max: 1000 },
        counts: { kind: "numbers", min: 0, max: 1000, most: 20 },
        bands: { kind: "words", most: 5 },
        kinds: { kind: "words", most: 4 },
        hide: { kind: "numbers", min: 0, max: 19, most: 20 },
    },
    takes: [
        {
            label: "35 percent",
            params: {
                percent: 35,
                show: true,
                whole: 0,
                counts: [],
                bands: [],
                kinds: [],
                hide: [],
            },
        },
        {
            label: "A half",
            params: {
                percent: 50,
                show: true,
                whole: 0,
                counts: [],
                bands: [],
                kinds: [],
                hide: [],
            },
        },
        {
            label: "Of an amount",
            params: {
                percent: 25,
                show: false,
                whole: 80,
                counts: [],
                bands: [],
                kinds: [],
                hide: [],
            },
        },
        {
            label: "Nearly all of it",
            params: {
                percent: 90,
                show: true,
                whole: 0,
                counts: [],
                bands: [],
                kinds: [],
                hide: [],
            },
        },
        {
            label: "Three classes, three totals",
            params: {
                percent: 0,
                show: true,
                whole: 0,
                counts: [12, 20, 8, 15, 15, 20, 9, 12, 9],
                bands: ["5A", "5B", "5C"],
                kinds: ["Walk", "Bus", "Car"],
                hide: [],
            },
        },
        {
            label: "Two years, a share to find",
            params: {
                percent: 0,
                show: true,
                whole: 0,
                counts: [30, 45, 15, 10, 64, 64, 48, 24],
                bands: ["2024", "2025"],
                kinds: ["Rice", "Bread", "Noodles", "Other"],
                hide: [5],
            },
        },
    ],
    box: (p) => (p.counts.length ? { w: BAND + 9, h: 3 * bandsOf(p) + 5 } : { w: BAR + 4, h: 8 }),
    draw: (c, p) => {
        if (p.counts.length) return bandGraph(c, p);
        const { pen, g } = c,
            x0 = 2 * U,
            w = BAR * U,
            y = 2.4 * U,
            h = 2 * U,
            a: RawAnchors = {};
        const at = (v: number) => x0 + (Math.max(0, Math.min(100, v)) / 100) * w;
        pen.rect(
            g,
            x0,
            y,
            at(p.percent) - x0,
            h,
            "ruler",
            pen.fill("mint", "solid", { hachureGap: 6 }),
            { strokeWidth: 0 },
        );
        for (let k = 1; k < 10; k++)
            pen.line(g, x0 + (k * w) / 10, y, x0 + (k * w) / 10, y + h, "ruler", {
                strokeWidth: k === 5 ? 1.6 : 0.9,
            });
        pen.rect(g, x0, y, w, h, "ruler", null, { strokeWidth: 2.4 });
        pen.line(g, at(p.percent), y - 10, at(p.percent), y + h + 10, "ruler", {
            strokeWidth: 2.4,
            stroke: c.t.pen,
        });
        num(c, x0, y - 14, "0%", 14, "start");
        num(c, x0 + w, y - 14, "100%", 14, "end");
        // The moving label goes under the bar: above it, ninety percent would sit on the hundred.
        num(c, at(p.percent), y + h + 24, `${p.percent}%`, 18, "middle", c.t.pen);
        const a2: RawAnchors = {
            mark: [at(p.percent), y, "up"],
            start: [x0, y + h, "down"],
            end: [x0 + w, y + h, "down"],
        };
        if (p.show) {
            const g100 = (n: number, d: number): number => (d ? g100(d, n % d) : n);
            const d = g100(p.percent, 100) || 1;
            say(
                c,
                x0 + w / 2,
                y + h + 2.6 * U,
                `${p.percent}/100 = ${p.percent / d}/${100 / d} = ${(p.percent / 100).toFixed(2)}`,
                17,
            );
            a2.written = [x0 + w / 2, y + h + 2.8 * U, "down"];
        }
        if (p.whole) {
            say(c, x0 + w / 2, y - 1.6 * U, `of ${p.whole}`, 15);
            a2.whole = [x0 + w / 2, y - 1.8 * U, "up"];
        }
        return { ...a, ...a2 };
    },
    describe: (p) =>
        p.counts.length
            ? `A band graph of ${bandsOf(p)} bands of equal length, each ruled in tenths and cut into parts shaded by a key, with each band's total at its right.`
            : `A percent bar marked 0% and 100% at its ends and ruled into tenths, shaded green from the left to a pencil line${p.show ? ", the fraction and decimal written under it" : ""}.`,
});

function bandGraph<G>(
    c: Ctx<G>,
    p: {
        counts: readonly number[];
        bands: readonly string[];
        kinds: readonly string[];
        hide: readonly number[];
        show: boolean;
    },
): RawAnchors {
    const { pen, g } = c,
        x0 = 5 * U,
        w = BAND * U,
        h = 2 * U,
        per = Math.max(1, p.kinds.length),
        shares = bandShares(p.counts, per),
        a: RawAnchors = {};
    for (let k = 0; k <= 10; k += 5) num(c, x0 + (k * w) / 10, 1.4 * U, `${k * 10}%`, 12);
    say(c, x0 + w + 24, 1.4 * U, "total", 13, "start");
    shares.forEach((band, b) => {
        const y = 2 * U + b * 3 * U,
            counts = p.counts.slice(b * per, b * per + per);
        let left = x0;
        band.forEach((share, k) => {
            const n = b * per + k,
                right =
                    x0 +
                    (w * counts.slice(0, k + 1).reduce((s, v) => s + Math.max(0, v), 0)) /
                        Math.max(
                            1,
                            counts.reduce((s, v) => s + Math.max(0, v), 0),
                        ),
                mid = (left + right) / 2;
            pen.rect(
                g,
                left,
                y,
                right - left,
                h,
                "ruler",
                pen.fill(ROW_FILL[k] ?? "sky", "solid", { hachureGap: 6 }),
                {
                    strokeWidth: 1.6,
                },
            );
            const text = p.hide.includes(n) ? "?" : p.show ? `${share}%` : String(counts[k] ?? 0);
            if (right - left >= Math.max(wide(text, 14) + 6, 1.8 * U))
                numOn(c, mid, y + h / 2 + 5, text, 14);
            a[`part(${n})`] = [mid, y, "up"];
            left = right;
        });
        for (let k = 1; k < 10; k++)
            pen.line(g, x0 + (k * w) / 10, y + h, x0 + (k * w) / 10, y + h + 6, "ruler", {
                strokeWidth: 1.2,
            });
        pen.rect(g, x0, y, w, h, "ruler", null, { strokeWidth: 2.2 });
        say(c, x0 - 10, y + h / 2 + 5, p.bands[b] ?? "", 14, "end");
        const whole = counts.reduce((s, v) => s + Math.max(0, v), 0);
        num(c, x0 + w + 24, y + h / 2 + 6, whole, 15, "start");
        a[`band(${b})`] = [x0 + w / 2, y + h, "down"];
        a[`total(${b})`] = [x0 + w + 2 * U, y, "up"];
    });
    const ky = 2 * U + shares.length * 3 * U + 0.6 * U;
    let kx = x0;
    p.kinds.forEach((kind, k) => {
        pen.rect(g, kx, ky, U, U, "ruler", pen.fill(ROW_FILL[k] ?? "sky"), { strokeWidth: 1.4 });
        say(c, kx + 1.3 * U, ky + U - 4, kind, 14, "start");
        kx += Math.ceil((1.3 * U + wide(kind, 14) + 14) / U) * U;
    });
    a.key = [x0, ky + U, "down"];
    return a;
}
