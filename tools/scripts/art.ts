// Compiles the hand-drawn files in content/art/ into engine/parts/imported/files.ts, the one module
// that Node, the tests, print and the apps read them from, so nothing needs a bundler's glob to find
// them. Run it after adding or changing a file there; tools/scripts/__tests__/art.test.ts fails while
// the module is out of date.
//
//   node --import ./tools/scripts/resolve.ts tools/scripts/art.ts

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";

export const OUT = "engine/parts/imported/files.ts";

const EXTENSION = { svg: ".svg", excalidraw: ".excalidraw", strokes: ".json" } as const;

/**
 * An SVG file's view box and its shapes, each a tag and its attributes in the file's order, as a
 * browser's parser gives them: a line break or a tab in a value reads as a space. The files are one
 * level of shapes with no content (scripts/check-art.mjs in the scratchpad holds them to it), and a
 * file that is anything more is refused rather than read wrongly.
 */
function readSvg(text: string): string {
    const root = /<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/.exec(text);
    if (!root) throw new Error("not one <svg> element");
    const attrs = (s: string): [string, string][] =>
        Array.from(s.matchAll(/\s([\w:-]+)="([^"]*)"/g), (m) => [
            m[1] ?? "",
            (m[2] ?? "").replace(/[\t\n\r]/g, " "),
        ]);
    const view = (attrs(root[1] ?? "").find(([k]) => k === "viewBox")?.[1] ?? "0 0 40 40")
        .split(/[\s,]+/)
        .map(Number);
    const body = (root[2] ?? "").replace(/<!--[\s\S]*?-->/g, "");
    const shapes: { tag: string; attrs: [string, string][] }[] = [];
    const rest = body.replace(
        /<(\w+)((?:\s+[\w:-]+="[^"]*")*)\s*\/>/g,
        (_, tag: string, a: string) => {
            shapes.push({ tag, attrs: attrs(a) });
            return "";
        },
    );
    if (rest.trim() !== "" || text.includes("&")) throw new Error("more than one level of shapes");
    return `view: ${JSON.stringify(view)}, shapes: ${JSON.stringify(shapes)}`;
}

/**
 * What the Excalidraw drawing reads of a scene: the elements not deleted, and only those fields. It
 * draws rectangles, ellipses, diamonds, lines and text, where a text whose first character is `@` is an
 * anchor rather than a line to read, so a scene with anything else is refused rather than drawn without it.
 */
const EXCALIDRAW_FIELDS = [
    "type",
    "x",
    "y",
    "width",
    "height",
    "angle",
    "strokeColor",
    "backgroundColor",
    "fillStyle",
    "strokeWidth",
    "roughness",
    "seed",
    "points",
    "text",
    "fontSize",
    "fontFamily",
] as const;
const DRAWN = ["rectangle", "ellipse", "diamond", "line", "text"];

function readExcalidraw(text: string): string {
    const scene: unknown = JSON.parse(text);
    const elements =
        typeof scene === "object" && scene !== null && "elements" in scene ? scene.elements : null;
    if (!Array.isArray(elements)) throw new Error("no elements");
    const kept = elements.flatMap((e: unknown) => {
        if (typeof e !== "object" || e === null || ("isDeleted" in e && e.isDeleted === true)) {
            return [];
        }
        const read = Object.fromEntries(
            Object.entries(e).filter(([k]) => EXCALIDRAW_FIELDS.some((f) => f === k)),
        );
        if (!DRAWN.some((d) => d === read.type)) {
            throw new Error(`an element the drawing does not draw: ${JSON.stringify(read.type)}`);
        }
        return [read];
    });
    return `elements: ${JSON.stringify(kept)}`;
}

/** Each file of one kind in content/art/, by name, as a line of the module. */
function entries(root: string, kind: keyof typeof EXTENSION, value: (text: string) => string) {
    const folder = `content/art/${kind}`;
    return readdirSync(join(root, folder))
        .filter((f) => f.endsWith(EXTENSION[kind]))
        .sort()
        .map((f) => {
            const name = JSON.stringify(f.slice(0, -EXTENSION[kind].length));
            const file = JSON.stringify(`${folder}/${f}`);
            return `{ name: ${name}, file: ${file}, ${value(readFileSync(join(root, folder, f), "utf8"))} },`;
        })
        .join("\n");
}

/** The module for the files under `root`, formatted as `npm run format` would write it. */
export async function compile(root: string): Promise<string> {
    // A stroke file is JSON, which is already a TypeScript value, so the type checker holds each one
    // to StrokeAsset without anything parsing it at run time.
    const text = [
        "// Generated from content/art/ by tools/scripts/art.ts. Change the files there and run it.",
        'import type { StrokeAsset } from "../../ink/pen";',
        'import type { ExcalidrawElement } from "./hand";',
        "",
        "/** A hand-drawn file, named as a scene places it: its file name without the extension. */",
        "interface HandDrawn {",
        "    name: string;",
        "    file: string;",
        "}",
        "",
        "/** A shape of an SVG file: its tag and its attributes, in the file's order. */",
        "interface Shape {",
        "    tag: string;",
        "    attrs: readonly (readonly [string, string])[];",
        "}",
        "",
        "export const SVG: readonly (HandDrawn & { view: readonly number[]; shapes: readonly Shape[] })[] = [",
        entries(root, "svg", readSvg),
        "];",
        "",
        "export const EXCALIDRAW: readonly (HandDrawn & { elements: readonly ExcalidrawElement[] })[] = [",
        entries(root, "excalidraw", readExcalidraw),
        "];",
        "",
        "export const STROKES: readonly (HandDrawn & { asset: StrokeAsset })[] = [",
        entries(root, "strokes", (s) => `asset: ${s.trim()}`),
        "];",
        "",
    ].join("\n");
    const config = await resolveConfig(join(root, OUT));
    return format(text, { ...config, parser: "typescript" });
}

if (import.meta.main) {
    const root = fileURLToPath(new URL("../..", import.meta.url));
    mkdirSync(dirname(join(root, OUT)), { recursive: true });
    writeFileSync(join(root, OUT), await compile(root));
    process.stdout.write(`wrote ${OUT}\n`);
}
