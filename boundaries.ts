// Who may import whom, and each module's phase: the reach in .docs/structure.md ("Who may import
// what") as data. tools/scripts/check-boundaries.ts fails the build on an import this does not allow.

/**
 * Where a module's code runs: in an app, only while authoring, nowhere because it is data, or only in
 * the server, which no app contains.
 */
export type Phase = "run" | "author" | "data" | "server";

export interface Module {
    /** The module's path from the root: its file without `.ts`, or its directory. */
    at: string;
    phase: Phase;
    /** The modules it may import, or single files of one, written `ink/surface`. */
    reach: readonly string[];
    /**
     * The packages its files may import, by name, so `solid-js` also allows `solid-js/web`. A suite
     * in `__tests__/` may import Node's builtins as well, since it runs only in Node.
     */
    packages: readonly string[];
}

export interface App {
    phases: readonly Phase[];
    /**
     * Files or modules the app may import beyond its phases, written as in a reach. Whatever an app
     * names here is withheld from every app that does not name it.
     */
    plus: readonly string[];
    /** The packages its files may import, as a module's are. */
    packages: readonly string[];
}

// `worlds`, `family` and `assistant` name the file of `record` they read, `record/record`, so a
// file of `record` they do not name is out of their reach whatever an app imports. `record/read`
// was named here and never written, and `record/household` was named by two apps and never written,
// so both are out of the table until the files land; a reach may not name what is not there. TODO:
// studio (school/studio.ts, author time) gets its row when it moves; until then the check refuses
// its files.
export const MODULES: Record<string, Module> = {
    paper: { at: "engine/paper", phase: "run", reach: [], packages: [] },
    numbers: { at: "engine/numbers", phase: "run", reach: [], packages: [] },
    expr: { at: "engine/expr", phase: "run", reach: ["numbers"], packages: [] },
    answer: { at: "engine/answer", phase: "run", reach: [], packages: [] },
    scene: { at: "engine/scene", phase: "run", reach: ["paper", "expr", "parts"], packages: [] },
    pack: { at: "engine/pack", phase: "run", reach: ["answer", "expr", "scene"], packages: [] },
    ink: {
        at: "engine/ink",
        phase: "run",
        reach: ["paper", "parts", "scene"],
        packages: ["roughjs", "perfect-freehand"],
    },
    parts: {
        at: "engine/parts",
        phase: "run",
        reach: [
            "paper",
            "ink/surface",
            "ink/pen",
            "numbers",
            "sound/pitch",
            "sound/scale",
            "sound/beat",
            "sound/fretted",
            "sound/keys",
            "sound/voices",
            "motion/animation",
            "coding",
            "pigment",
        ],
        packages: [],
    },
    // the program model and its interpreter, a dependency of the coding drawings: the notation derives
    // the coding items' settings from the drawings' params, so a drawing keeps its program and runs it
    coding: { at: "engine/coding", phase: "run", reach: [], packages: [] },
    // paint that mixes like paint, which the painting drawings, the Paint tab and the verifier share
    pigment: { at: "engine/pigment", phase: "run", reach: [], packages: [] },
    // a part the child arranges: its boards, measures and layouts over the lever's and the cuts' maths,
    // which the verifier walks and a page judges by
    arrange: {
        at: "engine/arrange",
        phase: "run",
        reach: ["answer", "expr", "motion/lever", "motion/cuts"],
        packages: [],
    },
    sound: { at: "engine/sound", phase: "run", reach: ["numbers"], packages: [] },
    // planck belongs to `bodies.ts` alone (.docs/structure.md), and it is the only file of `motion`
    // that imports it. This table names packages per module rather than per file, so the row cannot
    // say that; keeping the physics library behind `bodies.ts` is a rule a reader holds, not a check.
    motion: { at: "engine/motion", phase: "run", reach: [], packages: ["planck"] },
    notation: {
        at: "engine/notation",
        phase: "author",
        reach: [
            "parts",
            "games",
            "expr",
            "numbers",
            "scene",
            "ink",
            "sound",
            "answer",
            "pack",
            "arrange",
            "paper",
            "coding",
            "pigment",
        ],
        packages: [],
    },
    ui: {
        at: "engine/ui",
        phase: "run",
        reach: [
            "paper",
            "ink",
            "parts",
            "scene",
            "sound",
            "motion",
            "space",
            "answer",
            "pack",
            "arrange",
            "coding",
        ],
        packages: [
            "solid-js",
            "roughjs",
            "perfect-freehand",
            "@fontsource/andika",
            "@fontsource-variable/shantell-sans",
            "@fontsource-variable/spline-sans-mono",
        ],
    },
    space: { at: "engine/space", phase: "run", reach: ["paper", "ink", "parts"], packages: [] },
    lessons: {
        at: "school/lessons",
        phase: "run",
        reach: ["pack", "answer", "scene", "ink", "expr", "arrange"],
        packages: [],
    },
    games: {
        at: "school/games",
        phase: "run",
        reach: ["parts", "scene", "answer", "motion", "numbers"],
        packages: [],
    },
    worlds: {
        at: "school/worlds",
        phase: "run",
        reach: ["parts", "paper", "motion", "space", "pack", "year", "record/record", "answer"],
        packages: [],
    },
    year: {
        at: "school/year",
        phase: "run",
        reach: ["pack", "answer", "record/record"],
        packages: [],
    },
    tracks: { at: "school/tracks", phase: "run", reach: ["year"], packages: [] },
    voice: { at: "school/voice", phase: "run", reach: [], packages: [] },
    record: { at: "school/record", phase: "run", reach: ["answer", "numbers"], packages: [] },
    family: {
        at: "school/family",
        phase: "run",
        reach: ["pack", "year", "tracks", "record/record", "answer"],
        packages: [],
    },
    assistant: {
        at: "school/assistant",
        phase: "server",
        reach: ["pack", "record/record", "answer"],
        packages: [],
    },
    db: {
        at: "server/db",
        phase: "server",
        reach: ["answer"],
        packages: [
            "drizzle-orm",
            "postgres",
            "node:child_process",
            "node:crypto",
            "node:fs",
            "node:url",
        ],
    },
    server: {
        at: "server",
        phase: "server",
        reach: ["db", "answer", "family", "record", "year", "pack", "assistant"],
        packages: ["node:crypto", "node:fs", "node:http", "node:path", "node:util", "node:zlib"],
    },
};

export const APPS: Record<string, App> = {
    kids: { phases: ["run", "data"], plus: [], packages: ["solid-js"] },
    home: { phases: ["run", "data"], plus: [], packages: ["solid-js"] },
    studio: {
        phases: ["run", "author", "data"],
        plus: [],
        packages: ["solid-js"],
    },
    site: { phases: ["run", "data"], plus: [], packages: ["solid-js"] },
};

/**
 * Files, written as in a reach, that may be imported with `import type` beyond the reach, since a type
 * import is erased at build: by everyone, or by the modules named, where `apps` is every app. Under
 * `verbatimModuleSyntax` an `import { type X }` stays an import, so only `import type` counts.
 */
export const TYPES: Record<string, "everyone" | readonly string[]> = {
    "db/schema": "everyone",
    // engine/ui/api.ts is the one client for the API, so it reads the same shapes as the pages.
    "server/api": ["apps", "ui"],
};
