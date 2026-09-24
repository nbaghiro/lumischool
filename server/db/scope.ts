// Which family's rows each table holds, stated once. The row-level policies in the migration are
// generated from it, and server/db/__tests__/scope.itest.ts checks the migrated database against it.

interface TableScope {
    /** `id` for `families` itself, `family_id` everywhere else. */
    family: "id" | "family_id";
    /** Rows every family may read and no app role may write. Only the catalogue. */
    shared?: string;
}

export const SCOPE = {
    artworks: { family: "family_id" },
    painting_saves: { family: "family_id" },
    mail_preferences: { family: "family_id" },
    mail_deliveries: { family: "family_id" },
    families: { family: "id" },
    kids: { family: "family_id" },
    members: { family: "family_id" },
    keys: { family: "family_id" },
    events: { family: "family_id" },
    content: { family: "family_id", shared: "family_id IS NULL" },
} as const satisfies Record<string, TableScope>;

const family = "(SELECT app_family())";

/** The row-level security statements for the migration, one table at a time, in declaration order. */
export function policySql(): string {
    const out: string[] = [];
    const stmt = (s: string) => out.push(s, "--> statement-breakpoint");

    for (const [table, scope] of Object.entries(SCOPE) as [string, TableScope][]) {
        const own = `${scope.family} = ${family}`;
        stmt(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);
        if (scope.shared) {
            // The shared rows are readable by every family; the write policies never match them,
            // because `null = x` is never true.
            stmt(
                `CREATE POLICY ${table}_read ON ${table} FOR SELECT\n  USING (${scope.shared} OR ${own});`,
            );
            stmt(`CREATE POLICY ${table}_insert ON ${table} FOR INSERT\n  WITH CHECK (${own});`);
            stmt(`CREATE POLICY ${table}_delete ON ${table} FOR DELETE\n  USING (${own});`);
        } else {
            stmt(
                `CREATE POLICY ${table}_family ON ${table}\n  USING (${own}) WITH CHECK (${own});`,
            );
        }
    }

    // `users` has no family: a user is readable as oneself or through any membership in the current
    // family, an ended one included, so a removed tutor's name stays readable in the history.
    const self = "id = (SELECT app_user())";
    stmt(`ALTER TABLE users FORCE ROW LEVEL SECURITY;`);
    stmt(
        `CREATE POLICY users_read ON users FOR SELECT\n  USING (${self}\n         OR EXISTS (SELECT 1 FROM members m WHERE m.user_id = users.id AND m.family_id = ${family}));`,
    );
    stmt(`CREATE POLICY users_insert ON users FOR INSERT\n  WITH CHECK (${self});`);
    stmt(`CREATE POLICY users_update ON users FOR UPDATE\n  USING (${self}) WITH CHECK (${self});`);
    stmt(`CREATE POLICY users_delete ON users FOR DELETE\n  USING (${self});`);

    return out.slice(0, -1).join("\n");
}
