import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { open, ownerUrl } from "../client";

const FOLDER = fileURLToPath(new URL(".", import.meta.url));

interface Journal {
    entries: { idx: number; tag: string }[];
}

/** What the tree says the full set of migrations is, from the journal drizzle-kit writes. */
export function migrationTags(folder = FOLDER): string[] {
    const journal = JSON.parse(readFileSync(`${folder}/meta/_journal.json`, "utf8")) as Journal;
    return journal.entries.map((e) => e.tag);
}

/** Applies pending migrations. Returns the tags the tree holds, applied or already there. */
export async function apply(url: string = ownerUrl(), folder = FOLDER): Promise<string[]> {
    const s = open(url);
    try {
        const connection = await s.raw.reserve();
        try {
            // A direct connection holds the lock across Drizzle's history read and transaction.
            await connection`select pg_advisory_lock(8502, 1)`;
            try {
                await migrate(s.db, {
                    migrationsFolder: folder,
                    migrationsSchema: "drizzle",
                });
                return migrationTags(folder);
            } finally {
                await connection`select pg_advisory_unlock(8502, 1)`;
            }
        } finally {
            connection.release();
        }
    } finally {
        await s.close();
    }
}

if (import.meta.filename === process.argv[1]) {
    const url = ownerUrl();
    const tags = await apply(url);
    const where = url.replace(/:\/\/[^@]*@/, "://");
    console.log(
        `${tags.length} migration${tags.length === 1 ? "" : "s"} in the tree, all applied to ${where}`,
    );
}
