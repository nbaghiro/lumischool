import { group, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import {
    CHORD_WORDS,
    changeOf,
    chordTitle,
    soundingOf,
    tuningOf,
    type Place,
    type TuningName,
} from "../../sound/fretted";
import { shapeFor, fingerDot, muteMark, openMark, chordBoxSize, boxFrame } from "./fretting";

interface ChordChangeParams {
    tuning: TuningName;
    from: string;
    to: string;
    frets: number;
}

/**
 * Two chords as one box: the second chord's dots, and for each finger what it did to get there. A
 * finger that stays has a heavy ring round it, one that moves leaves a dashed ring where it was and
 * an arrow to where it lands, and one that lifts leaves a dashed ring and a small arrow up. Only
 * the fingers that move are what a child has to think about, which is the point of the drill.
 */
export const chordChange = defineDrawing<ChordChangeParams>({
    id: "chordchange",
    family: "music",
    title: "Chord change",
    group: "Structures",
    about:
        "Two chords drawn as one: where each finger goes for the second chord, with a heavy ring on a " +
        "finger that stays put, a dashed ring and an arrow for a finger that moves, and a dashed ring on " +
        "one that lifts off. The fingers that stay are the ones a teacher tells a child to keep down.",
    params: { tuning: "uke", from: "Am", to: "F", frets: 4 },
    settings: {
        tuning: { kind: "one of", of: ["uke", "guitar"] },
        from: { kind: "one of", of: CHORD_WORDS },
        to: { kind: "one of", of: CHORD_WORDS },
        frets: { kind: "whole", min: 3, max: 5 },
    },
    takes: [
        { label: "Am to F, one stays", params: { tuning: "uke", from: "Am", to: "F", frets: 4 } },
        { label: "C to Am, both move", params: { tuning: "uke", from: "C", to: "Am", frets: 4 } },
        { label: "Guitar Am to C", params: { tuning: "guitar", from: "Am", to: "C", frets: 4 } },
    ],
    box: (p) => {
        const b = chordBoxSize(
            tuningOf(p.tuning).name,
            Math.max(3, Math.min(5, Math.round(p.frets || 4))),
            true,
        );
        return { w: b.w + 2, h: b.h };
    },
    draw: (c, p) => {
        const tuning = tuningOf(p.tuning).name;
        const frets = Math.max(3, Math.min(5, Math.round(p.frets || 4)));
        const from = shapeFor(tuning, p.from),
            to = shapeFor(tuning, p.to);
        const cc = group(c, { turn: [["translate", U, 0]] });
        const inner = cc.g;
        const { x, y } = boxFrame(cc, tuning, frets, true);
        const a: RawAnchors = {};
        const box = chordBoxSize(tuning, frets, true);
        num(cc, (box.w / 2) * U, 1.7 * U, `${chordTitle(p.from)} to ${chordTitle(p.to)}`, 19);
        if (!from || !to) return a;
        const at = (q: Place): [number, number] => [x(q.string), y(q.fret - 0.5)];
        const d = 1.5 * U;
        for (const m of changeOf(from, to)) {
            if (m.from && m.kind !== "stays") {
                const [px, py] = at(m.from);
                c.pen.circle(inner, px, py, d, "pencil", null, {
                    strokeWidth: 1.6,
                    strokeLineDash: [4, 4],
                    stroke: c.t["ink-soft"],
                });
            }
            if (m.to) {
                const [qx, qy] = at(m.to);
                fingerDot(cc, inner, qx, qy, d, m.finger);
                if (m.kind === "stays")
                    c.pen.circle(inner, qx, qy, d * 1.45, "ruler", null, { strokeWidth: 2.8 });
                if ((m.kind === "moves" || m.kind === "slides") && m.from) {
                    const [px, py] = at(m.from);
                    c.pen.arrow(inner, [px, py], [qx, qy], c.t.pen, 0.3, d * 0.55);
                }
                a[`finger(${m.finger})`] = [qx + U, qy + U, "down"];
            }
            if (m.kind === "lifts" && m.from) {
                const [px, py] = at(m.from);
                c.pen.arrow(
                    inner,
                    [px + 0.4 * U, py - 0.4 * U],
                    [px + 1.1 * U, py - 1.4 * U],
                    c.t.pen,
                    0,
                    2,
                );
                a[`finger(${m.finger})`] = [px + U, py + U, "down"];
            }
        }
        for (const string of soundingOf(to)) {
            if ((to.frets[to.frets.length - string] ?? 0) === 0)
                openMark(cc, inner, x(string), y(0) - 0.8 * U, 6.5);
        }
        for (let string = 1; string <= to.frets.length; string++) {
            if (to.frets[to.frets.length - string] === null)
                muteMark(cc, inner, x(string), y(0) - 0.8 * U, 6);
        }
        return a;
    },
    describe: (p) =>
        `Two chords drawn as one box for the ${p.tuning === "uke" ? "ukulele" : "guitar"}, a ring on each finger that stays and a dashed ring with an arrow on each that moves.`,
});
