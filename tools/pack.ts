// The packs a page reads its lessons from (engine/pack.ts). The curriculum is compiled once, by the
// notation engine (engine/notation/), and read back through the pack's own checker; each pack is then
// written from those lessons, the family's whole and a visitor's through a filter.

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compileLesson } from "../engine/notation/compile";
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
): BuiltPack {
    const files = new Map<string, string>();
    const scenes = new Map<string, string>();
    const facts: LessonFacts[] = [];
    for (const lesson of lessons) {
        const kept = keep(lesson);
        if (!kept) continue;
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
    }
    facts.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const index: PackIndex = { pack: PACK, lessons: facts };
    const indexText = JSON.stringify(index);
    return { digest: sha256(indexText), index, indexText, lessons: files, scenes };
}

/**
 * Writes a pack to a folder the API serves it from: `<out>/<digest>/index.json`, each lesson under
 * `<out>/<digest>/lessons/` and its first drawing under `scenes/`, and `<out>/current` naming the
 * digest, so an older pack's files can stay for the views that fetched their index before the change.
 */
export function writePack(built: BuiltPack, out: string): string {
    const dir = join(out, built.digest);
    mkdirSync(join(dir, "lessons"), { recursive: true });
    mkdirSync(join(dir, "scenes"), { recursive: true });
    writeFileSync(join(dir, "index.json"), built.indexText);
    for (const [file, text] of built.lessons) writeFileSync(join(dir, file), text);
    for (const [file, text] of built.scenes) writeFileSync(join(dir, file), text);
    writeFileSync(join(out, "current"), `${built.digest}\n`);
    return dir;
}

if (import.meta.main) {
    const out = process.argv[2] ?? join(ROOT, "dist/pack");
    const built = packOf(compileLessons());
    const dir = writePack(built, out);
    process.stdout.write(`${built.lessons.size} lessons in ${dir}\n`);
}
