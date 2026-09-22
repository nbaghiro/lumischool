// The database module's rules that can be checked as text, so they hold with no database running:
//   1. engine/answer.ts imports nothing, so a child's runtime can load it without a driver.
//   2. server/db/ reaches only engine/answer.ts, node built-ins and its declared packages.
//   3. Nothing outside server/ imports server/db/, except the migration config and the guards whose
//      selftests plant such imports as text, and a type-only import of the row types in
//      server/db/schema.ts, which is erased at build.
//   4. Nothing in apps/ imports anything in server/, bar type-only imports of the row types and of the
//      API's shapes in server/api.ts.
//   5. Every table enables and forces row-level security and has a policy, and every policy on a
//      table with `family_id` compares it with `(SELECT app_family())`, bar the named exceptions.
//   6. Only server/db/client.ts opens a connection.
//   7. Only server/db/content.ts writes a content row, so `name` and `kind` always come from the body.
//   8. The rest of server/ imports neither the driver nor drizzle-orm, so every query is a function in
//      server/db/ behind `withFamily` or a security-definer function.
// `--selftest` plants a violation of each rule and fails if one goes unreported.

import {
    existsSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

const ANSWER = "engine/answer.ts";
const DB = "server/db/";
const SERVER = "server/";
const APPS = "apps/";

const DB_PACKAGES = ["drizzle-orm", "drizzle-kit", "postgres"];

const MAY_IMPORT_DB = [
    "drizzle.config.ts",
    "tools/scripts/check-db.ts",
    "tools/scripts/check-boundaries.ts",
];

const ROW_TYPES = "server/db/schema.ts";
const API_SHAPES = "server/api.ts";

const POLICY_EXCEPTIONS: Record<string, string> = {
    users: "reads the signed-in user, since a login has no family",
    keys: "its rows with no family are reached only by security-definer functions",
};

const IMPORT =
    /(?:^|[^.\w])(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|(?:^|[^.\w])import\s*\(\s*["']([^"']+)["']|require\s*\(\s*["']([^"']+)["']|(?:^|[^.\w])import\s*["']([^"']+)["']/g;

interface Policy {
    name: string;
    text: string;
}

interface Table {
    family: boolean;
    enabled: boolean;
    forced: boolean;
    policies: Policy[];
}

interface Findings {
    problems: string[];
    notes: string[];
}

const out = (line: string): void => {
    process.stdout.write(`${line}\n`);
};
const err = (line: string): void => {
    process.stderr.write(`${line}\n`);
};

function files(dir: string, pattern = /\.(ts|tsx|mts|js|mjs|jsx)$/): string[] {
    let entries: string[];
    try {
        entries = readdirSync(dir);
    } catch {
        return [];
    }
    const found: string[] = [];
    for (const entry of entries) {
        if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
        const path = join(dir, entry);
        if (lstatSync(path).isDirectory()) found.push(...files(path, pattern));
        else if (pattern.test(entry)) found.push(path);
    }
    return found;
}

/**
 * Each import of a file, as the repo-relative path it resolves to, or the bare specifier. An
 * extensionless relative import names a `.ts` file, as tools/scripts/resolve.ts resolves it.
 */
function importsOf(
    root: string,
    path: string,
): { spec: string; target: string; typeOnly: boolean }[] {
    const found: { spec: string; target: string; typeOnly: boolean }[] = [];
    for (const m of readFileSync(path, "utf8").matchAll(IMPORT)) {
        const spec = m[1] ?? m[2] ?? m[3] ?? m[4];
        if (!spec) continue;
        const typeOnly = /^[^.\w]?\s*(?:import|export)\s+type\s/.test(m[0]);
        if (!spec.startsWith(".")) {
            found.push({ spec, target: spec, typeOnly });
            continue;
        }
        const file = relative(root, resolve(dirname(path), spec));
        found.push({ spec, target: /\.[a-z]+$/.test(file) ? file : `${file}.ts`, typeOnly });
    }
    return found;
}

function security(root: string): Map<string, Table> {
    const sql = files(join(root, `${DB}migrations`), /\.sql$/)
        .map((p) => readFileSync(p, "utf8"))
        .join("\n");
    const tables = new Map<string, Table>();
    for (const [, name, body] of sql.matchAll(/CREATE TABLE "?(\w+)"?\s*\(([\s\S]*?)\n\);/g)) {
        if (name === undefined || body === undefined) continue;
        tables.set(name, {
            family: body.includes('"family_id"'),
            enabled: false,
            forced: false,
            policies: [],
        });
    }
    for (const [, name, how] of sql.matchAll(
        /ALTER TABLE "?(\w+)"? (ENABLE|FORCE) ROW LEVEL SECURITY/g,
    )) {
        const table = name === undefined ? undefined : tables.get(name);
        if (!table) continue;
        if (how === "ENABLE") table.enabled = true;
        else table.forced = true;
    }
    for (const [, policy, name, text] of sql.matchAll(
        /CREATE POLICY (\w+) ON "?(\w+)"?([\s\S]*?);/g,
    )) {
        if (policy === undefined || name === undefined || text === undefined) continue;
        tables.get(name)?.policies.push({ name: policy, text });
    }
    return tables;
}

function check(root: string): Findings {
    const problems: string[] = [];
    const notes: string[] = [];
    const rel = (path: string): string => relative(root, path);

    const answer = join(root, ANSWER);
    if (!existsSync(answer)) problems.push(`${ANSWER} is missing, so rule one checked nothing`);
    else {
        for (const { spec } of importsOf(root, answer)) {
            problems.push(`${ANSWER} imports "${spec}": it must import nothing at all`);
        }
    }

    const dbFiles = files(join(root, DB));
    if (dbFiles.length === 0)
        problems.push(`${DB} has no source files, so rule two checked nothing`);
    for (const path of dbFiles) {
        for (const { spec, target } of importsOf(root, path)) {
            if (target.startsWith(DB) || target === ANSWER) continue;
            if (spec.startsWith("node:")) continue;
            if (DB_PACKAGES.some((p) => spec === p || spec.startsWith(`${p}/`))) continue;
            problems.push(`${rel(path)} imports "${spec}", which ${DB} may not reach`);
        }
    }

    const outside = files(root).filter((p) => {
        const r = rel(p);
        return !r.startsWith(SERVER) && !r.startsWith(APPS);
    });
    for (const path of outside) {
        if (MAY_IMPORT_DB.includes(rel(path))) continue;
        for (const { spec, target, typeOnly } of importsOf(root, path)) {
            if (typeOnly && target === ROW_TYPES) continue;
            if (target.startsWith(DB) || spec.includes(DB)) {
                problems.push(`${rel(path)} imports "${spec}": only ${SERVER} may import ${DB}`);
            }
        }
    }

    const appFiles = files(join(root, APPS));
    if (appFiles.length === 0) notes.push(`no ${APPS} yet, so rule four had nothing to check`);
    for (const path of appFiles) {
        for (const { spec, target, typeOnly } of importsOf(root, path)) {
            if (typeOnly && (target === ROW_TYPES || target === API_SHAPES)) continue;
            if (target.startsWith(SERVER) || spec.includes(SERVER)) {
                problems.push(`${rel(path)} imports "${spec}": an app may not contain the server`);
            }
        }
    }

    const serverFiles = files(join(root, SERVER)).filter((p) => !rel(p).startsWith(DB));
    for (const path of serverFiles) {
        for (const { spec } of importsOf(root, path)) {
            if (DB_PACKAGES.some((p) => spec === p || spec.startsWith(`${p}/`))) {
                problems.push(
                    `${rel(path)} imports "${spec}": outside ${DB}, the server reaches the database only through ${DB}`,
                );
            }
        }
    }

    const tables = security(root);
    if (tables.size === 0) {
        problems.push(`no CREATE TABLE found in ${DB}migrations, so rule five checked nothing`);
    }
    for (const [name, t] of tables) {
        if (!t.enabled || !t.forced) {
            const state = t.enabled ? "enabled but not forced" : "not enabled";
            problems.push(`${name}: row-level security is ${state}`);
        }
        if (t.policies.length === 0) problems.push(`${name}: has no policy`);
        if (!t.family || name in POLICY_EXCEPTIONS) continue;
        for (const p of t.policies) {
            if (!/\bfamily_id = \(SELECT app_family\(\)\)/.test(p.text)) {
                problems.push(
                    `${name}: policy ${p.name} does not compare family_id with (SELECT app_family())`,
                );
            }
        }
    }
    for (const name of Object.keys(POLICY_EXCEPTIONS)) {
        if (tables.size && !tables.has(name)) {
            problems.push(
                `${name} is a named exception but is not a table any more; take it off the list`,
            );
        }
    }

    for (const path of dbFiles) {
        if (rel(path) === `${DB}client.ts`) continue;
        if (/\bpostgres\s*\(/.test(readFileSync(path, "utf8"))) {
            problems.push(`${rel(path)} opens a connection; only ${DB}client.ts may`);
        }
    }

    // The integration tests are exempt: they try forbidden writes on purpose.
    for (const path of dbFiles) {
        const r = rel(path);
        if (r === `${DB}content.ts` || r.endsWith(".itest.ts")) continue;
        const text = readFileSync(path, "utf8");
        if (/\.insert\(\s*content\s*\)|insert\s+into\s+"?content"?\b/i.test(text)) {
            problems.push(`${r} writes content; only ${DB}content.ts may`);
        }
    }

    return { problems, notes };
}

function selftest(): number {
    const tables = ["kids", "users", "keys"];
    const migration = [
        'CREATE TABLE "kids" (\n\t"id" uuid,\n\t"family_id" uuid\n);',
        'CREATE TABLE "users" (\n\t"id" uuid\n);',
        'CREATE TABLE "keys" (\n\t"id" uuid,\n\t"family_id" uuid\n);',
        ...tables.flatMap((t) => [
            `ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY;`,
            `ALTER TABLE ${t} FORCE ROW LEVEL SECURITY;`,
        ]),
        "CREATE POLICY kids_family ON kids\n  USING (family_id = (SELECT app_family())) WITH CHECK (family_id = (SELECT app_family()));",
        "CREATE POLICY users_read ON users FOR SELECT\n  USING (id = (SELECT app_user()));",
        "CREATE POLICY keys_family ON keys\n  USING (family_id = (SELECT app_family()));",
    ].join("\n");
    const planted = [
        {
            rule: "one",
            file: ANSWER,
            body: 'import { store } from "../server/db/client";\n',
        },
        {
            rule: "two",
            file: `${DB}planted.ts`,
            body: 'import x from "some-package";\nexport const y = x;\n',
        },
        {
            rule: "two (a relative path out of the database module)",
            file: `${DB}__tests__/planted.ts`,
            body: 'import { x } from "../../../.scratchpad/src/x";\nexport const y = x;\n',
        },
        {
            rule: "three",
            file: "engine/planted.ts",
            body: 'import { withFamily } from "../server/db/client";\nexport const s = withFamily;\n',
        },
        {
            rule: "three (a type import of something other than the row types)",
            file: "engine/planted.ts",
            body: 'import type { Store } from "../server/db/client";\nexport type S = Store;\n',
        },
        {
            rule: "four",
            file: "apps/kids/planted.ts",
            body: 'import { login } from "../../server/auth";\nexport const s = login;\n',
        },
        {
            rule: "five (not forced)",
            file: `${DB}migrations/0001_planted.sql`,
            body: 'CREATE TABLE "notes" (\n\t"family_id" uuid\n);\nALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;\nCREATE POLICY notes_family ON notes USING (family_id = (SELECT app_family()));\n',
        },
        {
            rule: "five (a policy that grants another way)",
            file: `${DB}migrations/0001_planted.sql`,
            body: "CREATE POLICY kids_everyone ON kids FOR SELECT USING (true);\n",
        },
        {
            rule: "six",
            file: `${DB}planted.ts`,
            body: 'import postgres from "postgres";\nexport const s = postgres("x");\n',
        },
        {
            rule: "eight",
            file: "server/planted.ts",
            body: 'import { sql } from "drizzle-orm";\nexport const s = sql;\n',
        },
        {
            rule: "seven",
            file: `${DB}planted.ts`,
            body: 'import { content } from "./schema";\nexport const w = (tx) => tx.insert(content).values({});\n',
        },
    ];

    let failures = 0;
    for (const { rule, file, body } of planted) {
        const dir = mkdtempSync(join(tmpdir(), "lumischool-guard-"));
        try {
            mkdirSync(join(dir, "engine"), { recursive: true });
            mkdirSync(join(dir, `${DB}migrations`), { recursive: true });
            writeFileSync(join(dir, ANSWER), "export type Event = { t: string };\n");
            writeFileSync(join(dir, `${DB}schema.ts`), 'import "../../engine/answer";\n');
            writeFileSync(join(dir, `${DB}migrations/0000_initial.sql`), migration);
            mkdirSync(join(dir, "school/family"), { recursive: true });
            writeFileSync(
                join(dir, "school/family/access.ts"),
                'import type { Member } from "../../server/db/schema";\nexport type M = Member;\n',
            );
            mkdirSync(join(dir, "apps/home"), { recursive: true });
            writeFileSync(
                join(dir, "apps/home/me.ts"),
                'import type { Me } from "../../server/api";\nexport type M = Me;\n',
            );
            writeFileSync(
                join(dir, "server/http.ts"),
                'import { withFamily } from "./db/client";\n',
            );

            const clean = check(dir);
            if (clean.problems.length > 0) {
                err(`selftest: the clean layout was reported: ${clean.problems.join("; ")}`);
                failures++;
            }
            const path = join(dir, file);
            mkdirSync(dirname(path), { recursive: true });
            writeFileSync(path, body);
            const [first] = check(dir).problems;
            if (first === undefined) {
                err(`selftest: rule ${rule} was not reported for the planted ${file}`);
                failures++;
            } else {
                out(`selftest: rule ${rule} reported: ${first}`);
            }
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }
    return failures;
}

if (process.argv.includes("--selftest")) process.exit(selftest() === 0 ? 0 : 1);

const { problems, notes } = check(ROOT);
for (const note of notes) out(`note: ${note}`);
if (problems.length === 0) {
    out("check:db passed");
    process.exit(0);
}
for (const problem of problems) err(problem);
err(`check:db found ${problems.length} problem(s)`);
process.exit(1);
