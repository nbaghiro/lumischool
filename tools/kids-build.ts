// The child's build names no adult route (.docs/auth.md, "What each build carries"): every chunk the
// child's page reaches, whether it loads with the page or when a screen first opens, is read for
// `/api/` paths that are not under `/api/kid`. tools/__tests__/first-view.test.ts runs it over the
// build it makes.

/** An entry of Vite's build manifest, as far as the walk reads one. */
export interface Chunk {
    file: string;
    imports: string[];
    dynamicImports: string[];
}

export const KIDS = "apps/kids/index.html";

/** Every chunk file an entry reaches, through static and dynamic imports alike. */
export function reached(manifest: ReadonlyMap<string, Chunk>, entry: string): string[] {
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

/** Every adult route the child's build names, as a line saying which chunk names it. */
export function problemsIn(
    manifest: ReadonlyMap<string, Chunk>,
    read: (file: string) => string,
): string[] {
    if (!manifest.has(KIDS)) return [`the build has no ${KIDS}, so nothing was checked`];
    return reached(manifest, KIDS).flatMap((file) =>
        adultPaths(read(file)).map((path) => `${file}, in the child's build, names ${path}`),
    );
}
