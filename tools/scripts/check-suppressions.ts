// Fails when an escape hatch lands in a file git lists. oxlint honours `eslint-disable` and
// `oxlint-disable` comments and has no switch to refuse them, so this guard is what makes them illegal
// rather than discouraged. It also reads the files the lint skips, and the markers no linter models. A
// genuine exception goes in ALLOW with its reason, so it arrives in a reviewed diff.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseSync, Visitor, type ESTree } from "vite";

const SELF = "tools/scripts/check-suppressions.ts";

type Directive = "lint-disable" | "ts-comment" | "prettier-ignore" | "coverage-ignore";
type Marker = Directive | "double-assertion" | "non-null" | "any";

// Matched against the whole text of a comment, which may run over several lines, and anchored to its
// start, because a directive takes effect only there and prose that names one must not trip the guard.
const DIRECTIVES: readonly (readonly [Directive, RegExp])[] = [
    ["lint-disable", /^[\s*/]*(?:eslint|oxlint)-(?:disable|enable)(?:-next-line|-line)?\b/],
    ["ts-comment", /^[\s*/]*@ts-(?:ignore|expect-error|nocheck)\b/],
    ["prettier-ignore", /^[\s*/]*prettier-ignore\b/],
    ["coverage-ignore", /^[\s*/]*(?:v8|c8|istanbul) ignore\b/],
];

const ALLOW: Partial<Record<Marker, readonly string[]>> = {};

const SCANNED = /\.(?:ts|tsx|js|mjs|cjs|css|html)$/;
const CODE = /\.(?:[cm]?[jt]s|[jt]sx)$/;

interface Hit {
    marker: Marker;
    line: number;
    text: string;
}

interface Found {
    hits: Hit[];
    errors: string[];
}

const w = (line: string): void => {
    process.stdout.write(`${line}\n`);
};

const unwrap = (e: ESTree.Expression): ESTree.Expression =>
    e.type === "ParenthesizedExpression" ? unwrap(e.expression) : e;

/** Whether an expression is itself cast to `unknown`, so that casting it again is `as unknown as`. */
function toUnknown(e: ESTree.Expression): boolean {
    const inner = unwrap(e);
    return (
        (inner.type === "TSAsExpression" || inner.type === "TSTypeAssertion") &&
        inner.typeAnnotation.type === "TSUnknownKeyword"
    );
}

/** The comments of a stylesheet or a page; code's come from its parser. */
const commentsOf = (text: string): { value: string; start: number }[] =>
    [...text.matchAll(/\/\*([\s\S]*?)\*\/|<!--([\s\S]*?)-->/g)].map((m) => ({
        value: m[1] ?? m[2] ?? "",
        start: m.index,
    }));

function read(file: string, text: string): Found {
    const lines = text.split("\n");
    const hits: Hit[] = [];
    const hit = (marker: Marker, start: number): void => {
        const line = text.slice(0, start).split("\n").length;
        hits.push({ marker, line, text: (lines[line - 1] ?? "").trim().slice(0, 90) });
    };
    const directives = (comments: readonly { value: string; start: number }[]): void => {
        for (const { value, start } of comments) {
            for (const [marker, re] of DIRECTIVES) if (re.test(value)) hit(marker, start);
        }
    };
    if (!CODE.test(file)) {
        directives(commentsOf(text));
        return { hits, errors: [] };
    }
    const parsed = parseSync(file, text);
    directives(parsed.comments);
    new Visitor({
        TSAsExpression: (n) => {
            if (toUnknown(n.expression)) hit("double-assertion", n.start);
        },
        TSTypeAssertion: (n) => {
            if (toUnknown(n.expression)) hit("double-assertion", n.start);
        },
        TSNonNullExpression: (n) => hit("non-null", n.start),
        TSAnyKeyword: (n) => hit("any", n.start),
    }).visit(parsed.program);
    return { hits, errors: parsed.errors.map((e) => e.message) };
}

const SAMPLES: readonly { file: string; text: string; found: readonly Marker[] }[] = [
    {
        file: "line.ts",
        text: "// oxlint-disable-next-line no-console\nconsole.log(1);\n",
        found: ["lint-disable"],
    },
    {
        file: "block.ts",
        text: "/*\n  oxlint-disable no-console\n*/\nconsole.log(1);\n",
        found: ["lint-disable"],
    },
    {
        file: "doc.ts",
        text: "/**\n * @ts-expect-error\n */\nexport const a: string = 1;\n",
        found: ["ts-comment"],
    },
    { file: "page.html", text: "<!-- prettier-ignore -->\n<p>x</p>\n", found: ["prettier-ignore"] },
    {
        file: "sheet.css",
        text: "/* c8 ignore next */\na { color: red; }\n",
        found: ["coverage-ignore"],
    },
    {
        file: "cast.ts",
        text: "export const row = (raw as unknown) as Row;\n",
        found: ["double-assertion"],
    },
    {
        file: "bang.tsx",
        text: "export const P = (p: { a?: string }) => <p>{p.a!}</p>;\n",
        found: ["non-null"],
    },
    { file: "loose.ts", text: "export let q: any;\n", found: ["any"] },
    {
        file: "prose.ts",
        text: [
            "// a comment may say that eslint-disable and @ts-ignore are banned",
            'export const s = "// oxlint-disable, as unknown as";',
            "export const differ = s !== s;",
        ].join("\n"),
        found: [],
    },
];

const broken = SAMPLES.filter(
    ({ file, text, found }) =>
        read(file, text)
            .hits.map((h) => h.marker)
            .join() !== found.join(),
).map((s) => s.file);
if (broken.length) {
    w(`check:suppressions selftest failed: ${broken.join(", ")}`);
    process.exit(1);
}

// Untracked files count: a suppression is caught before it is ever committed.
const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8",
})
    .split("\n")
    .filter((f) => SCANNED.test(f) && existsSync(f));

if (listed.length === 0) {
    w("check:suppressions scanned no files, so it cannot have checked anything");
    process.exit(1);
}

const failures: string[] = [];
const unparsed = (file: string, found: Found): void => {
    for (const e of found.errors)
        failures.push(`  ${file} does not parse, so it may hold more than was found: ${e}`);
};

for (const file of listed) {
    const found = read(file, readFileSync(file, "utf8"));
    unparsed(file, found);
    for (const h of found.hits) {
        if (!ALLOW[h.marker]?.includes(file))
            failures.push(`  ${h.marker}  ${file}:${h.line}  ${h.text}`);
    }
}

if (failures.length === 0) {
    w(`check:suppressions passed (${listed.length} files)`);
    process.exit(0);
}

w("check:suppressions found escape hatches:");
for (const f of failures) w(f);
w("Fix the cause rather than silencing the check. If the escape hatch is genuinely right, add the");
w(`file to ALLOW in ${SELF} with the reason, so the exception is reviewed.`);
process.exit(1);
