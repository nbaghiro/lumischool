// The first view's byte budget: builds the apps and fails when what the site draws before its script
// runs, or what the map at its opening downloads, grows past its budget, when the site's page can
// reach what the map must never carry, or when the site's data and the visitor's pack the build wrote
// do not agree.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { build } from "vite";
import { readIndex, readLesson, readScene, type PackLesson } from "../../engine/pack";
import { refsOf } from "../../school/worlds/art";
import { apply } from "../../school/worlds/choice";
import { corpusFrom } from "../../school/worlds/lessons";
import { readSiteData, SAMPLE_START, sampleChild } from "../../school/worlds/sample";
import { WORLDS, worldById } from "../../school/worlds/worlds";
import { FACES, SITE_SNAPSHOTS } from "../first-view";

const ROOT = join(import.meta.dirname, "..", "..");
const SITE = "apps/site/index.html";
/** The sample child's map behind the site's opening, loaded once the map's box is near (apps/site/page.tsx). */
const GROUND = "apps/site/ground.ts";
/** The loader the opening map's drawings come through, and the catalogue whose loaders it asks. */
const LOADER = "engine/ui/drawings.ts";
const CATALOG = "engine/parts/catalog.ts";

/** In bytes, as the build writes them, before compression. */
const BUDGET = {
    firstJs: 100_000,
    firstCss: 30_000,
    data: 25_000,
    mapJs: 1_850_000,
    kidsFirstJs: 125_000,
    kidsMapJs: 380_000,
    homeFirstJs: 95_000,
};
const KIDS = "apps/kids/index.html";
const HOME = "apps/home/index.html";
const KIDS_MAP = "apps/kids/child.tsx";

/** What nothing the site's page reaches may hold: the notation, the corpus, the server and the scratchpad. */
const SITE_NEVER = [/engine\/notation\//, /content\/curriculum\//, /\/server\//, /\.scratchpad\//];

/** What the opening map's code must never hold besides: the pack's and the lesson's checkers, and the sheet, which the pictures below load. */
const MAP_NEVER = [
    ...SITE_NEVER,
    /engine\/expr\.ts$/,
    /\/prove\.ts$/,
    /engine\/pack\.ts$/,
    /engine\/ui\/lesson/,
    /engine\/ui\/scene\.ts$/,
];

/** What the child's view must never hold: the notation and the corpus, the server, and the scratchpad. */
const KIDS_NEVER = SITE_NEVER;

interface Chunk {
    file: string;
    css: string[];
    imports: string[];
    dynamicImports: string[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

let out = "";
const manifest = new Map<string, Chunk>();
const bytes = (file: string): number => statSync(join(out, file)).size;

before(async () => {
    out = mkdtempSync(join(tmpdir(), "lumischool-first-view-"));
    process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = "true";
    await build({
        configFile: join(ROOT, "vite.config.ts"),
        logLevel: "error",
        build: { outDir: out, emptyOutDir: true, manifest: true, sourcemap: true },
    });
    const raw: unknown = JSON.parse(readFileSync(join(out, ".vite/manifest.json"), "utf8"));
    if (!isRecord(raw)) return;
    for (const [key, v] of Object.entries(raw)) {
        if (isRecord(v) && typeof v.file === "string") {
            manifest.set(key, {
                file: v.file,
                css: strings(v.css),
                imports: strings(v.imports),
                dynamicImports: strings(v.dynamicImports),
            });
        }
    }
});

after(() => {
    if (out) rmSync(out, { recursive: true, force: true });
});

/** The chunks a key reaches, by its static imports only or by dynamic ones too, leaving out `without`. */
function reach(key: string, dynamic: boolean, without = new Set<string>()): Chunk[] {
    const seen = new Set<string>();
    const found: Chunk[] = [];
    const todo = [key];
    for (let k = todo.pop(); k !== undefined; k = todo.pop()) {
        const chunk = manifest.get(k);
        if (!chunk || seen.has(k) || without.has(k)) continue;
        seen.add(k);
        found.push(chunk);
        todo.push(...chunk.imports, ...(dynamic ? chunk.dynamicImports : []));
    }
    return found;
}

const fileOf = (source: string): string | undefined =>
    [...manifest].find(([key]) => key.endsWith(source))?.[1].file;

/** The href of every preload in a built page's head. */
const preloads = (app: string): string[] =>
    [...readFileSync(join(out, `apps/${app}/index.html`), "utf8").matchAll(/<link\b[^>]*>/g)]
        .map(([tag]) => tag)
        .filter((tag) => /rel="preload"/.test(tag))
        .map((tag) => /href="([^"]+)"/.exec(tag)?.[1] ?? "");

test("what the site draws before its script runs stays within its budget", () => {
    const first = reach(SITE, false);
    const js = first.reduce((n, c) => n + bytes(c.file), 0);
    const css = [...new Set(first.flatMap((c) => c.css))].reduce((n, f) => n + bytes(f), 0);
    const data = preloads("site").find((href) => /site-data-\w+\.json$/.test(href));
    assert.ok(data, "the site's page links no data");
    assert.ok(
        js <= BUDGET.firstJs,
        `the site's first script is ${js} bytes, over ${BUDGET.firstJs}`,
    );
    assert.ok(
        css <= BUDGET.firstCss,
        `the site's styles are ${css} bytes, over ${BUDGET.firstCss}`,
    );
    const dataBytes = bytes(data.slice(1));
    assert.ok(
        dataBytes <= BUDGET.data,
        `the site's data is ${dataBytes} bytes, over ${BUDGET.data}`,
    );
});

test("each page preloads the faces it waits for, and the site its data and snapshots", () => {
    for (const app of ["site", "home", "kids"]) {
        const links = preloads(app);
        for (const face of FACES) {
            const file = fileOf(face);
            assert.ok(file && links.includes(`/${file}`), `${app} does not preload ${face}`);
        }
    }
    for (const s of SITE_SNAPSHOTS) {
        const file = fileOf(s.source);
        assert.ok(
            file && preloads("site").includes(`/${file}`),
            `the site does not preload ${s.source}`,
        );
    }
});

/**
 * The catalogue's module for each drawing it holds, read off catalog.ts's own loaders, since a
 * loader is a function and the manifest is keyed by source path.
 */
function catalogued(): Map<string, string> {
    const text = readFileSync(join(ROOT, CATALOG), "utf8");
    const paths = new Map<string, string>();
    for (const m of text.matchAll(/(?:"([^"]+)"|([\w.]+)):\s*\(\)\s*=>\s*import\("\.\/([^"]+)"\)/g))
        paths.set(m[1] ?? m[2] ?? "", `engine/parts/${m[3] ?? ""}.ts`);
    return paths;
}

/** The chunks several keys reach together, by static imports only. */
function reachAll(keys: readonly string[], without = new Set<string>()): Chunk[] {
    const seen = new Set<Chunk>();
    for (const k of keys) for (const c of reach(k, false, without)) seen.add(c);
    return [...seen];
}

test("the opening map's code stays within its budget and holds no notation, corpus, pack or sheet, and nothing the site's page reaches is the scratchpad's", () => {
    assert.ok(manifest.has(GROUND), `the build has no ${GROUND}`);
    assert.ok(manifest.has(LOADER), `the build has no ${LOADER}`);
    // What the opening map downloads: the ground and the loader with what each imports, and the
    // chunk of every drawing the worlds name, through the catalogue's own path for it. The
    // loader's whole dynamic reach is the catalogue entire, drawings no map draws included (the
    // letters, the sums, the puzzles), and it grows with every drawing that moves in.
    const paths = catalogued();
    const refs = refsOf(WORLDS.map((w) => w.id));
    const drawings = refs.flatMap((r) => {
        const path = paths.get(r);
        return path === undefined ? [] : [path];
    });
    assert.ok(drawings.length > 0, "no drawing the worlds name is in the catalogue");
    for (const path of drawings)
        assert.ok(manifest.has(path), `the build has no chunk for ${path}`);
    const chunks = reachAll([GROUND, LOADER, ...drawings]);
    const js = chunks.reduce((n, c) => n + bytes(c.file), 0);
    assert.ok(js <= BUDGET.mapJs, `the opening map's code is ${js} bytes, over ${BUDGET.mapJs}`);
    // nothing the map's code holds is on the list it must never hold
    const held: string[] = [];
    for (const c of chunks)
        for (const src of sourcesOf(c.file))
            if (MAP_NEVER.some((re) => re.test(src))) held.push(`${c.file}: ${src}`);
    assert.deepEqual(held, [], "the opening map's code holds modules it must not");
    // and nothing the site's page can reach at all, static or dynamic, is the notation's, the
    // corpus's, the server's or the scratchpad's
    const reached: string[] = [];
    for (const c of reach(SITE, true))
        for (const src of sourcesOf(c.file))
            if (SITE_NEVER.some((re) => re.test(src))) reached.push(`${c.file}: ${src}`);
    assert.deepEqual(reached, [], "the site's page reaches modules it must never hold");
});

test("the child's view stays within its budget: what loads with the page, and what the map screen adds before the drawings", () => {
    assert.ok(manifest.has(KIDS), `the build has no ${KIDS}`);
    assert.ok(manifest.has(KIDS_MAP), `the build has no ${KIDS_MAP}`);
    const first = reach(KIDS, false).reduce((n, c) => n + bytes(c.file), 0);
    assert.ok(
        first <= BUDGET.kidsFirstJs,
        `the child's page loads ${first} bytes of script, over ${BUDGET.kidsFirstJs}`,
    );
    const map = reach(KIDS_MAP, false).reduce((n, c) => n + bytes(c.file), 0);
    assert.ok(
        map <= BUDGET.kidsMapJs,
        `the child's map screen is ${map} bytes of script before the drawings, over ${BUDGET.kidsMapJs}`,
    );
    const held: string[] = [];
    for (const c of reach(KIDS_MAP, true)) {
        const sources = sourcesOf(c.file);
        for (const src of sources)
            if (KIDS_NEVER.some((re) => re.test(src))) held.push(`${c.file}: ${src}`);
    }
    assert.deepEqual(held, [], "the child's map screen holds modules it must not");
});

test("the grown-ups' page stays within its budget: the journal and its sheets come when a card is opened, not with the page", () => {
    assert.ok(manifest.has(HOME), `the build has no ${HOME}`);
    const first = reach(HOME, false).reduce((n, c) => n + bytes(c.file), 0);
    assert.ok(
        first <= BUDGET.homeFirstJs,
        `the grown-ups' page loads ${first} bytes of script, over ${BUDGET.homeFirstJs}`,
    );
    // the sheet a journal draws, and what checks a lesson, are a card's to load: the page that
    // lists the children must not carry them
    const held: string[] = [];
    for (const c of reach(HOME, false))
        for (const src of sourcesOf(c.file))
            if (/engine\/ui\/lesson|school\/lessons/.test(src)) held.push(`${c.file}: ${src}`);
    assert.deepEqual(
        held,
        [],
        "the grown-ups' page holds the lesson sheet before a card is opened",
    );
});

/** The source files a built chunk was made from, from its map. */
function sourcesOf(file: string): string[] {
    const map = join(out, `${file}.map`);
    if (!existsSync(map)) return [];
    const raw: unknown = JSON.parse(readFileSync(map, "utf8"));
    return isRecord(raw) ? strings(raw.sources) : [];
}

/** A lesson file of the visitor's pack, read back through the pack's own checker. */
function visitorLesson(dir: string, file: string): PackLesson {
    const read = readLesson(JSON.parse(readFileSync(join(dir, file), "utf8")));
    assert.ok(read.ok, `${file}: ${read.ok ? "" : read.problem}`);
    return read.lesson;
}

test("the site's data and the visitor's pack the build wrote agree: the journey is the sample child over that pack's index, every file the index names is there, and a lesson holds nothing a visitor's sheet does not show", () => {
    const link = preloads("site").find((href) => /site-data-\w+\.json$/.test(href));
    assert.ok(link, "the site's page links no data");
    const read = readSiteData(JSON.parse(readFileSync(join(out, link.slice(1)), "utf8")));
    assert.ok(read.ok, read.ok ? "" : read.problem);
    const data = read.data;
    assert.match(data.pack, /^\/assets\/site-pack-[0-9a-f]{10}$/);
    const dir = join(out, data.pack.slice(1));
    const index = readIndex(JSON.parse(readFileSync(join(dir, "index.json"), "utf8")));
    assert.ok(index.ok, index.ok ? "" : index.problem);
    const lessons = index.index.lessons;
    assert.ok(lessons.length > 0);
    for (const l of lessons) {
        assert.deepEqual(
            Object.keys(l.levels),
            ["medium"],
            `${l.id} carries a level a visitor does not read`,
        );
        assert.ok(existsSync(join(dir, l.file)), `${l.file} is not in the pack`);
        if (l.first !== null)
            assert.ok(existsSync(join(dir, l.first)), `${l.first} is not in the pack`);
        const lesson = visitorLesson(dir, l.file);
        assert.deepEqual(lesson.levels.medium.grownUps, []);
        for (const section of lesson.levels.medium.sections)
            for (const b of section.blocks) {
                assert.notEqual(b.k, "grown-ups", `${l.id} carries a note for grown-ups`);
                if (b.k !== "ask") continue;
                assert.deepEqual(b.again, [], `${l.id} carries draws for another day`);
                for (const q of b.questions) {
                    assert.deepEqual(q.answers, {}, `${l.id} carries an answer`);
                    assert.deepEqual(q.hints, [], `${l.id} carries a hint`);
                    assert.deepEqual(q.feedback, [], `${l.id} carries feedback`);
                }
            }
    }
    const corpus = corpusFrom(lessons, SAMPLE_START);
    const child = sampleChild(corpus, (id) => apply(worldById(id), undefined, true).world);
    assert.deepEqual(
        data.journey,
        child.now,
        "the journey is not the sample child over the pack the page reads",
    );
    assert.equal(data.words.facts[0]?.n, String(lessons.length));
    assert.equal(data.versions.length, data.words.day.versions);
    assert.ok(data.versions.length > 0, "the day's question is drawn no way at all");
    for (const v of data.versions) {
        const scene = readScene(v);
        assert.ok(scene.ok, scene.ok ? "" : scene.problem);
    }
});
