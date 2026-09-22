// The child's build names no adult route (.docs/auth.md, "What each build carries"). This builds the
// apps with Vite into a folder of its own, walks every chunk the child's page reaches, whether it is
// loaded with the page or when a screen first opens, and fails on any `/api/` path in those chunks
// that is not under `/api/kid`. `--selftest` plants chunks and fails if a planted route goes unreported.

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const KIDS = "apps/kids/index.html";

const out = (line: string): void => void process.stdout.write(`${line}\n`);
const err = (line: string): void => void process.stderr.write(`${line}\n`);

/** An entry of Vite's build manifest, as far as the walk reads one. */
interface Chunk {
    file: string;
    imports: string[];
    dynamicImports: string[];
}
type Manifest = Map<string, Chunk>;

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

function manifestOf(raw: unknown): Manifest {
    const manifest: Manifest = new Map();
    if (!isRecord(raw)) return manifest;
    for (const [key, v] of Object.entries(raw))
        if (isRecord(v) && typeof v.file === "string")
            manifest.set(key, {
                file: v.file,
                imports: strings(v.imports),
                dynamicImports: strings(v.dynamicImports),
            });
    return manifest;
}

/** Every chunk file an entry reaches, through static and dynamic imports alike. */
function reached(manifest: Manifest, entry: string): string[] {
    const seen = new Set<string>();
    const files: string[] = [];
    const todo = [entry];
    for (let key = todo.pop(); key !== undefined; key = todo.pop()) {
        const chunk = manifest.get(key);
        if (!chunk || seen.has(key)) continue;
        seen.add(key);
        files.push(chunk.file);
        todo.push(...chunk.imports, ...chunk.dynamicImports);
    }
    return files;
}

/** The `/api/` paths a chunk names that are not the child's own, the bare prefix included. */
function adultPaths(text: string): string[] {
    const found = new Set<string>();
    for (const [path] of text.matchAll(/\/api\/[\w\-./:]*/g))
        if (path !== "/api/kid" && !path.startsWith("/api/kid/")) found.add(path);
    return [...found];
}

function problemsIn(manifest: Manifest, read: (file: string) => string): string[] {
    if (!manifest.has(KIDS)) return [`the build has no ${KIDS}, so nothing was checked`];
    return reached(manifest, KIDS).flatMap((file) =>
        adultPaths(read(file)).map((path) => `${file}, in the child's build, names ${path}`),
    );
}

async function build(dir: string): Promise<Manifest> {
    process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = "true";
    const vite = await import("vite");
    await vite.build({
        root: ROOT,
        configFile: join(ROOT, "vite.config.ts"),
        logLevel: "error",
        build: { outDir: dir, emptyOutDir: true, manifest: true, reportCompressedSize: false },
    });
    const raw: unknown = JSON.parse(readFileSync(join(dir, ".vite", "manifest.json"), "utf8"));
    return manifestOf(raw);
}

function selftest(): number {
    const manifest = manifestOf({
        [KIDS]: {
            file: "assets/kids.js",
            imports: ["_page.js"],
            dynamicImports: ["apps/kids/who.tsx"],
        },
        "_page.js": { file: "assets/page.js" },
        "apps/kids/who.tsx": { file: "assets/who.js", imports: ["_page.js"] },
        "apps/home/index.html": {
            file: "assets/home.js",
            imports: ["_page.js"],
            dynamicImports: ["apps/home/family.tsx"],
        },
        "apps/home/family.tsx": { file: "assets/family.js" },
    });
    const clean: Record<string, string> = {
        "assets/kids.js": 'fetch("/api/kid",{credentials:"same-origin"})',
        "assets/page.js": "const s=e=>`/api/kid/${encodeURIComponent(e)}/state`",
        "assets/who.js": 'import"./page.js"',
        "assets/home.js": 'fetch("/api/me")',
        "assets/family.js": 'fetch("/api/events?kid="+k)',
    };
    const planted = [
        {
            what: "an adult route in a screen the child's app opens later",
            file: "assets/who.js",
            text: 'fetch("/api/family")',
            finds: "/api/family",
        },
        {
            what: "an adult route in a chunk both apps share",
            file: "assets/page.js",
            text: 'fetch("/api/auth/sign-out",{method:"POST"})',
            finds: "/api/auth/sign-out",
        },
        {
            what: "the bare prefix a path could be built from",
            file: "assets/kids.js",
            text: 'const api="/api/";',
            finds: "/api/",
        },
        {
            what: "a route that only starts like the child's",
            file: "assets/kids.js",
            text: 'fetch("/api/kidding")',
            finds: "/api/kidding",
        },
    ];

    let failures = 0;
    const cleanProblems = problemsIn(manifest, (file) => clean[file] ?? "");
    if (cleanProblems.length > 0) {
        err(`selftest: the clean build was reported: ${cleanProblems.join("; ")}`);
        failures++;
    }
    for (const p of planted) {
        const [first] = problemsIn(manifest, (file) =>
            file === p.file ? p.text : (clean[file] ?? ""),
        );
        if (first === undefined || !first.endsWith(` ${p.finds}`)) {
            err(`selftest: ${p.what} was not reported`);
            failures++;
        } else {
            out(`selftest: ${p.what} reported: ${first}`);
        }
    }
    if (problemsIn(new Map(), () => "").length === 0) {
        err("selftest: a build with no child's app passed");
        failures++;
    }
    return failures;
}

if (process.argv.includes("--selftest")) process.exit(selftest() === 0 ? 0 : 1);

const dir = mkdtempSync(join(tmpdir(), "lumischool-kids-build-"));
let problems: string[];
let carried = 0;
try {
    const manifest = await build(dir);
    carried = reached(manifest, KIDS).length;
    problems = problemsIn(manifest, (file) => readFileSync(join(dir, file), "utf8"));
} finally {
    rmSync(dir, { recursive: true, force: true });
}
if (problems.length === 0) {
    out(`check:kids-build passed: the ${carried} chunks of the child's build name no adult route`);
    process.exit(0);
}
for (const problem of problems) err(problem);
err(`check:kids-build found ${problems.length} problem(s)`);
process.exit(1);
