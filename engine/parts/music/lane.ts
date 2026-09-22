import { plain, clip, group, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, say, soft } from "../lettering";
import { TUNINGS, stringName, tuningOf, type TuningName } from "../../sound/fretted";
import { stackOf } from "./fretting";
import { tint, gauge } from "./luthier";

interface LaneParams {
    tuning: TuningName;
    notes: string[];
    values: number[];
    /** Which string is on top: string 1, as tab has it, or the one nearest the chin, as you see it. */
    view: "tab" | "player";
    /** How many beats have gone past the line, which is where a still picture of it stops. */
    past: number;
    /** The note to ring, counting from 0, or -1 for none. */
    ring: number;
    /**
     * Name the strings at the left. Without them the strings start at the very edge, which is how the
     * lane is drawn when it sits against the end of a neck and carries its strings on.
     */
    names: boolean;
}

const LANE_LEFT = 4;

const laneLeft = (p: Partial<Pick<LaneParams, "names">>): number =>
    p.names === false ? 1 : LANE_LEFT;

const LANE_H = 2;

const LANE_BEAT = 4;

const laneLength = (p: Pick<LaneParams, "notes" | "values">): number =>
    (p.notes ?? []).reduce((b, _, i) => b + (p.values?.[i] ?? 1), 0);

export const laneWidth = (
    p: Pick<LaneParams, "notes" | "values"> & Partial<Pick<LaneParams, "names">>,
): number => laneLeft(p) + Math.ceil(laneLength(p) * LANE_BEAT) + 2;

/**
 * The lane: a band for each string, a line on the left where a note is played, and each note a
 * stone with its fret written on it, placed along its string by when it comes. On screen the stones
 * travel to the line; on paper they stay where they are and the page reads as tab spaced by time,
 * one beat to four squares.
 */
export const noteLane = defineDrawing<LaneParams>({
    id: "lane",
    family: "music",
    title: "Note lane",
    group: "Structures",
    about:
        "Notes coming along a lane for each string towards the line where they are played, each one a " +
        "stone with its fret on it, the way a play-along game shows them. On screen the stones travel; " +
        "printed, it is tab spaced by time, a beat to four squares, with the beats ruled across.",
    params: {
        tuning: "uke",
        notes: ["s3f0", "s3f2", "s2f0", "s3f0"],
        values: [1, 1, 2, 1],
        view: "tab",
        past: 0,
        ring: -1,
        names: true,
    },
    settings: {
        tuning: { kind: "one of", of: ["uke", "guitar"] },
        notes: { kind: "words", most: 12 },
        values: { kind: "numbers", min: 0.25, max: 4, most: 12 },
        view: { kind: "one of", of: ["tab", "player"] },
        past: { kind: "number", min: 0, max: 32, step: 0.25 },
        ring: { kind: "whole", min: -1, max: 11 },
        names: { kind: "flag" },
    },
    takes: [
        {
            label: "Notes on their way",
            params: {
                tuning: "uke",
                notes: ["s3f0", "s3f2", "s2f0", "s3f0"],
                values: [1, 1, 2, 1],
                view: "tab",
                past: 0,
                ring: 0,
                names: true,
            },
        },
        {
            label: "As you see your neck",
            params: {
                tuning: "uke",
                notes: ["s2f0", "s3f2", "s3f0", "s3f2", "s2f0"],
                values: [1, 1, 1, 1, 2],
                view: "player",
                past: 0,
                ring: -1,
                names: true,
            },
        },
        {
            label: "A chord coming",
            params: {
                tuning: "guitar",
                notes: ["s1f0_s2f0_s3f0", "s1f3", "s1f0_s2f1_s3f0"],
                values: [2, 1, 2],
                view: "tab",
                past: 0,
                ring: -1,
                names: true,
            },
        },
    ],
    box: (p) => ({
        w: laneWidth(p),
        h: TUNINGS[tuningOf(p.tuning).name].strings.length * LANE_H + 2,
    }),
    draw: (c, p) => {
        const { pen, g } = c;
        const t = tuningOf(p.tuning);
        const n = t.strings.length;
        const w = laneWidth(p);
        const slotOf = (string: number) => (p.view === "player" ? n - string : string - 1);
        const yOf = (string: number) => (1 + slotOf(string) * LANE_H + LANE_H / 2) * U;
        const named = p.names !== false;
        const lineX = laneLeft(p) * U;
        const from = named ? lineX : 0;
        const a: RawAnchors = {};
        for (let s = 1; s <= n; s++) {
            const y = yOf(s);
            // Every other lane washed pale, so a stone's lane is found by eye; nothing is washed on paper,
            // where the ruled line under each lane does the same job.
            if (slotOf(s) % 2 === 0 && !c.paper)
                plain(c, {
                    kind: "rect",
                    x: lineX,
                    y: y - U,
                    w: w * U - lineX - 0.5 * U,
                    h: LANE_H * U,
                    fill: tint(c.t.sky, 0.28),
                });
            pen.line(g, from, y, (w - 0.5) * U, y, "ruler", {
                strokeWidth: gauge(t, s) * 0.8,
                stroke: c.t["ink-soft"],
            });
            if (!named) continue;
            say(c, 1.2 * U, y + 5, stringName(t, s), 14, "middle", c.t["ink-soft"]);
            soft(c, 2.6 * U, y + 5, String(s), 11);
        }
        const total = laneLength(p);
        // Everything that travels is clipped at the line, so a stone that has been played goes under
        // it rather than on over the string names. The id only has to be unique on the page.
        const held = clip(c, {
            kind: "rect",
            x: lineX,
            y: 0,
            w: w * U - lineX,
            h: (n * LANE_H + 2) * U,
        });
        // The beats, ruled across every lane, so a stone's distance from the line is a count.
        const sc = group(held, { data: { lane: "notes" } });
        const scroll = sc.g;
        for (let b = 0; b <= Math.ceil(total); b++) {
            const x = lineX + (b - (p.past ?? 0)) * LANE_BEAT * U;
            if (x <= lineX) continue;
            c.pen.line(scroll, x, 0.6 * U, x, (n * LANE_H + 1.4) * U, "ruler", {
                strokeWidth: 0.8,
                stroke: c.t.grid,
            });
        }
        let at = 0;
        (p.notes ?? []).forEach((entry, i) => {
            const x = lineX + (at - (p.past ?? 0)) * LANE_BEAT * U + 0.9 * U;
            at += p.values?.[i] ?? 1;
            const places = stackOf(entry);
            if (places.length > 1) {
                const ys = places.map((q) => yOf(q.string));
                c.pen.line(scroll, x, Math.min(...ys), x, Math.max(...ys), "ruler", {
                    strokeWidth: 3,
                });
            }
            for (const q of places) {
                const y = yOf(q.string);
                c.pen.circle(scroll, x, y, 1.6 * U, "ruler", c.pen.fill("card"), {
                    strokeWidth: 2,
                });
                num(sc, x, y + 6, q.fret, 16);
            }
            if (i === p.ring && places.length) {
                const ys = places.map((q) => yOf(q.string));
                c.pen.ellipse(
                    scroll,
                    x,
                    (Math.min(...ys) + Math.max(...ys)) / 2,
                    2.4 * U,
                    Math.max(...ys) - Math.min(...ys) + 2.4 * U,
                    "doodle",
                    null,
                    { strokeWidth: 2.4, stroke: c.t.pen },
                );
            }
            a[`note(${i})`] = [x, 0.4 * U, "up"];
        });
        // The line a stone is played on, drawn over the lanes and heavier than anything that moves.
        pen.line(g, lineX, 0.5 * U, lineX, (n * LANE_H + 1.5) * U, "ruler", { strokeWidth: 4.5 });
        cap(c, lineX, (n * LANE_H + 1.9) * U, "play", 10);
        a.line = [lineX, 0.4 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A lane for each string of the ${p.tuning === "uke" ? "ukulele" : "guitar"} running towards the line where notes are played, each note a stone with its fret number on it.`,
});
