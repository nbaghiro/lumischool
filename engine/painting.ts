import type { Given } from "./answer";
import { isPigment } from "./pigment";
export type Painting = Extract<Given, { k: "painting" }>;
export type Activity = "draw" | "colour" | "trace" | "follow";
export interface Picture {
    version: 1;
    template_version?: 1;
    id: string;
    title: string;
    painting: Painting;
    activity: Activity;
    idea: string;
    fills: Record<string, string>;
    step: number;
    guides: boolean;
}

const object = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
// Version-one template and motif identities remain supported when new materials are added.
export function isPainting(v: unknown): v is Painting {
    if (
        !object(v) ||
        v.k !== "painting" ||
        !["plain", "squared"].includes(String(v.paper)) ||
        !((v.w === 30 && v.h === 20) || (v.w === 20 && v.h === 30)) ||
        !Array.isArray(v.marks) ||
        v.marks.length > 5000 ||
        v.marks.reduce(
            (n: number, m: unknown) =>
                n + (object(m) && Array.isArray(m.points) ? m.points.length : 0),
            0,
        ) > 300000
    )
        return false;
    return v.marks.every((m) => {
        if (!object(m)) return false;
        if (m.k === "lift") return true;
        if (!["none", "two", "four", "six"].includes(String(m.mirror))) return false;
        if (
            m.k !== "stencil" &&
            (!Array.isArray(m.paint) ||
                m.paint.length > 15 ||
                !m.paint.every(
                    (p) =>
                        object(p) &&
                        typeof p.pigment === "string" &&
                        isPigment(p.pigment) &&
                        typeof p.parts === "number" &&
                        p.parts > 0 &&
                        p.parts <= 100,
                ))
        )
            return false;
        if (m.k === "stroke")
            return (
                ["pencil", "crayon", "marker", "water", "blend", "eraser"].includes(
                    String(m.brush),
                ) &&
                typeof m.size === "number" &&
                m.size > 0 &&
                m.size < 20 &&
                Array.isArray(m.points) &&
                m.points.length >= 3 &&
                m.points.length <= 300000 &&
                m.points.length % 3 === 0 &&
                m.points.every(
                    (n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 1000,
                )
            );
        if (
            typeof m.x !== "number" ||
            !Number.isFinite(m.x) ||
            Math.abs(m.x) > 1000 ||
            typeof m.y !== "number" ||
            !Number.isFinite(m.y) ||
            Math.abs(m.y) > 1000
        )
            return false;
        if (m.k === "fill") return true;
        if (typeof m.size !== "number" || !Number.isFinite(m.size) || m.size <= 0 || m.size > 30)
            return false;
        return m.k === "stamp"
            ? typeof m.stamp === "string" &&
                  PICTURE_MOTIFS.includes(m.stamp) &&
                  typeof m.flip === "boolean"
            : m.k === "stencil" &&
                  typeof m.shape === "string" &&
                  PICTURE_MOTIFS.includes(m.shape) &&
                  typeof m.hole === "boolean";
    });
}
export function isPicture(v: unknown, ideas: readonly string[]): v is Picture {
    return (
        object(v) &&
        v.version === 1 &&
        (v.template_version === undefined || v.template_version === 1) &&
        typeof v.id === "string" &&
        v.id.length <= 80 &&
        typeof v.title === "string" &&
        v.title.length <= 70 &&
        isPainting(v.painting) &&
        ["draw", "colour", "trace", "follow"].includes(String(v.activity)) &&
        typeof v.idea === "string" &&
        ideas.includes(String(v.idea)) &&
        object(v.fills) &&
        Object.values(v.fills).every((c) => typeof c === "string" && /^#[a-f0-9]{6}$/i.test(c)) &&
        typeof v.step === "number" &&
        Number.isInteger(v.step) &&
        v.step >= 0 &&
        v.step < 20 &&
        typeof v.guides === "boolean"
    );
}

/** Indexed paint buffers and tool tables must be complete before they are used. */
export function paintingValue<T>(value: T | undefined): T {
    if (value === undefined) throw new Error("Incomplete painting data");
    return value;
}

export const PICTURE_IDEAS = ["butterfly", "flower", "fish", "bird", "garden", "night"] as const;
const PICTURE_MOTIFS = [
    "leaf",
    "star",
    "fish",
    "flower",
    "shell",
    "bird",
    "butterfly",
    "fern",
    "circle",
    "square",
    "triangle",
    "moon",
    "cloud",
    "drop",
];
const REGION_COUNTS: Record<string, readonly number[]> = {
    butterfly: [5],
    flower: [7],
    fish: [1, 2],
    bird: [1, 1],
    garden: [7, 5, 2],
    night: [1, 1, 1, 1],
};
export const PICTURE_BYTES = 720 * 1024;
export function isStoredPicture(value: unknown): value is Picture {
    if (!isPicture(value, PICTURE_IDEAS)) return false;
    if (
        !Object.keys(value.fills).every((key) => {
            if (!/^\d+-\d+$/.test(key)) return false;
            const [piece, region] = key.split("-").map(Number);
            return (
                piece !== undefined &&
                region !== undefined &&
                region < (REGION_COUNTS[value.idea]?.[piece] ?? 0)
            );
        })
    )
        return false;
    return new TextEncoder().encode(JSON.stringify(value)).byteLength <= PICTURE_BYTES;
}
export function hasPictureWork(picture: Picture): boolean {
    return (
        picture.painting.marks.length > 0 ||
        Object.keys(picture.fills).length > 0 ||
        picture.activity !== "draw"
    );
}
