import { execFileSync } from "node:child_process";

const BASE = process.env.E2E_BASE ?? "http://localhost:8500";

/** Only the exact addresses created by this test are removed, including failed signups. */
export function cleanup(addresses: readonly string[]): void {
    if (!addresses.length) return;
    if (addresses.some((email) => !/^e2e-[a-z0-9-]+@example\.com$/.test(email)))
        throw new Error("refusing to clean up a non-test address");
    const emails = addresses.map((email) => `'${email}'`).join(",");
    const sql = `begin;
        delete from families where id in (
            select m.family_id from members m join users u on u.id = m.user_id
            where u.email in (${emails})
        );
        delete from keys where email in (${emails});
        delete from users where email in (${emails});
        commit;`;
    execFileSync(
        "docker",
        [
            "exec",
            "-i",
            "lumischool-pg",
            "psql",
            "-q",
            "-v",
            "ON_ERROR_STOP=1",
            "-U",
            "lumischool",
            "-d",
            "lumischool",
        ],
        {
            input: sql,
            stdio: ["pipe", "pipe", "pipe"],
        },
    );
}

export default async function ready(): Promise<void> {
    if (BASE !== "http://localhost:8500")
        throw new Error(
            "browser tests create and clean up families in the local database; use http://localhost:8500",
        );
    try {
        if ((await fetch(`${BASE}/api/health`)).status === 200) return;
    } catch {
        // The diagnostic below also covers a server that has not started.
    }
    throw new Error(`nothing answers ${BASE}/api/health: run npm run dev`);
}
