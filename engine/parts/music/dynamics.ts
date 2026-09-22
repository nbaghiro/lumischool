import { letter, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

interface DynamicsParams {
    /** The marks in order: pp, p, mp, mf, f, ff, and cresc and dim for the two hairpins. */
    marks: string[];
    /** Write what each one means under it. */
    words: boolean;
    /** The mark to ring, counting from 0, or -1 for none. */
    ring: number;
}

export const DYNAMIC_WORDS: Record<string, string> = {
    pp: "very soft",
    p: "soft",
    mp: "quite soft",
    mf: "quite loud",
    f: "loud",
    ff: "very loud",
    cresc: "getting louder",
    dim: "getting softer",
};

const markWidth = (m: string): number => (m === "cresc" || m === "dim" ? 6 : 4);

export const dynamics = defineDrawing<DynamicsParams>({
    id: "dynamics",
    family: "music",
    title: "Loud and soft marks",
    group: "Structures",
    about:
        "The marks that say how loud to play, written the way music prints them: p for soft and f for " +
        'loud, with m for "quite" in front, and the two hairpins that open for getting louder and close ' +
        "for getting softer. What each means can be written under it.",
    params: { marks: ["p", "mf", "f"], words: true, ring: -1 },
    settings: {
        marks: { kind: "words", most: 6 },
        words: { kind: "flag" },
        ring: { kind: "whole", min: -1, max: 5 },
    },
    takes: [
        { label: "Soft to loud", params: { marks: ["p", "mp", "mf", "f"], words: true, ring: -1 } },
        { label: "The two hairpins", params: { marks: ["cresc", "dim"], words: true, ring: -1 } },
        { label: "Which is soft", params: { marks: ["f", "p", "ff"], words: false, ring: 1 } },
    ],
    box: (p) => ({
        w: Math.max(4, (p.marks ?? []).reduce((w, m) => w + markWidth(m), 0) + 1),
        h: p.words ? 6 : 4,
    }),
    draw: (c, p) => {
        const { pen, g } = c;
        const a: RawAnchors = {};
        let x = 0.5 * U;
        (p.marks ?? []).forEach((m, i) => {
            const w = markWidth(m) * U;
            const cx = x + w / 2;
            if (m === "cresc" || m === "dim") {
                const open: [number, number] =
                    m === "cresc" ? [x + w - 0.6 * U, 2 * U] : [x + 0.6 * U, 2 * U];
                const point: [number, number] =
                    m === "cresc" ? [x + 0.6 * U, 2 * U] : [x + w - 0.6 * U, 2 * U];
                pen.line(g, point[0], point[1], open[0], open[1] - 0.8 * U, "ruler", {
                    strokeWidth: 2,
                });
                pen.line(g, point[0], point[1], open[0], open[1] + 0.8 * U, "ruler", {
                    strokeWidth: 2,
                });
            } else {
                letter(c, {
                    x: cx,
                    y: 2.7 * U,
                    s: m,
                    italic: true,
                    face: "hand",
                    weight: 800,
                    size: 1.9 * U,
                    fill: c.t.ink,
                    anchor: "middle",
                    informal: 40,
                });
            }
            if (p.words) {
                for (const [k, line] of (DYNAMIC_WORDS[m] ?? "").split(" ").entries())
                    say(c, cx, (4.35 + k * 0.85) * U, line, 13, "middle", c.t["ink-soft"]);
            }
            if (i === p.ring)
                pen.ellipse(g, cx, 2 * U, w * 0.95, 2.8 * U, "doodle", null, {
                    strokeWidth: 2.4,
                    stroke: c.t.pen,
                });
            a[`mark(${i})`] = [cx, 0.3 * U, "up"];
            x += w;
        });
        return a;
    },
    describe: () =>
        "The marks that say how loud to play, set in a row the way music prints them, each in its italic letters with its word written underneath.",
});
