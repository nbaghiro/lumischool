// The whole apply path, on drizzle's migrator rather than drizzle-kit, so a deployment needs no CLI or
// config. Pending files apply in one transaction. A file edited after it has run somewhere is silently
// skipped there, which is why a migration that has left this machine is never edited.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { open, ownerUrl } from "../client";

const FOLDER = fileURLToPath(new URL(".", import.meta.url));

interface Journal {
    entries: { idx: number; tag: string }[];
}

/** What the tree says the full set of migrations is, from the journal drizzle-kit writes. */
export function migrationTags(): string[] {
    const journal = JSON.parse(readFileSync(`${FOLDER}/meta/_journal.json`, "utf8")) as Journal;
    return journal.entries.map((e) => e.tag);
}

/** Applies pending migrations. Returns the tags the tree holds, applied or already there. */
export async function apply(url: string = ownerUrl()): Promise<string[]> {
    const s = open(url);
    try {
        await migrate(s.db, { migrationsFolder: FOLDER, migrationsSchema: "drizzle" });
        return migrationTags();
    } finally {
        await s.close();
    }
}

if (import.meta.filename === process.argv[1]) {
    const url = ownerUrl();
    const tags = await apply(url);
    const where = url.replace(/:\/\/[^@]*@/, "://");
    console.log(`${tags.length} migration${tags.length === 1 ? "" : "s"} in the tree, all applied to ${where}`);
}
