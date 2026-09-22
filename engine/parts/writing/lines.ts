// A ruled line to write on, with what is written on it in pen when there is, and prose wrapped to a
// width, which the story mountain, the pictures of the steps, the acrostic, the caption strip, the
// growing sentence, the letter and the list share.
import { type Ctx } from "../../ink/surface";
import { U } from "../../paper";
import { wide } from "../lettering";

/** A line to write on: a baseline and a dashed line at the height of a small letter. */
export function writeLine<G>(c: Ctx<G>, x: number, y: number, w: number): void {
    c.pen.line(c.g, x, y, x + w, y, "ruler", { strokeWidth: 1.5 });
    c.pen.line(c.g, x, y - 0.8 * U, x + w, y - 0.8 * U, "ruler", {
        strokeWidth: 0.8,
        strokeLineDash: [5, 6],
        stroke: c.t["ink-soft"],
    });
}

/** Words broken into lines no wider than `max` user units, at the reading size given. */
export function wrapTo(s: string, max: number, size: number): string[] {
    const out: string[] = [];
    let line = "";
    for (const w of s.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${w}` : w;
        if (line && wide(next, size) > max) {
            out.push(line);
            line = w;
        } else line = next;
    }
    if (line) out.push(line);
    return out.length ? out : [""];
}
