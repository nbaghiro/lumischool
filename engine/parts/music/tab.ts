import { plain, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";
import { TUNINGS, stringName, tuningOf, type TuningName } from "../../sound/fretted";
import { stackOf } from "./fretting";

interface TabParams {
    tuning: TuningName;
    /** Places in playing order, as s2f3. Places played together are joined with an underscore. */
    notes: string[];
    /** Beats each, for the proportional layout. Empty means one each. */
    values: number[];
    /** Space the notes evenly, or by how long each lasts. */
    even: boolean;
    /** Write the string names at the start of each line. */
    letters: boolean;
    /** The note to ring, counting from 0, or -1 for none. */
    ring: number;
}

/** One line to a string and one square between lines, the way the staff has one square to a space. */
const TAB_TOP = 2;

const TAB_LEFT = 3;

const TAB_STEP = 3;

const TAB_BEAT = 3;

function tabColumns(p: Pick<TabParams, "notes" | "values" | "even">): number[] {
    if (p.even !== false) return p.notes.map((_, i) => i * TAB_STEP);
    let at = 0;
    return p.notes.map((_, i) => {
        const x = at * TAB_BEAT;
        at += p.values?.[i] ?? 1;
        return x;
    });
}

const tabWidth = (p: Pick<TabParams, "notes" | "values" | "even">): number => {
    const cols = tabColumns(p);
    const lastValue = p.even !== false ? 1 : (p.values?.[p.notes.length - 1] ?? 1);
    const last = cols.length
        ? (cols[cols.length - 1] ?? 0) +
          (p.even !== false ? TAB_STEP : Math.max(1, lastValue) * TAB_BEAT)
        : TAB_STEP;
    return TAB_LEFT + Math.ceil(last) + 1;
};

/**
 * Tab: one line to a string with string 1 on top, and the fret to press written on the line. It is
 * the chart turned a quarter turn, and the player's view turned over, which is the one fact about
 * it a child has to be shown rather than told.
 */
export const tabLines = defineDrawing<TabParams>({
    id: "tab",
    family: "music",
    title: "Tab",
    group: "Structures",
    about:
        "Tab for the ukulele or the guitar: a line for each string with string 1 on top, and on the line " +
        "the fret to press, 0 for the string played open. One square between lines, so tab sits on the " +
        "paper the way the staff does. Evenly spaced to read, or spaced by how long each note lasts.",
    params: {
        tuning: "uke",
        notes: ["s3f0", "s3f2", "s2f0", "s2f1", "s2f3"],
        values: [],
        even: true,
        letters: true,
        ring: -1,
    },
    settings: {
        tuning: { kind: "one of", of: ["uke", "guitar"] },
        notes: { kind: "words", most: 12 },
        values: { kind: "numbers", min: 0.25, max: 4, most: 12 },
        even: { kind: "flag" },
        letters: { kind: "flag" },
        ring: { kind: "whole", min: -1, max: 11 },
    },
    takes: [
        {
            label: "Ukulele, five notes",
            params: {
                tuning: "uke",
                notes: ["s3f0", "s3f2", "s2f0", "s2f1", "s2f3"],
                values: [],
                even: true,
                letters: true,
                ring: -1,
            },
        },
        {
            label: "Guitar, spaced by time",
            params: {
                tuning: "guitar",
                notes: ["s2f1", "s2f3", "s1f0", "s1f1", "s1f3", "s1f0"],
                values: [1, 1, 1, 1, 2, 2],
                even: false,
                letters: true,
                ring: 2,
            },
        },
        {
            label: "A chord in tab",
            params: {
                tuning: "uke",
                notes: ["s4f0_s3f0_s2f0_s1f3", "s4f2_s3f0_s2f0_s1f0"],
                values: [],
                even: true,
                letters: true,
                ring: -1,
            },
        },
    ],
    box: (p) => ({
        w: tabWidth(p),
        h: TAB_TOP + TUNINGS[tuningOf(p.tuning).name].strings.length + 2,
    }),
    draw: (c, p) => {
        const { pen, g } = c;
        const t = tuningOf(p.tuning);
        const n = t.strings.length;
        const w = tabWidth(p);
        const yOf = (string: number) => (TAB_TOP + string - 1) * U;
        const a: RawAnchors = {};
        for (let s = 1; s <= n; s++) {
            pen.line(g, (TAB_LEFT - 0.6) * U, yOf(s), (w - 0.5) * U, yOf(s), "ruler", {
                strokeWidth: 1.3,
            });
            if (p.letters !== false)
                say(c, 1.2 * U, yOf(s) + 5, stringName(t, s), 13, "middle", c.t["ink-soft"]);
        }
        pen.line(g, (TAB_LEFT - 0.6) * U, yOf(1), (TAB_LEFT - 0.6) * U, yOf(n), "ruler", {
            strokeWidth: 2.4,
        });
        const cols = tabColumns(p);
        (p.notes ?? []).forEach((entry, i) => {
            const x = (TAB_LEFT + 0.9 + (cols[i] ?? 0)) * U;
            const places = stackOf(entry);
            for (const q of places) {
                const y = yOf(q.string);
                plain(c, { kind: "rect", x: x - 9, y: y - 9, w: 18, h: 18, fill: c.t.card });
                num(c, x, y + 6, q.fret, 16);
            }
            if (i === p.ring && places.length) {
                const ys = places.map((q) => yOf(q.string));
                pen.ellipse(
                    g,
                    x,
                    (Math.min(...ys) + Math.max(...ys)) / 2,
                    1.8 * U,
                    Math.max(...ys) - Math.min(...ys) + 1.8 * U,
                    "doodle",
                    null,
                    { strokeWidth: 2.4, stroke: c.t.pen },
                );
            }
            a[`note(${i})`] = [x, yOf(1) - 0.8 * U, "up"];
        });
        a.lines = [(w / 2) * U, yOf(1) - 0.6 * U, "up"];
        a.under = [(w / 2) * U, yOf(n) + 1.4 * U, "down"];
        return a;
    },
    describe: (p) =>
        `Tab for the ${p.tuning === "uke" ? "ukulele" : "guitar"}, a line for each string with the first string on top and a fret number on the line where each note is played.`,
});
