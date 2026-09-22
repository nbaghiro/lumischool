// Fails on an import that boundaries.ts does not allow (.docs/structure.md, "Who may import what").
// A file belongs to the module its path is in, and a suite in a drawer's own __tests__/ to the module
// it is named after. Every import counts, type imports included, bar the type-only files in TYPES, and
// a package counts against the packages its row names. `import.meta.glob` imports what it matches, and
// `new URL("...", import.meta.url)` imports the file it names wherever Vite bundles it.
// `--selftest` plants a violation of each rule and fails if one goes unreported.

import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSync, Visitor, type ESTree } from "vite";
import { APPS, MODULES, TYPES, type App, type Module } from "../../boundaries";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

const SOURCE = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const EXTENSION = /(?:\.d)?\.(?:[cm]?[jt]s|[jt]sx)$/;
const GENERATED = new Set(["node_modules", "dist", "coverage"]);

interface Table {
    modules: Readonly<Record<string, Module>>;
    apps: Readonly<Record<string, App>>;
    types: Readonly<Record<string, "everyone" | readonly string[]>>;
}

const TABLE: Table = { modules: MODULES, apps: APPS, types: TYPES };

type Place =
    | { kind: "module"; name: string; module: Module; file: string }
    | { kind: "app"; name: string; app: App }
    | { kind: "outside" }
    | { kind: "scratchpad" }
    | { kind: "nowhere"; why: string };

type Owner = Extract<Place, { kind: "module" | "app" | "outside" }>;

type Target =
    | { kind: "package"; name: string }
    | { kind: "path"; path: string }
    | { kind: "refused"; why: string };

interface Import {
    /** Undefined when the specifier is computed, so the check cannot follow it. */
    spec: string | undefined;
    line: number;
    typeOnly: boolean;
    via: "import" | "glob" | "url";
}

const out = (line: string): void => {
    process.stdout.write(`${line}\n`);
};
const err = (line: string): void => {
    process.stderr.write(`${line}\n`);
};

function list(items: readonly string[]): string {
    const last = items.at(-1);
    if (last === undefined) return "nothing";
    return items.length === 1 ? last : `${items.slice(0, -1).join(", ")} and ${last}`;
}

/** Every source file under the root, as a path from it with forward slashes. */
function walk(root: string, dir = ""): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        if (entry.name.startsWith(".") || GENERATED.has(entry.name)) continue;
        const path = dir === "" ? entry.name : `${dir}/${entry.name}`;
        if (entry.isDirectory()) found.push(...walk(root, path));
        else if (SOURCE.test(entry.name)) found.push(path);
    }
    return found;
}

/**
 * The module or app a path from the root belongs to. `file` names the file as a reach does: the
 * module for a single-file module, `ink/surface` for a file of a directory module.
 */
function placeOf(path: string, table: Table): Place {
    const key = path.replace(EXTENSION, "");
    if (key === ".scratchpad" || key.startsWith(".scratchpad/")) return { kind: "scratchpad" };

    const appName = /^apps\/([^/]+)\//.exec(key)?.[1];
    if (appName !== undefined) {
        const app = table.apps[appName];
        if (app === undefined) {
            return { kind: "nowhere", why: `apps/${appName} is not an app in boundaries.ts` };
        }
        return { kind: "app", name: appName, app };
    }
    if (!key.includes("/") || key.startsWith("tools/")) return { kind: "outside" };

    let place: Place | undefined;
    let longest = -1;
    for (const [name, module] of Object.entries(table.modules)) {
        const { at } = module;
        if (at.length > longest && (key === at || key.startsWith(`${at}/`))) {
            longest = at.length;
            const file = key === at ? name : `${name}/${key.slice(at.length + 1)}`;
            place = { kind: "module", name, module, file };
        }
    }
    if (place) return place;

    const [, drawer, name] = /^([^/]+)\/__tests__\/([a-z]+)[^/]*$/.exec(key) ?? [];
    if (drawer !== undefined && name !== undefined) {
        const module = table.modules[name];
        if (module === undefined) {
            return {
                kind: "nowhere",
                why: `a suite in ${drawer}/__tests__/ is named after the module it tests, as ${drawer}/__tests__/<module>.test.ts`,
            };
        }
        if (module.at !== `${drawer}/${name}`) {
            return {
                kind: "nowhere",
                why: `${name} is at ${module.at}, so its suites go in ${posix.dirname(module.at)}/__tests__/`,
            };
        }
        return { kind: "module", name, module, file: `${name}/__tests__` };
    }
    return { kind: "nowhere", why: "no module in boundaries.ts holds this path" };
}

const literal = (e: ESTree.Expression): string | undefined => {
    if (e.type === "Literal") return typeof e.value === "string" ? e.value : undefined;
    if (e.type === "TemplateLiteral" && e.expressions.length === 0) {
        return e.quasis[0]?.value.cooked ?? undefined;
    }
    return undefined;
};

/** The string an argument spells out, or undefined when it is computed, spread or missing. */
const spelled = (a: ESTree.ArrayExpressionElement | undefined): string | undefined =>
    a === undefined || a === null || a.type === "SpreadElement" ? undefined : literal(a);

/** Whether an expression is `import.meta.url` or `import.meta.glob`. */
const isMeta = (e: ESTree.Argument | undefined, name: "url" | "glob"): boolean =>
    e?.type === "MemberExpression" &&
    !e.computed &&
    e.object.type === "MetaProperty" &&
    e.object.meta.name === "import" &&
    "property" in e &&
    e.property.type === "Identifier" &&
    e.property.name === name;

/**
 * Every import in a source file: static, re-exported, dynamic and in a type, each pattern of an
 * `import.meta.glob`, and the file a `new URL("...", import.meta.url)` names.
 */
function importsOf(path: string, text: string): { imports: Import[]; errors: string[] } {
    const parsed = parseSync(path, text);
    const imports: Import[] = [];
    const add = (
        spec: string | undefined,
        start: number,
        typeOnly: boolean,
        via: Import["via"] = "import",
    ): void => {
        imports.push({ spec, line: text.slice(0, start).split("\n").length, typeOnly, via });
    };
    new Visitor({
        ImportDeclaration: (n) => add(n.source.value, n.start, n.importKind === "type"),
        ExportNamedDeclaration: (n) => {
            if (n.source) add(n.source.value, n.start, n.exportKind === "type");
        },
        ExportAllDeclaration: (n) => add(n.source.value, n.start, n.exportKind === "type"),
        ImportExpression: (n) => add(literal(n.source), n.start, false),
        TSImportType: (n) => add(n.source.value, n.start, true),
        NewExpression: (n) => {
            if (n.callee.type !== "Identifier" || n.callee.name !== "URL") return;
            if (isMeta(n.arguments[1], "url")) add(spelled(n.arguments[0]), n.start, false, "url");
        },
        CallExpression: (n) => {
            if (!isMeta(n.callee, "glob")) return;
            const [first] = n.arguments;
            const patterns = first?.type === "ArrayExpression" ? first.elements : [first];
            for (const pattern of patterns) {
                const spec = spelled(pattern);
                // A pattern that starts with "!" only leaves files out.
                if (!spec?.startsWith("!")) add(spec, n.start, false, "glob");
            }
        },
    }).visit(parsed.program);
    return { imports, errors: parsed.errors.map((e) => e.message) };
}

/** Where a specifier written in the file at `from` leads. */
function targetOf(from: string, spec: string): Target {
    if (spec.startsWith("scratchpad:")) {
        return {
            kind: "refused",
            why: "the root never imports from .scratchpad/, by alias or by path",
        };
    }
    if (spec.startsWith("#")) {
        return {
            kind: "refused",
            why: "this check does not resolve package imports yet; teach it before using one",
        };
    }
    if (!spec.startsWith(".") && !spec.startsWith("/")) {
        const [first = "", second = ""] = spec.split("/");
        return { kind: "package", name: first.startsWith("@") ? `${first}/${second}` : first };
    }
    const path = spec.startsWith("/")
        ? posix.normalize(spec.slice(1))
        : posix.join(posix.dirname(from), spec);
    if (path === ".." || path.startsWith("../")) {
        return { kind: "refused", why: "it leads outside the repository" };
    }
    return { kind: "path", path };
}

/** Why an import from a module to another is not allowed, or undefined when it is. */
function reachRefusal(
    from: Extract<Owner, { kind: "module" | "app" }>,
    to: Extract<Place, { kind: "module" }>,
    typeOnly: boolean,
    table: Table,
): string | undefined {
    const names = (entry: string): boolean => entry === to.name || entry === to.file;
    const by = table.types[to.file];
    const typed =
        by === "everyone" ||
        (by !== undefined && by.includes(from.kind === "app" ? "apps" : from.name));
    if (typed && typeOnly) return undefined;
    const hint = typed ? "; as `import type`, which is erased at build, it would be allowed" : "";

    if (from.kind === "module") {
        if (from.module.reach.some(names)) return undefined;
        return `${from.name} may import ${list(from.module.reach)}, and this is ${to.file}${hint}`;
    }
    if (from.app.plus.some(names)) return undefined;
    const holders = Object.entries(table.apps)
        .filter(([, app]) => app.plus.some(names))
        .map(([name]) => `apps/${name}`);
    if (holders.length > 0) return `only ${list(holders)} may import ${to.file}${hint}`;
    if (from.app.phases.includes(to.module.phase)) return undefined;
    return `${to.name} is ${to.module.phase} code, and apps/${from.name} may contain only ${list(from.app.phases)} code${hint}`;
}

/** Why a file may not import a package, or undefined when it may. */
function packageRefusal(from: Owner, name: string, suite: boolean): string | undefined {
    if (from.kind === "outside") return undefined;
    const { packages } = from.kind === "module" ? from.module : from.app;
    if (packages.includes(name) || (suite && name.startsWith("node:"))) return undefined;
    const who = from.kind === "module" ? from.name : `apps/${from.name}`;
    const may = packages.length > 0 ? `the packages ${list(packages)}` : "no package";
    return `${who} may import ${may}, and this is ${name}; a package it needs goes in its row in boundaries.ts`;
}

/** Why an import is not allowed, or undefined when it is. */
function refusal(
    from: Owner,
    target: Target,
    typeOnly: boolean,
    suite: boolean,
    table: Table,
): string | undefined {
    if (target.kind === "package") return packageRefusal(from, target.name, suite);
    if (target.kind === "refused") return target.why;
    const to = placeOf(target.path, table);
    if (to.kind === "scratchpad") {
        return "the root never imports from .scratchpad/, by alias or by path";
    }
    if (to.kind === "nowhere") return to.why;
    if (to.kind === "app") {
        if (from.kind === "app" && from.name === to.name) return undefined;
        return "nothing imports an app, and what two apps share goes in engine/ui/";
    }
    if (from.kind === "outside") return undefined;
    if (to.kind === "outside")
        return "a module or an app never imports tools/ or the root's own files";
    if (from.kind === "module" && from.name === to.name) return undefined;
    return reachRefusal(from, to, typeOnly, table);
}

/**
 * Problems in the table itself: a name that is not a module, a file of a module that is not there, or
 * a reach that breaks an app's phases. A named file is checked against the tree because a reach that
 * names a file nobody has written says nothing and withholds nothing: `record/read` sat in three
 * reaches and `record/household` in two apps' rows for as long as neither file existed.
 */
function tableProblems(table: Table, root: string, files: boolean): string[] {
    const problems: string[] = [];
    const moduleOf = (entry: string): Module | undefined =>
        table.modules[entry.split("/")[0] ?? entry];
    /** Why a `module/file` entry names nothing, or undefined when the file is there. */
    const missing = (entry: string): string | undefined => {
        if (!files) return undefined;
        const [name, ...rest] = entry.split("/");
        const module = name === undefined ? undefined : table.modules[name];
        if (!module || !rest.length) return undefined;
        const at = join(root, ...module.at.split("/"), ...rest);
        return existsSync(`${at}.ts`) || existsSync(`${at}.tsx`) || existsSync(at)
            ? undefined
            : `${module.at}/${rest.join("/")}.ts is not there`;
    };

    for (const [name, module] of Object.entries(table.modules)) {
        for (const entry of module.reach) {
            const target = moduleOf(entry);
            if (target === undefined) {
                problems.push(`boundaries.ts: ${name} reaches ${entry}, which is not a module`);
                continue;
            }
            const gone = missing(entry);
            if (gone !== undefined) {
                problems.push(`boundaries.ts: ${name} reaches ${entry}, and ${gone}`);
                continue;
            }
            const broken = Object.entries(table.apps).find(
                ([, app]) =>
                    app.phases.includes(module.phase) && !app.phases.includes(target.phase),
            );
            if (broken) {
                problems.push(
                    `boundaries.ts: ${name} (${module.phase}) reaches ${entry} (${target.phase}), so apps/${broken[0]}, which may contain ${name}, would contain ${target.phase} code`,
                );
            }
        }
    }
    for (const [name, app] of Object.entries(table.apps)) {
        for (const entry of app.plus) {
            if (moduleOf(entry) === undefined) {
                problems.push(`boundaries.ts: apps/${name} names ${entry}, which is not a module`);
                continue;
            }
            const gone = missing(entry);
            if (gone !== undefined) {
                problems.push(`boundaries.ts: apps/${name} names ${entry}, and ${gone}`);
            }
        }
    }
    for (const [file, by] of Object.entries(table.types)) {
        if (moduleOf(file) === undefined) {
            problems.push(`boundaries.ts: TYPES names ${file}, which is in no module`);
        } else {
            const gone = missing(file);
            if (gone !== undefined)
                problems.push(`boundaries.ts: TYPES names ${file}, and ${gone}`);
        }
        if (by === "everyone") continue;
        for (const who of by) {
            if (who !== "apps" && table.modules[who] === undefined) {
                problems.push(
                    `boundaries.ts: TYPES names ${who} beside ${file}, which is not a module`,
                );
            }
        }
    }
    return problems;
}

function check(
    root: string,
    table: Table,
    named = true,
): { problems: string[]; files: number; imports: number } {
    const problems = tableProblems(table, root, named);
    let files = 0;
    let imports = 0;
    for (const path of walk(root)) {
        const from = placeOf(path, table);
        // The scratchpad is the prototype, emptied as its modules move in, so it is not read; what it
        // imports from the root is its own business, and nothing at the root may import it.
        if (from.kind === "scratchpad") continue;
        if (from.kind === "nowhere") {
            problems.push(`${path}: ${from.why}`);
            continue;
        }
        files++;
        const suite = path.includes("/__tests__/");
        // Vite bundles the file a URL names. A server's, a suite's or a tool's file runs in Node, which
        // reads that file when it runs and bundles nothing, so there a URL is not an import.
        const bundled =
            !suite &&
            (from.kind === "app" || (from.kind === "module" && from.module.phase !== "server"));
        const found = importsOf(path, readFileSync(join(root, path), "utf8"));
        for (const e of found.errors) {
            problems.push(
                `${path} does not parse, so its imports may not all have been read: ${e}`,
            );
        }
        for (const { spec, line, typeOnly, via } of found.imports) {
            if (via === "url" && !bundled) continue;
            imports++;
            const how =
                via === "glob" ? " through import.meta.glob" : via === "url" ? " by new URL" : "";
            if (spec === undefined) {
                problems.push(
                    `${path}:${line} imports a computed specifier${how}, which this check cannot follow; name the file in a string`,
                );
                continue;
            }
            const target = targetOf(path, spec);
            const why = refusal(from, target, typeOnly, suite, table);
            if (why === undefined) continue;
            const leads = target.kind === "path" ? ` (${target.path})` : "";
            problems.push(`${path}:${line} imports "${spec}"${how}${leads}: ${why}`);
        }
    }
    if (files === 0) problems.push("no source files were read, so nothing was checked");
    return { problems, files, imports };
}

// A small tree that follows every rule, with the imports that look wrong and are not: the type-only
// files, a file one app holds, a suite in a drawer's __tests__/, and imports in comments, strings, a
// regex and JSX text, which are not imports at all.
const CLEAN: Readonly<Record<string, string>> = {
    "engine/answer.ts": "export type Event = { kind: string };\n",
    "engine/paper.ts": [
        '// import { login } from "../server/auth";',
        "export const U = 20;",
        "export const said = 'import \"../.scratchpad/src/core/pen\"';",
        'export const quoted = /from "..\\/server"/;',
    ].join("\n"),
    "engine/ink/surface.ts": [
        'import rough from "roughjs";',
        'import { U } from "../paper";',
        "export const unit = [U, rough];",
    ].join("\n"),
    "engine/parts/tree.ts": 'import { unit } from "../ink/surface";\nexport const tree = unit;\n',
    "engine/__tests__/paper.test.ts": [
        'import { test } from "node:test";',
        'import { U } from "../paper";',
        'export const palette = new URL("../ui/palette.css", import.meta.url);',
        "export const u = [U, test];",
    ].join("\n"),
    "engine/ui/api.ts": [
        'import type { Me } from "../../server/api";',
        'import type { Kid } from "../../server/db/schema";',
        'import type { Event } from "../answer";',
        "export type Seen = [Me, Kid, Event];",
    ].join("\n"),
    "engine/ui/page.tsx": [
        'import "./palette.css";',
        'import { render } from "solid-js/web";',
        'export const sheets = import.meta.glob(["./*.css", "!./print.css"]);',
        'export const palette = new URL("./palette.css", import.meta.url);',
        "export const draw = [render];",
        "export const Page = (p: { pose: string }) => <main>{p.pose}</main>;",
    ].join("\n"),
    "school/family/access.ts": [
        'import type { Event } from "../../engine/answer";',
        'import type { Member } from "../../server/db/schema";',
        "export type Seen = [Event, Member];",
    ].join("\n"),
    "school/family/privacy.ts": 'export const NOTICE = "draft";\n',
    "school/record/household.ts": "export const folder = 1;\n",
    "server/db/schema.ts": [
        'import { pgTable } from "drizzle-orm/pg-core";',
        'import type { Event } from "../../engine/answer";',
        "export type Kid = Event;",
        "export const table = pgTable;",
    ].join("\n"),
    "server/api.ts": 'import type { Kid } from "./db/schema";\nexport type Me = { kids: Kid[] };\n',
    "server/http.ts": [
        'import { createServer } from "node:http";',
        'import { withFamily } from "./db/client";',
        'import { isParent } from "../school/family/access";',
        'export const curriculum = new URL("../content/curriculum", import.meta.url);',
        "export const routes = [createServer, withFamily, isParent];",
    ].join("\n"),
    "server/__tests__/privacy.test.ts": [
        'import { NOTICE } from "../../school/family/privacy";',
        'import { withFamily } from "../db/client";',
        "export const seen = [NOTICE, withFamily];",
    ].join("\n"),
    "apps/home/family.ts": [
        'import * as api from "../../engine/ui/api";',
        'import { NOTICE } from "../../school/family/privacy";',
        'import { folder } from "../../school/record/household";',
        'import type { Me } from "../../server/api";',
        'import type { Kid } from "../../server/db/schema";',
        "export const seen = [api, NOTICE, folder];",
    ].join("\n"),
    "apps/home/__tests__/family.test.ts": [
        'import assert from "node:assert/strict";',
        'import { seen } from "../family";',
        "export const checked = [assert, seen];",
    ].join("\n"),
    "apps/kids/main.ts": [
        'import { createSignal } from "solid-js";',
        'import { draw } from "../../engine/ui/page";',
        'import { Journal } from "./journal";',
        "export const start = [createSignal, draw, Journal];",
    ].join("\n"),
    "apps/kids/journal.tsx": [
        "export const Journal = () => <p>Don't stop</p>;",
        'export const later = () => import("./main");',
    ].join("\n"),
    "tools/scripts/guard.ts": [
        'import { parseSync } from "vite";',
        'import { MODULES } from "../../boundaries";',
        "const body = 'import { login } from \"../../server/auth\";';",
        "export const at = (p: string) => new URL(p, import.meta.url);",
        "export const seen = [parseSync, MODULES, body];",
    ].join("\n"),
    "drizzle.config.ts":
        'import { ownerUrl } from "./server/db/client";\nexport default ownerUrl;\n',
};

const PLANTED: readonly { rule: string; file: string; body: string; table?: Table }[] = [
    {
        rule: "a module imports beyond its reach",
        file: "engine/paper.ts",
        body: 'import { tree } from "./parts/tree";\nexport const p = tree;\n',
    },
    {
        rule: "a module imports a file of a module it may reach only in part",
        file: "engine/parts/leaf.ts",
        body: 'import { draw } from "../ink/draw";\nexport const leaf = draw;\n',
    },
    {
        rule: "a type import beyond the reach",
        file: "engine/paper.ts",
        body: 'import type { Seen } from "../school/family/access";\nexport type P = Seen;\n',
    },
    {
        rule: "a type import of the API's shapes by a module other than ui",
        file: "school/family/planted.ts",
        body: 'import type { Me } from "../../server/api";\nexport type M = Me;\n',
    },
    {
        rule: "`import { type X }` of the row types, which is not erased",
        file: "school/family/planted.ts",
        body: 'import { type Kid } from "../../server/db/schema";\nexport type K = Kid;\n',
    },
    {
        rule: "a re-export beyond the reach",
        file: "engine/paper.ts",
        body: 'export { tree } from "./parts/tree";\n',
    },
    {
        rule: "`export *` beyond the reach",
        file: "engine/paper.ts",
        body: 'export * from "./parts/tree";\n',
    },
    {
        rule: "a dynamic import beyond the reach",
        file: "engine/paper.ts",
        body: 'export const load = () => import("./parts/tree");\n',
    },
    {
        rule: "an import inside a type beyond the reach",
        file: "engine/paper.ts",
        body: 'export type T = typeof import("./parts/tree");\n',
    },
    {
        rule: "a dynamic import the check cannot follow",
        file: "engine/paper.ts",
        body: "export const load = (p: string) => import(p);\n",
    },
    {
        rule: "a suite imports beyond its module's reach",
        file: "engine/__tests__/paper.test.ts",
        body: 'import { tree } from "../parts/tree";\nexport const t = tree;\n',
    },
    {
        rule: "a file in a drawer's __tests__/ named after no module",
        file: "engine/__tests__/helpers.ts",
        body: "export const h = 1;\n",
    },
    {
        rule: "a suite in another drawer's __tests__/",
        file: "school/__tests__/paper.test.ts",
        body: 'import { U } from "../../engine/paper";\nexport const u = U;\n',
    },
    {
        rule: "a file in no module",
        file: "engine/planted.ts",
        body: "export const x = 1;\n",
    },
    {
        rule: "an app boundaries.ts does not declare",
        file: "apps/admin/main.ts",
        body: "export const x = 1;\n",
    },
    {
        rule: "an app imports the server",
        file: "apps/kids/planted.ts",
        body: 'import { login } from "../../server/auth";\nexport const l = login;\n',
    },
    {
        rule: "an app imports the API's shapes as values",
        file: "apps/kids/planted.ts",
        body: 'import { type Me, ME } from "../../server/api";\nexport const m: Me = ME;\n',
    },
    {
        rule: "an app in .tsx imports the server",
        file: "apps/kids/planted.tsx",
        body: 'import { login } from "../../server/auth";\nexport const P = () => <p>{String(login)}</p>;\n',
    },
    {
        rule: "a run time app imports an author time module",
        file: "apps/home/planted.ts",
        body: 'import { parse } from "../../engine/notation/notation";\nexport const p = parse;\n',
    },
    {
        // the household fold is the file this rule is for and it is not written yet, so the rule is
        // held with the table that will name it on the day it is
        rule: "an app imports a file another app holds",
        file: "apps/kids/planted.ts",
        body: 'import { folder } from "../../school/record/household";\nexport const f = folder;\n',
        table: {
            ...TABLE,
            apps: {
                ...APPS,
                home: {
                    phases: ["run", "data"],
                    plus: ["record/household"],
                    packages: ["solid-js"],
                },
            },
        },
    },
    {
        rule: "an app imports another app",
        file: "apps/kids/planted.ts",
        body: 'import { seen } from "../home/family";\nexport const s = seen;\n',
    },
    {
        rule: "a module imports an app",
        file: "engine/ui/planted.ts",
        body: 'import "../../apps/kids/main";\n',
    },
    {
        rule: "a module imports the root's config",
        file: "engine/paper.ts",
        body: 'import { MODULES } from "../boundaries";\nexport const m = MODULES;\n',
    },
    {
        rule: "a module imports from .scratchpad/ by path",
        file: "engine/ui/planted.ts",
        body: 'import { Pen } from "../../.scratchpad/src/core/pen";\nexport const p = Pen;\n',
    },
    {
        rule: "a tool imports from .scratchpad/ by path",
        file: "tools/scripts/planted.ts",
        body: 'import "../../.scratchpad/src/pages/journal";\n',
    },
    {
        rule: "a scratchpad alias",
        file: "apps/kids/planted.ts",
        body: 'import { sky } from "scratchpad:art";\nexport const s = sky;\n',
    },
    {
        rule: "a package import alias the check cannot resolve",
        file: "engine/paper.ts",
        body: 'import { tree } from "#engine/parts/tree";\nexport const t = tree;\n',
    },
    {
        rule: "an import that leads outside the repository",
        file: "engine/paper.ts",
        body: 'import { x } from "../../elsewhere/x";\nexport const y = x;\n',
    },
    {
        rule: "a file that does not parse",
        file: "engine/paper.ts",
        body: 'import { from "./numbers";\n',
    },
    {
        rule: "a module imports a package its row does not name",
        file: "engine/numbers.ts",
        body: 'import { render } from "solid-js/web";\nexport const r = render;\n',
    },
    {
        rule: "a run time module imports a Node builtin",
        file: "engine/paper.ts",
        body: 'import { readFileSync } from "node:fs";\nexport const read = readFileSync;\n',
    },
    {
        rule: "an app imports a package its row does not name",
        file: "apps/kids/planted.ts",
        body: 'import postgres from "postgres";\nexport const sql = postgres;\n',
    },
    {
        rule: "import.meta.glob beyond the reach",
        file: "school/family/planted.ts",
        body: 'export const all = import.meta.glob("../../server/*.ts");\n',
    },
    {
        rule: "import.meta.glob with a pattern the check cannot follow",
        file: "school/family/planted.ts",
        body: 'const where = "./*.ts";\nexport const all = import.meta.glob(where);\n',
    },
    {
        rule: "a URL to a file beyond the reach in a module an app bundles",
        file: "engine/paper.ts",
        body: 'export const tree = new URL("./parts/tree.ts", import.meta.url);\n',
    },
    {
        rule: "a worker from the scratchpad by URL",
        file: "engine/ui/planted.ts",
        body: 'export const w = () => new Worker(new URL("../../.scratchpad/src/x.ts", import.meta.url));\n',
    },
];

const TABLES: readonly { rule: string; table: Table }[] = [
    {
        rule: "the table lets a run time module reach an author time one",
        table: {
            ...TABLE,
            modules: {
                ...MODULES,
                lessons: { at: "school/lessons", phase: "run", reach: ["notation"], packages: [] },
            },
        },
    },
    {
        rule: "the table names a module that does not exist",
        table: {
            ...TABLE,
            modules: {
                ...MODULES,
                paper: { at: "engine/paper", phase: "run", reach: ["papr"], packages: [] },
            },
        },
    },
];

function layout(extra: Readonly<Record<string, string>>): string {
    const dir = mkdtempSync(join(tmpdir(), "lumischool-boundaries-"));
    for (const [file, body] of Object.entries({ ...CLEAN, ...extra })) {
        mkdirSync(join(dir, dirname(file)), { recursive: true });
        writeFileSync(join(dir, file), body);
    }
    return dir;
}

function selftest(): number {
    let failures = 0;
    const trial = (
        rule: string,
        extra: Readonly<Record<string, string>>,
        table: Table,
        blamed: string,
        named = false,
    ): void => {
        const dir = layout(extra);
        try {
            const { problems } = check(dir, table, named);
            const hit = problems.find((p) => p.startsWith(blamed));
            if (hit !== undefined) {
                out(`selftest: ${rule}: ${hit}`);
                return;
            }
            const instead = problems.length > 0 ? `, and instead: ${problems.join("; ")}` : "";
            err(`selftest: ${rule} was not reported against ${blamed}${instead}`);
            failures++;
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    };

    const clean = layout({});
    try {
        const { problems } = check(clean, TABLE, false);
        if (problems.length > 0) {
            err(`selftest: the clean layout was reported: ${problems.join("; ")}`);
            failures++;
        }
    } finally {
        rmSync(clean, { recursive: true, force: true });
    }
    for (const { rule, file, body, table } of PLANTED)
        trial(rule, { [file]: body }, table ?? TABLE, file);
    for (const { rule, table } of TABLES) trial(rule, {}, table, "boundaries.ts");
    // the one rule that reads the tree rather than the table alone, so it runs with the file check on
    trial(
        "the table names a file nobody has written",
        {},
        {
            ...TABLE,
            modules: {
                ...MODULES,
                year: {
                    at: "school/year",
                    phase: "run",
                    reach: ["pack", "answer", "record/read"],
                    packages: [],
                },
            },
        },
        "boundaries.ts: year reaches record/read",
        true,
    );
    return failures;
}

if (process.argv.includes("--selftest")) process.exit(selftest() === 0 ? 0 : 1);

const { problems, files, imports } = check(ROOT, TABLE);
if (problems.length === 0) {
    out(`check:boundaries passed (${files} files, ${imports} imports)`);
    process.exit(0);
}
for (const problem of problems) err(problem);
err(`check:boundaries found ${problems.length} problem(s); the reach is in boundaries.ts`);
process.exit(1);
