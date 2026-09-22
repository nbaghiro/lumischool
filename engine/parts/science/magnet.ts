import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, penned, say, soft } from "../lettering";

/** A bar magnet: half the bar carries one pole, half the other, and both are lettered. */
function bar<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    w: number,
    h: number,
    left: string,
    right: string,
): void {
    const { pen, g } = c;
    pen.rect(g, x, y, w / 2, h, "ruler", pen.fill("berry", "solid", { hachureGap: 5 }), {
        strokeWidth: 2.2,
    });
    pen.rect(g, x + w / 2, y, w / 2, h, "ruler", pen.fill("card"), { strokeWidth: 2.2 });
    patch(c, x + w / 4, y + h / 2, 24, 20);
    num(c, x + w / 4, y + h / 2 + 6, left, 18);
    num(c, x + (3 * w) / 4, y + h / 2 + 6, right, 18);
}

function magnetAndThings<G>(c: Ctx<G>, count: number, sticks: number): RawAnchors {
    const { pen, g } = c,
        a: RawAnchors = {};
    bar(c, U, 3.4 * U, 5 * U, 2.2 * U, "N", "S");
    a.magnet = [3.5 * U, 3.4 * U, "up"];
    for (let i = 0; i < count; i++) {
        const cx = (7.5 + i * 3) * U,
            cy = 4.5 * U,
            pulled = i < sticks;
        // An iron nail for the ones it pulls and a wooden peg for the ones it does not, so the shapes
        // carry the answer and the arrow only confirms it. The nail stands upright, because a nail
        // drawn lying down with a point on it reads as an arrow.
        if (pulled) {
            pen.rect(
                g,
                cx - 0.2 * U,
                cy - 1 * U,
                0.4 * U,
                1.6 * U,
                "ruler",
                pen.fill("ink-soft", "solid"),
                { strokeWidth: 1.6 },
            );
            pen.ellipse(
                g,
                cx,
                cy - 1 * U,
                1.1 * U,
                0.4 * U,
                "ruler",
                pen.fill("ink-soft", "solid"),
                { strokeWidth: 1.6 },
            );
            pen.polygon(
                g,
                [
                    [cx - 0.2 * U, cy + 0.6 * U],
                    [cx + 0.2 * U, cy + 0.6 * U],
                    [cx, cy + 1.2 * U],
                ],
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 1 },
            );
            pen.arrow(g, [cx - 0.4 * U, cy - 1.9 * U], [cx - 1.7 * U, cy - 1.9 * U], c.t.pen, 0.05);
        } else {
            pen.path(
                g,
                roundedRect(cx - 0.8 * U, cy - 0.9 * U, 1.6 * U, 1.8 * U, 6),
                "ruler",
                pen.fill("tang", "solid", { hachureGap: 5 }),
                { strokeWidth: 2 },
            );
        }
        patch(c, cx, 7.2 * U - 5, 24, 20);
        say(c, cx, 7.5 * U, "ABCDEFGH"[i] ?? "?", 17);
        a[`thing(${i})`] = [cx, cy - U, "up"];
    }
    return a;
}

function twoMagnets<G>(c: Ctx<G>, same: boolean, show: boolean): RawAnchors {
    const { pen, g } = c;
    // The facing poles are the inner letters: north faces north when they are alike, north faces
    // south when they are not, and the arrows point apart or together to match.
    bar(c, U, 2.6 * U, 6 * U, 2.4 * U, "S", "N");
    bar(c, 11 * U, 2.6 * U, 6 * U, 2.4 * U, same ? "N" : "S", same ? "S" : "N");
    const y = 6.2 * U;
    // for a prediction the arrows are left out and the gap asks instead
    if (!show) penned(c, 9 * U, y + 6, "?", 24);
    else if (same) {
        c.pen.arrow(g, [8.4 * U, y], [6.2 * U, y], c.t.pen, 0.05);
        c.pen.arrow(g, [9.6 * U, y], [11.8 * U, y], c.t.pen, 0.05);
    } else {
        c.pen.arrow(g, [6.4 * U, y], [8.4 * U, y], c.t.pen, 0.05);
        c.pen.arrow(g, [11.6 * U, y], [9.6 * U, y], c.t.pen, 0.05);
    }
    pen.line(g, 9 * U, 2 * U, 9 * U, 5.4 * U, "pencil", {
        strokeWidth: 1,
        strokeLineDash: [5, 5],
        stroke: c.t["ink-soft"],
    });
    return {
        left: [4 * U, 2.6 * U, "up"],
        right: [14 * U, 2.6 * U, "up"],
        gap: [9 * U, 2 * U, "up"],
    };
}

/** A paperclip's size, small or big, as its length and width along the wire's loop. */
const CLIPS = { 1: { len: 1.5 * U, wide: 0.8 * U }, 2: { len: 2.1 * U, wide: 1.1 * U } } as const;

/** A paperclip hanging (its length down the page) or lying (its length across): the outer loop, and the inner loop open at the far end. */
function paperclip<G>(c: Ctx<G>, x: number, y: number, size: 1 | 2, hanging: boolean): void {
    const { pen, g } = c,
        { len, wide } = CLIPS[size],
        w = hanging ? wide : len,
        h = hanging ? len : wide,
        inset = wide * 0.24,
        r = wide / 2 - inset;
    pen.path(g, roundedRect(x, y, w, h, wide / 2), "ruler", null, { strokeWidth: 1.6 });
    const inner = hanging
        ? `M${x + inset} ${y + h - inset * 1.6}V${y + wide / 2}A${r} ${r} 0 0 1 ${x + w - inset} ${y + wide / 2}V${y + h * 0.62}`
        : `M${x + w - inset * 1.6} ${y + inset}H${x + wide / 2}A${r} ${r} 0 0 0 ${x + wide / 2} ${y + h - inset}H${x + w * 0.62}`;
    pen.path(g, inner, "ruler", null, { strokeWidth: 1.2 });
}

/** A magnet held level with a chain of clips hanging from its north end, each hooked on the one above. */
function chain<G>(c: Ctx<G>, clips: number, size: 1 | 2, tag: string): RawAnchors {
    const n = Math.max(1, Math.min(10, Math.round(clips))),
        { len, wide } = CLIPS[size],
        pitch = len * 0.7,
        x = 1.75 * U - wide / 2,
        y0 = 3.2 * U - 0.2 * U;
    bar(c, 0.5 * U, 1.2 * U, 5 * U, 2 * U, "N", "S");
    if (tag) say(c, 6.2 * U, 2.8 * U, tag, 20);
    // each clip hangs a little to one side of the one above, as a chain of clips does
    for (let i = 0; i < n; i++)
        paperclip(c, x + (i % 2 === 0 ? -0.15 : 0.15) * U, y0 + i * pitch, size, true);
    return {
        magnet: [3 * U, 1.2 * U, "up"],
        chain: [1.75 * U, y0 + (n - 1) * pitch + len, "down"],
    };
}

/** One centimetre on the ruler the clip lies on, as the shelf's ruler draws it, so a printed one measures true. */
const CM = 2 * U;

/** A magnet at the zero of a ruler and a clip lying on it, with an arrow from where the clip was to the magnet. */
function reachOf<G>(c: Ctx<G>, reach: number, size: 1 | 2, tag: string): RawAnchors {
    const { pen, g } = c,
        zero = 4.5 * U,
        d = Math.max(1, Math.min(10, Math.round(reach))),
        ry = 3.4 * U,
        rh = 1.6 * U;
    bar(c, 0.5 * U, 2.4 * U, 4 * U, 1.8 * U, "N", "S");
    if (tag) say(c, 2.5 * U, 1.8 * U, tag, 20);
    pen.rect(g, zero - 0.3 * U, ry, 10 * CM + 0.6 * U, rh, "ruler", pen.fill("card"), {
        strokeWidth: 1.6,
    });
    for (let k = 0; k <= 20; k++) {
        const x = zero + (k * CM) / 2,
            whole = k % 2 === 0;
        pen.line(g, x, ry + rh, x, ry + rh - (whole ? 0.55 : 0.3) * U, "ruler", {
            strokeWidth: whole ? 1.3 : 0.9,
        });
        if (whole) num(c, x, ry + rh - 0.7 * U, k / 2, 12);
    }
    soft(c, zero - 0.45 * U, ry + rh - 0.1 * U, "cm", 12, "end");
    const { len, wide } = CLIPS[size],
        cx = zero + d * CM;
    paperclip(c, cx, ry - wide - 0.15 * U, size, false);
    pen.arrow(
        g,
        [cx - 0.1 * U, ry - wide - 0.9 * U],
        [zero + 0.2 * U, ry - wide - 0.9 * U],
        c.t.pen,
        0.05,
    );
    return {
        magnet: [2.5 * U, 2.4 * U, "up"],
        clip: [cx + len / 2, ry - wide - 0.15 * U, "up"],
        zero: [zero, ry + rh, "down"],
    };
}

export const magnet = defineDrawing({
    id: "magnet",
    family: "science",
    title: "Magnet",
    group: "Structures",
    about: "A bar magnet with its poles written on. With things beside it, the ones it pulls have an arrow and the ones it does not are left alone; with two magnets, `same` says whether the poles facing each other are alike, and the arrows follow. It is a number rather than true or false so that a question can vary it. With `mode` chain the magnet is held level and `clips` paperclips hang from its north end in a chain; with `mode` reach it lies at the zero of a ruler in centimetres and a clip lies `reach` centimetres away, with an arrow to the magnet from where it jumped. `clip` is 1 for small clips and 2 for big ones, and `tag` names the magnet. Nothing is written beside the chain or the clip.",
    params: {
        mode: "things",
        count: 4,
        sticks: 2,
        same: 0,
        show: 1,
        clips: 4,
        clip: 1,
        reach: 4,
        tag: "",
    },
    settings: {
        mode: { kind: "one of", of: ["things", "poles", "chain", "reach"] },
        count: { kind: "whole", min: 1, max: 6 },
        sticks: { kind: "whole", min: 0, max: 6 },
        same: { kind: "whole", min: 0, max: 1 },
        show: { kind: "whole", min: 0, max: 1 },
        clips: { kind: "whole", min: 1, max: 10 },
        clip: { kind: "whole", min: 1, max: 2 },
        reach: { kind: "whole", min: 1, max: 10 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        {
            label: "What sticks",
            params: {
                mode: "things",
                count: 4,
                sticks: 2,
                same: 0,
                show: 1,
                clips: 4,
                clip: 1,
                reach: 4,
                tag: "",
            },
        },
        {
            label: "Poles facing, the same",
            params: {
                mode: "poles",
                count: 4,
                sticks: 2,
                same: 1,
                show: 1,
                clips: 4,
                clip: 1,
                reach: 4,
                tag: "",
            },
        },
        {
            label: "Poles facing, different",
            params: {
                mode: "poles",
                count: 4,
                sticks: 2,
                same: 0,
                show: 1,
                clips: 4,
                clip: 1,
                reach: 4,
                tag: "",
            },
        },
        {
            label: "Together or apart?",
            params: {
                mode: "poles",
                count: 4,
                sticks: 2,
                same: 1,
                show: 0,
                clips: 4,
                clip: 1,
                reach: 4,
                tag: "",
            },
        },
        {
            label: "A chain of six small clips",
            params: {
                mode: "chain",
                count: 4,
                sticks: 2,
                same: 0,
                show: 1,
                clips: 6,
                clip: 1,
                reach: 4,
                tag: "A",
            },
        },
        {
            label: "Ten big clips",
            params: {
                mode: "chain",
                count: 4,
                sticks: 2,
                same: 0,
                show: 1,
                clips: 10,
                clip: 2,
                reach: 4,
                tag: "B",
            },
        },
        {
            label: "Pulled from 7 cm",
            params: {
                mode: "reach",
                count: 4,
                sticks: 2,
                same: 0,
                show: 1,
                clips: 4,
                clip: 1,
                reach: 7,
                tag: "C",
            },
        },
        {
            label: "Pulled from 2 cm, a big clip",
            params: {
                mode: "reach",
                count: 4,
                sticks: 2,
                same: 0,
                show: 1,
                clips: 4,
                clip: 2,
                reach: 2,
                tag: "",
            },
        },
    ],
    box: (p) =>
        p.mode === "poles"
            ? { w: 18, h: 8 }
            : p.mode === "chain"
              ? { w: 8, h: 19 }
              : p.mode === "reach"
                ? { w: 27, h: 6 }
                : { w: Math.max(13, p.count * 3 + 8), h: 10 },
    draw: (c, p) => {
        const size = p.clip > 1 ? 2 : 1;
        return p.mode === "poles"
            ? twoMagnets(c, p.same > 0, p.show > 0)
            : p.mode === "chain"
              ? chain(c, p.clips, size, p.tag)
              : p.mode === "reach"
                ? reachOf(c, p.reach, size, p.tag)
                : magnetAndThings(c, p.count, p.sticks);
    },
    describe: (p) =>
        p.mode === "poles"
            ? "Two bar magnets lying end to end with their poles written on, a gap between the two ends that face each other."
            : p.mode === "chain"
              ? "A bar magnet held level with its poles written on, and a chain of paperclips hanging from one end, each clip hooked on the one above."
              : p.mode === "reach"
                ? "A bar magnet lying at the zero of a ruler marked in centimetres, and a paperclip on the ruler with an arrow pointing back to the magnet."
                : "A bar magnet with its poles written on and a row of things beside it, a nail, a clip or a peg, to see which it pulls.",
    reads: true,
});
