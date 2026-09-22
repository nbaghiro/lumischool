import { letter, group, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { STILL, defineInstrument } from "../drawing";
import { letterOf, noteText, readNote, spokenNote, type Note } from "../../sound/pitch";
import { solfaOf } from "../../sound/scale";
import { type Key } from "../../sound/keys";

const LABELS = ["letters", "solfa"] as const;

interface TuneGridParams {
    /** The rows, lowest first. */
    notes: string[];
    columns: number;
    meter: number;
    /** What is written in each column: a note name, or "-" for nothing. */
    tune: string[];
    /** The column being played, from 0, or -1. */
    now: number;
    labels: (typeof LABELS)[number];
    down: string[];
    lit: string[];
}

const COL = 3;

const ROW = 2.5;

const LEFT = 2.5;

const TOP = 1.5;

interface GridShape {
    rows: Note[];
    columns: number;
    box: { w: number; h: number };
    cell(column: number, row: number): { x: number; y: number; w: number; h: number };
}

function gridShape(p: Pick<TuneGridParams, "notes" | "columns">): GridShape {
    const rows = p.notes.map(readNote).filter((n): n is Note => n !== null);
    const columns = Math.max(1, Math.min(16, Math.round(p.columns || 8)));
    return {
        rows,
        columns,
        box: {
            w: Math.ceil(LEFT + columns * COL + 0.5),
            h: Math.ceil(TOP + rows.length * ROW + 0.5),
        },
        cell: (column, row) => ({
            x: (LEFT + column * COL) * U,
            y: (TOP + (rows.length - 1 - row) * ROW) * U,
            w: COL * U,
            h: ROW * U,
        }),
    };
}

export const cellId = (column: number, note: Note): string => `${column}:${noteText(note)}`;

const layer = <G>(
    c: Ctx<G>,
    key: string,
    kind: "face" | "on" | "down" | "lit" | "focus",
    shown: boolean,
): G =>
    group(c, { data: { key, layer: kind }, ...(kind !== "face" && !shown ? { hidden: true } : {}) })
        .g;

export const tuneGrid = defineInstrument<TuneGridParams>({
    id: "tunegrid",
    family: "music",
    title: "Tune grid",
    group: "Inputs",
    about:
        "Squared paper a tune is written on by tapping: a row for each bar of the glockenspiel, high at the " +
        "top, and a column for each beat with a bar line after every bar. A note written is a head with its " +
        "letter on it, so the tune can be read without hearing it and printed as it was written.",
    voice: "glock",
    params: {
        notes: ["C5", "D5", "E5", "G5", "A5", "C6"],
        columns: 8,
        meter: 4,
        tune: [],
        now: -1,
        labels: "letters",
        down: [],
        lit: [],
    },
    settings: {
        notes: { kind: "words", most: 8 },
        columns: { kind: "whole", min: 2, max: 16 },
        meter: { kind: "whole", min: 2, max: 6 },
        tune: { kind: "words", most: 16 },
        now: { kind: "whole", min: -1, max: 15 },
        labels: { kind: "one of", of: LABELS },
        down: { kind: "words", most: 8 },
        lit: { kind: "words", most: 8 },
    },
    takes: [
        {
            label: "Empty, five notes",
            params: {
                notes: ["C5", "D5", "E5", "G5", "A5", "C6"],
                columns: 8,
                meter: 4,
                tune: [],
                now: -1,
                labels: "letters" as const,
                down: [],
                lit: [],
            },
        },
        {
            label: "A tune written, beat four playing",
            params: {
                notes: ["C5", "D5", "E5", "G5", "A5", "C6"],
                columns: 8,
                meter: 4,
                tune: ["C5", "E5", "G5", "A5", "G5", "-", "D5", "C5"],
                now: 3,
                labels: "letters" as const,
                down: [],
                lit: [],
            },
        },
        {
            label: "In sol-fa",
            params: {
                notes: ["C5", "D5", "E5", "G5", "A5", "C6"],
                columns: 8,
                meter: 4,
                tune: ["G5", "G5", "E5", "-", "G5", "G5", "E5", "-"],
                now: -1,
                labels: "solfa" as const,
                down: [],
                lit: [],
            },
        },
    ],
    box: (p) => gridShape(p).box,

    keys(p) {
        const s = gridShape(p);
        const out: Key[] = [];
        for (let col = 0; col < s.columns; col++) {
            s.rows.forEach((note, row) => {
                const id = cellId(col, note);
                out.push({
                    id,
                    note,
                    anchor: `cell(${id})`,
                    label: letterOf(note),
                    spoken: `${spokenNote(note)}, beat ${col + 1}`,
                    raised: false,
                    hit: s.cell(col, row),
                });
            });
        }
        return out;
    },

    draw: (c, p) => {
        const { pen, g } = c;
        const s = gridShape(p);
        const a: RawAnchors = {};
        const meter = Math.max(1, Math.round(p.meter));
        const tonic = s.rows[0] ?? 72;
        const right = (LEFT + s.columns * COL) * U;
        const top = TOP * U,
            bottom = (TOP + s.rows.length * ROW) * U;
        const name = (n: Note) =>
            p.labels === "solfa" ? (solfaOf(n, tonic) ?? letterOf(n)) : letterOf(n);

        for (let col = 0; col < s.columns; col++) {
            const now = group(c, {
                data: { key: `col(${col})`, layer: "now" },
                ...(col !== p.now ? { hidden: true } : {}),
            }).g;
            const x = (LEFT + col * COL) * U;
            pen.rect(
                now,
                x + 2,
                top + 2,
                COL * U - 4,
                bottom - top - 4,
                "ruler",
                pen.fill("glow", c.paper ? "hachure" : "solid"),
                { stroke: "none" },
            );
            letter(c, {
                x: x + (COL * U) / 2,
                y: top - 0.45 * U,
                s: String((col % meter) + 1),
                face: "read",
                weight: 600,
                size: 13,
                fill: c.t["ink-soft"],
                anchor: "middle",
            });
        }

        s.rows.forEach((note, row) => {
            const y = s.cell(0, row).y + (ROW * U) / 2;
            pen.line(g, LEFT * U, y, right, y, "ruler", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
            letter(c, {
                x: 1.2 * U,
                y: y + 6.5,
                s: name(note),
                face: "read",
                weight: 700,
                size: 18,
                fill: c.t.ink,
                anchor: "middle",
            });
        });
        pen.rect(g, LEFT * U, top, right - LEFT * U, bottom - top, "ruler", null, {
            strokeWidth: 1.6,
        });
        for (let col = meter; col < s.columns; col += meter) {
            const x = (LEFT + col * COL) * U;
            pen.line(g, x, top - 0.2 * U, x, bottom + 0.2 * U, "ruler", { strokeWidth: 2.2 });
        }

        const written = p.tune.map((t) => (t === "-" ? null : readNote(t)));
        const down = new Set(p.down);
        const lit = new Set(p.lit);
        for (let col = 0; col < s.columns; col++) {
            s.rows.forEach((note, row) => {
                const id = cellId(col, note);
                const r = s.cell(col, row);
                const cx = r.x + r.w / 2,
                    cy = r.y + r.h / 2;
                const face = layer(c, id, "face", true);
                pen.circle(face, cx, cy, 7, "ruler", pen.fill("card"), {
                    strokeWidth: 1,
                    stroke: c.t["ink-soft"],
                });
                const on = layer(c, id, "on", written[col] === note);
                pen.ellipse(
                    on,
                    cx,
                    cy,
                    34,
                    26,
                    "pencil",
                    { fill: c.t.ink, fillStyle: "solid" },
                    { strokeWidth: 1.2 },
                );
                letter(
                    { ...c, g: on },
                    {
                        x: cx,
                        y: cy + 5,
                        s: name(note),
                        face: "read",
                        weight: 700,
                        size: 14,
                        fill: c.t.card,
                        anchor: "middle",
                    },
                );
                const pressed = layer(c, id, "down", down.has(id));
                pen.ellipse(pressed, cx, cy, 42, 34, "pencil", null, {
                    strokeWidth: 5,
                    stroke: c.t.glow,
                });
                const ring = layer(c, id, "lit", lit.has(id));
                pen.ellipse(ring, cx, cy, 46, 38, "doodle", null, {
                    strokeWidth: 2.4,
                    stroke: c.t.pen,
                });
                const focus = layer(c, id, "focus", false);
                pen.rect(focus, r.x + 3, r.y + 3, r.w - 6, r.h - 6, "ruler", null, {
                    strokeWidth: 1.6,
                    stroke: c.t.pen,
                    strokeLineDash: [5, 4],
                });
                a[`cell(${id})`] = [cx, r.y, "up"];
            });
        }
        a.grid = [(LEFT * U + right) / 2, 0, "up"];
        a.under = [(LEFT * U + right) / 2, s.box.h * U, "down"];
        return a;
    },
    describe: (p) =>
        `Squared paper for a tune, a row for each of ${p.notes.length} notes with its letter at the left and a column for each of ${p.columns} beats, barred.`,
    motion: { still: STILL.input },
});
