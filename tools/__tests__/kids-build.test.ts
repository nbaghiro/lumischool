import assert from "node:assert/strict";
import { test } from "node:test";
import { problemsIn, type Chunk } from "../kids-build";

const manifest = new Map<string, Chunk>([
    [
        "apps/kids/index.html",
        { file: "assets/kids.js", imports: ["_page.js"], dynamicImports: ["apps/kids/who.tsx"] },
    ],
    ["_page.js", { file: "assets/page.js", imports: [], dynamicImports: [] }],
    ["apps/kids/who.tsx", { file: "assets/who.js", imports: ["_page.js"], dynamicImports: [] }],
    [
        "apps/home/index.html",
        {
            file: "assets/home.js",
            imports: ["_page.js"],
            dynamicImports: ["apps/home/family.tsx"],
        },
    ],
    ["apps/home/family.tsx", { file: "assets/family.js", imports: [], dynamicImports: [] }],
]);

const clean: Record<string, string> = {
    "assets/kids.js": 'fetch("/api/kid",{credentials:"same-origin"})',
    "assets/page.js": "const s=e=>`/api/kid/${encodeURIComponent(e)}/state`",
    "assets/who.js": 'import"./page.js"',
    "assets/home.js": 'fetch("/api/me")',
    "assets/family.js": 'fetch("/api/events?kid="+k)',
};

const withText = (file: string, text: string) => (f: string) =>
    f === file ? text : (clean[f] ?? "");

test("a child's build that names only the child's routes passes, and the grown-ups' chunks are not read", () => {
    assert.deepEqual(
        problemsIn(manifest, (f) => clean[f] ?? ""),
        [],
    );
});

test("an adult route is found wherever the child's page reaches it", () => {
    const cases = [
        ["assets/who.js", 'fetch("/api/family")', "/api/family"],
        ["assets/page.js", 'fetch("/api/auth/sign-out",{method:"POST"})', "/api/auth/sign-out"],
        ["assets/kids.js", 'const api="/api/";', "/api/"],
        ["assets/kids.js", 'fetch("/api/kidding")', "/api/kidding"],
    ] as const;
    for (const [file, text, path] of cases)
        assert.deepEqual(problemsIn(manifest, withText(file, text)), [
            `${file}, in the child's build, names ${path}`,
        ]);
});

test("a build with no child's app fails rather than passing unread", () => {
    assert.equal(problemsIn(new Map(), () => "").length, 1);
});
