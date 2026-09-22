// Before any case runs: the one origin is serving, the API answers behind it, the Harlows are in the
// local database, and what earlier runs left behind is cleared, each with the command that fixes it if not.
// After the last case, the views the run opened are ended and the work it did as the children is
// cleared, so the Harlows are left as the seed wrote them.

import { execFileSync } from "node:child_process";
import { join } from "node:path";

const BASE = process.env.E2E_BASE ?? "http://localhost:8500";

/**
 * Sign-in and confirm codes nobody used, older than the ten minutes either lasts. They can never be
 * used, but they count toward this network's hourly limit in key_issue, and every run from this
 * machine, and every agent's, shares that count. The limits stay as they are. The seeded parents'
 * unused codes go at any age, since one asked for by hand holds their next sign-in back for a minute.
 */
const SPENT = `delete from keys where kind in ('sign-in', 'confirm') and family_id is null and (created_at < utc_iso(now() - interval '10 minutes') or lower(email) in ('demo-parent1@lumischool.ai', 'demo-parent2@lumischool.ai'))`;

/**
 * The children's views earlier runs opened in the Harlows' family and left open, so that every run
 * starts with none and the family's page lists only the views this run opens. The family is found by
 * its first parent's address, which `npm run db:demo` fixes.
 */
const VIEWS = `delete from keys where kind = 'kid-session' and family_id in (select m.family_id from members m join users u on u.id = m.user_id where lower(u.email) = 'demo-parent1@lumischool.ai')`;

/**
 * The screen work the cases did as the Harlows' children today: the sittings, answers and hints the
 * lesson case and the offline case record, which would otherwise finish the seeded lessons one run
 * at a time and move today's lesson on. The seed's own work is on days before today.
 */
const WORK = `delete from events where kind in ('sitting-began', 'sitting-ended', 'answered', 'hint-opened') and at >= utc_iso(date_trunc('day', now())) and family_id in (select m.family_id from members m join users u on u.id = m.user_id where lower(u.email) = 'demo-parent1@lumischool.ai')`;

/**
 * Wrong tries at the Harlows' PIN that a failed run left behind: five in a row make the next try
 * wait a minute, and the PIN case would then fail for a reason of its own.
 */
const WRONG_PINS = `update keys set attempts = 0 where kind = 'pin' and family_id in (select m.family_id from members m join users u on u.id = m.user_id where lower(u.email) = 'demo-parent1@lumischool.ai')`;

async function status(path: string): Promise<number> {
    try {
        return (await fetch(`${BASE}${path}`)).status;
    } catch {
        return 0;
    }
}

/** Whether the Harlows' first parent has a login: 1 once `npm run db:demo` has written the family. */
const SEEDED = `select count(*) from users where lower(email) = 'demo-parent1@lumischool.ai'`;

/**
 * Runs SQL through the local container's owner, since the API has no route that does any of this, nor
 * should, and returns what psql printed, or null when the container could not be reached.
 */
function psql(sql: string): string | null {
    try {
        return execFileSync(
            "docker",
            [
                "compose",
                "exec",
                "-T",
                "postgres",
                "psql",
                "-U",
                "lumischool",
                "-d",
                "lumischool",
                "-tAqc",
                sql,
            ],
            {
                cwd: join(import.meta.dirname, "..", ".."),
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
            },
        );
    } catch {
        return null;
    }
}

/**
 * The screen work the Harlows' children did today, cleared for a file whose cases answer today's sheet
 * and run once on each device: the global setup clears it once a run, so without this the iPad's and
 * the phone's cases meet the laptop's answers.
 */
export function clearToday(): void {
    psql(WORK);
}

/** After the last case: the views this run opened on its three devices, which the cases leave open, and the work they did. */
export async function done(): Promise<void> {
    psql(`${VIEWS}; ${WORK}`);
}

export default async function ready(): Promise<void> {
    if ((await status("/api/health")) !== 200)
        throw new Error(
            `nothing answers ${BASE}/api/health: start the apps and the API with npm run dev at the repo root`,
        );
    if (psql(SEEDED)?.trim() === "0")
        throw new Error("the Harlows are not in the local database: run npm run db:demo");
    if (psql(`${SPENT}; ${VIEWS}; ${WORK}; ${WRONG_PINS}`) === null)
        process.stdout.write(
            "could not reach the local database (npm run db:up starts it), so the Harlows were not checked, and a run may meet the code limits and earlier runs' views\n",
        );
}
