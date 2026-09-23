// The entry point against the test database: what a failed request logs, cookies another app on the
// host sends beside ours, and the health check.

import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { closeApp, open, type Store } from "../db/client";
import { prepare, truncate } from "../db/__tests__/test-db";
import type { Config } from "../http";
import { at, Browser, local, startFamily } from "./browser";

const reason = await prepare();
const owner: Store | null = reason === null ? open() : null;

after(async () => {
    await closeApp();
    if (owner) await owner.close();
});

const db = (): Store => {
    if (!owner) throw new Error("no database");
    return owner;
};

/** Postgres refuses this character in text, so a kid's name ending in it fails its insert. */
const NUL = String.fromCharCode(0);

describe("the entry point", { skip: reason ?? false }, () => {
    beforeEach(async () => truncate(db()));

    it("logs a failure outside local by its route, a request id and its code, and never a parameter of the query", async () => {
        const { config, outbox } = local();
        const lines: string[] = [];
        const deployed: Config = {
            ...config,
            env: "production",
            log: (line) => {
                lines.push(line);
            },
        };
        const b = new Browser(deployed);
        await startFamily(b, outbox, {
            email: "anna@example.test",
            name: "Anna",
            family: "Harlow",
        });
        const failed = await b.call("POST", "/api/kids", {
            body: { name: `Maya Quinn${NUL}`, grade: 1, consent: { notice: "2026-09-weekly" } },
        });
        assert.equal(failed.status, 500);
        assert.deepEqual(failed.body, { error: "server" });
        assert.equal(lines.length, 1);
        const [line = ""] = lines;
        assert.match(line, /^POST \/api\/kids 500 request [0-9a-f-]{36}: code 22021$/);
        assert.ok(!line.includes("Maya"), line);
    });

    it("keeps the detail of a failure in the terminal locally, under the same kind of line", async () => {
        const { config, outbox } = local();
        const lines: string[] = [];
        const b = new Browser({
            ...config,
            log: (line) => {
                lines.push(line);
            },
        });
        await startFamily(b, outbox, { email: "sam@example.test", name: "Sam", family: "Oakley" });
        const failed = await b.call("POST", "/api/kids", {
            body: { name: `Theo${NUL}`, grade: 2, consent: { notice: "2026-09-weekly" } },
        });
        assert.equal(failed.status, 500);
        assert.match(
            lines.join("\n"),
            /^POST \/api\/kids 500 request [0-9a-f-]{36}: .*Failed query/s,
        );
    });

    it("reads its own session beside another app's malformed cookie", async () => {
        const { config, outbox } = local();
        const b = new Browser(config);
        const me = await startFamily(b, outbox, {
            email: "kate@example.test",
            name: "Kate",
            family: "Riverside",
        });
        const session = encodeURIComponent(b.jar.get("ls_session") ?? "");
        const res = await b.handle(
            new Request("http://127.0.0.1:8501/api/me", {
                headers: {
                    cookie: `theme=100%; ls_session=${session}; ls_browser=${b.jar.get("ls_browser")}; other=%zz`,
                },
            }),
            b.ip,
        );
        assert.equal(res.status, 200);
        const body: unknown = await res.json();
        assert.equal(at(body, "family", "id"), me.family);
    });

    it("answers the health check once the database has answered", async () => {
        const res = await new Browser(local().config).call("GET", "/api/health");
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { ok: true });
    });
});
