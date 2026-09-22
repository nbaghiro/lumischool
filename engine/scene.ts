import { exprProblem, type Piece } from "./expr";
import type { Drawing } from "./parts/drawing";

/** Where a part stands on its scene: at a square, or against another part named by its id. */
export type Place =
    | { rel: "at"; x: number; y: number }
    | { rel: "on"; of: string }
    | { rel: "in"; of: string; index: number }
    | { rel: "right-of" | "left-of" | "below" | "above"; of: string; gap: number };

/** A line of text once its variant is known: the pieces it was written as, and what they filled to. */
export interface TextVal {
    pieces: Piece[];
    parts: string[];
    filled: string;
    blanks: string[];
}

/** One of a list of options: what it shows, and what an answer says to pick it. */
export interface Opt {
    kind: "text" | "num" | "prop";
    label: string;
    value: string;
    prop?: string;
}

export type CValue = number | boolean | string | string[] | (number | null)[] | TextVal | Opt[];

export interface SceneNode {
    type: string;
    id: string;
    v: Record<string, CValue>;
    place: Place | null;
    /** For a row or a column: the ids of the parts it lines up, in order. */
    contains?: string[];
}

/** A mark drawn over another part: a tick, a loop, a highlighter swipe. */
export interface SceneMark {
    type: string;
    target: string;
    solution: boolean;
    v: Record<string, CValue>;
}

export interface SceneArrow {
    from: string;
    to: string;
}

/** In whole squares from the scene's top left corner. */
export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** A scene for one variant: every expression evaluated, every role its prop, every part laid out. */
export interface Scene {
    size: [number, number];
    nodes: SceneNode[];
    arrows: SceneArrow[];
    marks: SceneMark[];
    boxes: Record<string, Box>;
}

const isPlain = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

/** Average width of an Andika glyph at 17 px, in squares of 20 px. */
const CHAR_W = 0.45;

/** Text broken into lines that fit a width in squares, by the same glyph estimate the layout sizes text with. */
export function wrap(s: string, width: number): string[] {
    const max = Math.max(1, Math.floor((width - 0.5) / CHAR_W));
    const lines: string[] = [];
    let line = "";
    for (const w of s.split(/\s+/)) {
        if (line && `${line} ${w}`.length > max) {
            lines.push(line);
            line = w;
        } else line = line ? `${line} ${w}` : w;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
}

/** Rows in a number wall of n bricks: n + (n - 1) + ... + 1. */
export const pyramidRows = (cells: number): number =>
    Math.round((Math.sqrt(8 * cells + 1) - 1) / 2);

/**
 * A setting's value as text: a line of text as what it filled to, a list of options as their labels,
 * and any other list as its entries with commas between; nothing for a setting the scene did not write.
 */
export function shown(v: CValue | undefined): string {
    if (v === undefined) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (Array.isArray(v))
        return v.map((o) => (typeof o === "object" && o !== null ? o.label : String(o))).join(",");
    return v.filled;
}

/** A list of numbers arrives as numbers; a list of words arrives as options carrying their label. */
function listOf(got: CValue, dflt: readonly unknown[], numbers: boolean): unknown[] {
    if (!Array.isArray(got)) return [...dflt];
    return got.map((x) => {
        if (typeof x === "object" && x !== null) return x.label;
        return numbers ? Number(x) : String(x);
    });
}

/**
 * Whether a setting has a spelling in the notation, read as the vocabulary reads it (engine/notation/
 * vocabulary.ts, `kindOf`): a number, a word, text or a list of numbers or words does, and so does an
 * empty list whose setting says what it holds; a list of objects does not, so the drawing keeps its
 * own value for it.
 */
function writable(dflt: unknown, setting: unknown): boolean {
    if (typeof dflt === "number" || typeof dflt === "boolean" || typeof dflt === "string")
        return true;
    if (!Array.isArray(dflt)) return false;
    if (dflt.length === 0)
        return isPlain(setting) && (setting.kind === "numbers" || setting.kind === "words");
    return dflt.every((x) => typeof x === "number") || dflt.every((x) => typeof x === "string");
}

/**
 * The settings to draw a part with: what the scene wrote, over what the drawing defaults to, each
 * value put back into the shape the drawing expects. Concrete scene values arrive as numbers,
 * strings, filled text objects or option lists, which is why this reads them by shape.
 */
export function paramsOf(
    d: Drawing<unknown>,
    wrote: Readonly<Record<string, CValue>>,
): Record<string, unknown> {
    const defaults = isPlain(d.params) ? d.params : {};
    const settings = isPlain(d.settings) ? d.settings : {};
    const out: Record<string, unknown> = { ...defaults };
    for (const [key, dflt] of Object.entries(defaults)) {
        if (!writable(dflt, settings[key])) continue;
        const got = wrote[key];
        if (got === undefined) continue;
        if (typeof dflt === "boolean") out[key] = got === true || got === "true";
        else if (typeof dflt === "number") out[key] = Number(got);
        else if (typeof dflt === "string") out[key] = shown(got);
        else if (Array.isArray(dflt)) {
            const numbers =
                dflt.length === 0
                    ? isPlain(settings[key]) && settings[key].kind === "numbers"
                    : dflt.every((x) => typeof x === "number");
            out[key] = listOf(got, dflt, numbers);
        }
    }
    return out;
}
const isText = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const areTexts = (v: unknown): boolean => Array.isArray(v) && v.every(isText);

function eachProblem(list: unknown, label: string, problem: (v: unknown) => string | null) {
    if (!Array.isArray(list)) return `${label} must be a list`;
    for (const [i, item] of list.entries()) {
        const found = problem(item);
        if (found !== null) return `${label}[${i}]: ${found}`;
    }
    return null;
}

function placeProblem(v: unknown): string | null {
    if (v === null) return null;
    if (!isPlain(v)) return "a place must be an object or null";
    switch (v.rel) {
        case "at":
            return isNumber(v.x) && isNumber(v.y) ? null : "a place at a square holds x and y";
        case "on":
            return isText(v.of) ? null : "a place on a part names it";
        case "in":
            return isText(v.of) && isNumber(v.index)
                ? null
                : "a place in a part names it and its index";
        case "right-of":
        case "left-of":
        case "below":
        case "above":
            return isText(v.of) && isNumber(v.gap)
                ? null
                : `a place ${v.rel} a part names it and its gap`;
        default:
            return `"${String(v.rel)}" is not a kind of place`;
    }
}

function pieceProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a piece must be an object";
    switch (v.k) {
        case "text":
            return isText(v.v) ? null : "a text piece holds its text";
        case "blank":
            return isText(v.name) ? null : "a blank names itself";
        case "noun":
            return isText(v.role) && typeof v.many === "boolean"
                ? null
                : "a noun piece names its role and whether it is many";
        case "expr":
            return isText(v.src) ? exprProblem(v.e) : "an expression piece keeps its source";
        default:
            return `"${String(v.k)}" is not a kind of piece`;
    }
}

function optProblem(v: unknown): string | null {
    if (!isPlain(v)) return "an option must be an object";
    const kind = v.kind === "text" || v.kind === "num" || v.kind === "prop";
    return kind && isText(v.label) && isText(v.value) && (v.prop === undefined || isText(v.prop))
        ? null
        : "an option holds its kind, label and value";
}

function valueProblem(v: unknown): string | null {
    if (typeof v === "boolean" || isText(v) || isNumber(v)) return null;
    if (Array.isArray(v)) {
        if (v.every(isText) || v.every((x) => x === null || isNumber(x))) return null;
        return eachProblem(v, "options", optProblem);
    }
    if (!isPlain(v)) return "a setting is a number, text, a list or a line of text";
    if (!(isText(v.filled) && areTexts(v.parts) && areTexts(v.blanks)))
        return "a line of text holds its parts, what it filled to and its blanks";
    return eachProblem(v.pieces, "pieces", pieceProblem);
}

function settingsProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a part's settings must be an object";
    for (const [key, value] of Object.entries(v)) {
        const found = valueProblem(value);
        if (found !== null) return `${key}: ${found}`;
    }
    return null;
}

function nodeProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a part must be an object";
    if (!(isText(v.type) && isText(v.id))) return "a part holds its type and id";
    if (v.contains !== undefined && !areTexts(v.contains)) return "contains lists the ids of parts";
    return settingsProblem(v.v) ?? placeProblem(v.place);
}

function markProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a mark must be an object";
    return isText(v.type) && isText(v.target) && typeof v.solution === "boolean"
        ? settingsProblem(v.v)
        : "a mark holds its type, its target and whether it is the solution";
}

const arrowProblem = (v: unknown): string | null =>
    isPlain(v) && isText(v.from) && isText(v.to) ? null : "an arrow names the parts it joins";

const boxProblem = (v: unknown): string | null =>
    isPlain(v) && isNumber(v.x) && isNumber(v.y) && isNumber(v.w) && isNumber(v.h)
        ? null
        : "a box holds x, y, w and h";

/**
 * A part's settings as plain values, for code that reads a laid out scene: a line of text as what it
 * filled to, and a list of options as their labels.
 */
export function valuesOf(v: Readonly<Record<string, CValue>>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, x] of Object.entries(v))
        out[key] = Array.isArray(x)
            ? x.map((o) => (typeof o === "object" && o !== null ? o.label : o))
            : typeof x === "object"
              ? x.filled
              : x;
    return out;
}

/** What is wrong with a scene read from outside the program, or null when it is one. */
export function sceneProblem(v: unknown): string | null {
    if (!isPlain(v)) return "a scene must be an object";
    const size = v.size;
    if (!(Array.isArray(size) && size.length === 2 && size.every(isNumber)))
        return "a scene's size is its width and height in squares";
    if (!isPlain(v.boxes)) return "a scene's boxes must be an object";
    for (const [id, box] of Object.entries(v.boxes)) {
        const found = boxProblem(box);
        if (found !== null) return `boxes.${id}: ${found}`;
    }
    return (
        eachProblem(v.nodes, "nodes", nodeProblem) ??
        eachProblem(v.arrows, "arrows", arrowProblem) ??
        eachProblem(v.marks, "marks", markProblem)
    );
}
