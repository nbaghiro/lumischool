import { teachingForLesson } from "../school/tutoring-materials";
// The packs a page reads its lessons from (engine/pack.ts). The curriculum is compiled once, by the
// notation engine (engine/notation/), and read back through the pack's own checker; each pack is then
// written from those lessons, the family's whole and a visitor's through a filter.

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { compileLesson, compileVolume, volumeFile } from "../engine/notation/compile";
import { Workspace } from "../engine/notation/notation";
import {
    factsOf,
    firstSceneOf,
    PACK,
    readLesson,
    type LessonFacts,
    type PackBlock,
    type PackIndex,
    type PackLesson,
    type PackScene,
} from "../engine/pack";

const ROOT = join(import.meta.dirname, "..");

export interface BuiltPack {
    /** sha256 of `indexText`, which names the pack. */
    digest: string;
    index: PackIndex;
    indexText: string;
    /** Each lesson's JSON by its file, `lessons/<id>-<the first ten of its own sha256>.json`. */
    lessons: Map<string, string>;
    /** Each lesson's first drawing by its file, `scenes/<id>-<the first ten of its own sha256>.json`. */
    scenes: Map<string, string>;
    /** Each book a kept lesson reads, by its file, `books/<id>-<the first ten of its notation's sha256>.json`. */
    books: Map<string, string>;
}

const sha256 = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

/** Every notation file under content/curriculum/, keyed as the workspace names them: `items/make-ten.lumi`. */
export function curriculum(): Record<string, string> {
    const root = join(ROOT, "content", "curriculum");
    const out: Record<string, string> = {};
    for (const dir of readdirSync(root))
        for (const f of readdirSync(join(root, dir)))
            if (f.endsWith(".lumi")) out[`${dir}/${f}`] = readFileSync(join(root, dir, f), "utf8");
    return out;
}

/** A hash of every file a compiled lesson can depend on: the curriculum, the engine, the school and this file. */
function sourceHash(): string {
    const hash = createHash("sha256");
    const walk = (dir: string): void => {
        const entries = readdirSync(join(ROOT, dir), { withFileTypes: true }).sort((a, b) =>
            a.name.localeCompare(b.name),
        );
        for (const e of entries) {
            if (e.name === "__tests__" || e.name === "node_modules") continue;
            const path = join(dir, e.name);
            if (e.isDirectory()) walk(path);
            else hash.update(path).update(readFileSync(join(ROOT, path)));
        }
    };
    for (const dir of ["content/curriculum", "engine", "school"]) walk(dir);
    return hash.update(readFileSync(join(ROOT, "tools", "pack.ts"))).digest("hex");
}

const CACHE = join(ROOT, "node_modules", ".cache", "lumischool");

/**
 * Every lesson of the curriculum, compiled once for all the checks of a run that read them: the
 * lessons are kept under node_modules/.cache/lumischool/ by a hash of every source they can depend
 * on, and a kept copy is read back through the pack's checker before it is trusted.
 */
export function curriculumLessons(): PackLesson[] {
    const file = join(CACHE, `lessons-${sourceHash()}.json`);
    try {
        const kept: unknown = JSON.parse(readFileSync(file, "utf8"));
        const read = Array.isArray(kept) ? kept.map((v: unknown) => readLesson(v)) : [];
        const lessons = read.flatMap((r) => (r.ok ? [r.lesson] : []));
        if (read.length > 0 && lessons.length === read.length) return lessons;
    } catch {
        // nothing kept yet for these sources, or a copy that does not read: compile again
    }
    const lessons = compileLessons();
    mkdirSync(dirname(file), { recursive: true });
    for (const old of readdirSync(CACHE))
        if (/^lessons-\w+\.json$/.test(old) && join(CACHE, old) !== file)
            rmSync(join(CACHE, old), { force: true });
    // written beside and moved in, so a run reading at the same moment never sees half a file
    const part = `${file}.${process.pid}`;
    writeFileSync(part, JSON.stringify(lessons));
    renameSync(part, file);
    return lessons;
}

/**
 * Every lesson of the curriculum as the pack carries it, from a workspace over `curriculum()` unless
 * one is given (the site's build reads the words off the same workspace, tools/site-sample.ts). It
 * throws while the curriculum has an error, since a question that cannot be proved does not reach a
 * child.
 */
export function compileLessons(ws = new Workspace(curriculum())): PackLesson[] {
    const errors = [...ws.files.values()].flatMap((f) =>
        f.issues
            .filter((i) => i.level === "error")
            .map((i) => `${f.path}:${i.line}:${i.col} ${i.message}`),
    );
    if (errors.length > 0) {
        throw new Error(
            `the curriculum has ${errors.length} error(s), so no pack was built:\n${errors.slice(0, 20).join("\n")}`,
        );
    }
    // A file that declares no levels hashes its text as written; one that does hashes each level's resolved text.
    return [...ws.lessons.values()].map((lesson) => {
        const compiled = compileLesson(ws, lesson, (kind, id, level) =>
            sha256(ws.textAt(kind, id, level)),
        );
        const read = readLesson(JSON.parse(JSON.stringify(compiled)));
        if (!read.ok)
            throw new Error(
                `${lesson.id} compiled to a lesson the pack cannot read: ${read.problem}`,
            );
        return read.lesson;
    });
}

/** Every volume of the curriculum as the pack carries it, by the file a book lesson names. */
export function compileBooks(ws: Workspace): Map<string, string> {
    return new Map(
        [...ws.volumes.values()].map((v) => [
            volumeFile(v.id, sha256(ws.textAt("volume", v.id, "medium"))),
            JSON.stringify(compileVolume(v)),
        ]),
    );
}

/**
 * A lesson as the visitor's pack on the site carries it (.docs/api.md, "The pack"): the lesson as
 * written, with nothing a visitor's sheet does not show. A visitor reads a sheet with nothing filled
 * in (`lookSheet` without its key in engine/ui/lesson.tsx), so the other levels, the draws for
 * another day, the answers, the hints, the feedback, the explanations, the arranged keys and the
 * notes for grown-ups are left out, which is a seventh of the file.
 */
export function visitorOf(lesson: PackLesson): PackLesson {
    const medium = lesson.levels.medium;
    return {
        ...lesson,
        levels: {
            medium: {
                hash: medium.hash,
                grownUps: [],
                sections: medium.sections.map((s) => ({
                    ...s,
                    blocks: s.blocks.flatMap((b): PackBlock[] => {
                        if (b.k === "grown-ups") return [];
                        if (b.k !== "ask") return [b];
                        return [
                            {
                                ...b,
                                again: [],
                                questions: b.questions.map((q) => ({
                                    ...q,
                                    answers: {},
                                    hints: [],
                                    feedback: [],
                                    explain: null,
                                    arranged: q.arranged ? { ...q.arranged, key: [] } : null,
                                })),
                            },
                        ];
                    }),
                })),
            },
        },
    };
}

/**
 * A pack of the lessons given, each as `keep` returns it: the lesson whole, a part of it, or null to
 * leave it out. The family's pack keeps every lesson whole; the visitor's keeps `visitorOf`.
 */
export function packOf(
    lessons: readonly PackLesson[],
    keep: (lesson: PackLesson) => PackLesson | null = (lesson) => lesson,
    volumes: ReadonlyMap<string, string> = new Map(),
): BuiltPack {
    const files = new Map<string, string>();
    const scenes = new Map<string, string>();
    const books = new Map<string, string>();
    const facts: LessonFacts[] = [];
    for (const lesson of lessons) {
        const original = keep(lesson);
        if (!original) continue;
        const material = teachingForLesson(original.id);
        const kept: PackLesson = material
            ? {
                  ...original,
                  teaching: {
                      schema: 1,
                      material: material.id,
                      version: material.version,
                      hash: sha256(JSON.stringify(material)),
                  },
              }
            : original;
        const text = JSON.stringify(kept);
        const file = `lessons/${kept.id}-${sha256(text).slice(0, 10)}.json`;
        files.set(file, text);
        const scene = firstSceneOf(kept);
        let first: string | null = null;
        if (scene) {
            const drawn: PackScene = { pack: PACK, lesson: kept.id, scene };
            const sceneText = JSON.stringify(drawn);
            first = `scenes/${kept.id}-${sha256(sceneText).slice(0, 10)}.json`;
            scenes.set(first, sceneText);
        }
        facts.push(factsOf(kept, file, first));
        const book = kept.book && volumes.get(kept.book.file);
        if (kept.book && book) books.set(kept.book.file, book);
    }
    facts.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const index: PackIndex = { pack: PACK, lessons: facts };
    const indexText = JSON.stringify(index);
    return { digest: sha256(indexText), index, indexText, lessons: files, scenes, books };
}

/**
 * Writes a pack to a folder the API serves it from: `<out>/<digest>/index.json`, each lesson under
 * `<out>/<digest>/lessons/`, its first drawing under `scenes/` and a book lesson's text under `books/`,
 * and `<out>/current` naming the
 * digest, so an older pack's files can stay for the views that fetched their index before the change.
 */
export function writePack(built: BuiltPack, out: string): string {
    const dir = join(out, built.digest);
    mkdirSync(join(dir, "lessons"), { recursive: true });
    mkdirSync(join(dir, "scenes"), { recursive: true });
    mkdirSync(join(dir, "books"), { recursive: true });
    writeFileSync(join(dir, "index.json"), built.indexText);
    for (const [file, text] of built.lessons) writeFileSync(join(dir, file), text);
    for (const [file, text] of built.scenes) writeFileSync(join(dir, file), text);
    for (const [file, text] of built.books) writeFileSync(join(dir, file), text);
    writeFileSync(join(out, "current"), `${built.digest}\n`);
    return dir;
}

if (import.meta.main) {
    const out = process.argv[2] ?? join(ROOT, "dist/pack");
    const ws = new Workspace(curriculum());
    const built = packOf(compileLessons(ws), undefined, compileBooks(ws));
    const dir = writePack(built, out);
    process.stdout.write(`${built.lessons.size} lessons in ${dir}\n`);
    for (const book of ws.phrasebooks.values()) {
        const rows = ws.coverage.filter((c) => c.language === book.language);
        const short = rows.filter((c) => c.missing.length);
        process.stdout.write(
            `${book.name}: ${rows.length - short.length} of ${rows.length} language lessons offered${short.length ? `; not yet: ${short.map((c) => `${c.lesson} (${c.missing.length} missing)`).join(", ")}` : ""}\n`,
        );
    }
}
