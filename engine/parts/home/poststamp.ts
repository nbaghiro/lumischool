import { type RawAnchors } from "../../ink/surface";
import type { Fill } from "../../ink/pen";
import { U, MARKERS, MARKER_WORD, washed, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { ICONS, icon } from "../stories/pictures";

/** The pictures a stamp may carry: the story map's set, or none. */
const PICTURES = [...ICONS, "none"] as const;

/** An outline with the perforations of a sheet of stamps: half circles bitten out along each edge. */
function perforated(x0: number, y0: number, x1: number, y1: number, r: number): string {
    const corners: [number, number][] = [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
    ];
    let d = `M${x0} ${y0}`;
    corners.forEach(([ax, ay], i) => {
        const [bx, by] = corners[(i + 1) % 4] ?? [x0, y0];
        const len = Math.hypot(bx - ax, by - ay),
            n = Math.max(2, Math.round(len / (r * 2.7))),
            step = len / n;
        const ux = (bx - ax) / len,
            uy = (by - ay) / len;
        for (let k = 0; k < n; k++) {
            const cx = ax + ux * step * (k + 0.5),
                cy = ay + uy * step * (k + 0.5);
            d += `L${cx - ux * r} ${cy - uy * r}A${r} ${r} 0 0 0 ${cx + ux * r} ${cy + uy * r}`;
        }
        d += `L${bx} ${by}`;
    });
    return `${d}Z`;
}

/**
 * A postage stamp: a perforated edge, a coloured ground inside a frame, its value in the corner and
 * a small picture from the story map's set. With no picture it is a blank stamp, and its `picture`
 * anchor is where a scene puts one, such as a child's own drawing.
 */
interface PostStampParams {
    picture: string;
    ground: Marker;
    value: string;
    /** A softer ground, washed to under half its strength, for a grown-up's stamp beside a child's. */
    quiet?: number;
    /** The stamp's shape: tall is the 4 by 5 of a sheet of stamps, and square is the grown-ups' own; unset is tall. */
    shape?: "tall" | "square";
}

const hex = (rgbs: readonly [number, number, number]): string =>
    `#${rgbs.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

export const postStamp = defineDrawing<PostStampParams>({
    id: "poststamp",
    family: "home",
    title: "Postage stamp",
    group: "Props",
    about: "A postage stamp with a perforated edge, a coloured ground in a frame, its value in the corner and a small picture on it: a lighthouse, a cottage, a tree, a boat, a lantern or an animal. Blank, it is a frame for a picture a scene puts on it. Two stamps of 2 and one of 5 make a sum a child can see on an envelope. With `quiet` at 1 the ground is washed to under half its strength on screen and left as plain paper in print, which is the stamp a grown-up's portrait stands on beside a child's, and with `shape` at square it is a square stamp with the same edge, frame and margins, so a grown-up's stamp is shaped apart from a child's.",
    params: { picture: "lighthouse", ground: "sky", value: "2" },
    settings: {
        picture: { kind: "one of", of: PICTURES },
        ground: { kind: "one of", of: MARKERS },
        value: { kind: "text", most: 3 },
        // an app register rather than a lesson's, so the notation has no spelling for it
        quiet: { kind: "fixed" },
        shape: { kind: "fixed" },
    },
    takes: [
        {
            label: "A lighthouse, worth 2",
            params: { picture: "lighthouse", ground: "sky", value: "2" },
        },
        { label: "A cottage, worth 5", params: { picture: "cottage", ground: "glow", value: "5" } },
        { label: "A fox", params: { picture: "fox", ground: "mint", value: "1" } },
        { label: "Blank, for a picture", params: { picture: "none", ground: "berry", value: "" } },
        {
            label: "Quiet, for a grown-up's picture",
            params: { picture: "none", ground: "sky", value: "", quiet: 1 },
        },
        {
            label: "Quiet and square, for a grown-up's stamp",
            params: { picture: "none", ground: "mint", value: "", quiet: 1, shape: "square" },
        },
    ],
    box: (p) => ({ w: 4, h: p.shape === "square" ? 4 : 5 }),
    draw: (c, p) => {
        const { pen, g, t } = c;
        const x0 = 0.3 * U,
            y0 = 0.3 * U,
            x1 = 3.7 * U,
            y1 = (p.shape === "square" ? 3.7 : 4.7) * U;
        pen.path(g, perforated(x0, y0, x1, y1, 0.13 * U), "ruler", pen.fill("card"), {
            strokeWidth: 1.2,
        });
        const fx = x0 + 0.42 * U,
            fy = y0 + 0.42 * U,
            fw = x1 - x0 - 0.84 * U,
            fh = y1 - y0 - 0.84 * U;
        // a quiet ground is the marker washed out on screen, and plain paper in print, so a small picture on it stays clear of any hatch
        const ground: Fill =
            (p.quiet ?? 0) > 0
                ? c.paper
                    ? pen.fill("card")
                    : { fill: hex(washed(t[p.ground], 0.42)), fillStyle: "solid" }
                : pen.fill(p.ground, "solid");
        pen.rect(g, fx, fy, fw, fh, "ruler", ground, {
            strokeWidth: 1.1,
            stroke: t["ink-soft"],
        });
        if (p.picture && p.picture !== "none") icon(c, p.picture, fx + fw / 2, fy + fh - 0.35 * U);
        if (p.value) num(c, fx + 0.22 * U, fy + 0.62 * U, p.value, 11, "start");
        const a: RawAnchors = {
            picture: [fx + fw / 2, fy + fh / 2, "up"],
            top: [(x0 + x1) / 2, y0, "up"],
        };
        return a;
    },
    describe: (p) =>
        `A ${p.shape === "square" ? "square " : ""}postage stamp with a perforated edge, a ${(p.quiet ?? 0) > 0 ? "pale " : ""}${MARKER_WORD[p.ground]} ground inside a frame, its value in the corner and ${p.picture && p.picture !== "none" ? `a small picture of a ${p.picture} on it` : "nothing drawn on it yet"}.`,
    reads: true,
});
