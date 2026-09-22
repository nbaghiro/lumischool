// The app role's waits, from the environment: a statement that runs past `DB_STATEMENT_TIMEOUT` is
// ended inside `withFamily`, and the setting ends with the transaction that set it.

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { sql } from "drizzle-orm";
import { closeApp, withFamily } from "../client";
import { codeOf, prepare } from "./test-db";

const reason = await prepare();
process.env.DB_STATEMENT_TIMEOUT = "300";

after(closeApp);

describe("the app role's statement timeout", { skip: reason ?? false }, () => {
    it("ends a statement that runs past it, and holds in every transaction withFamily opens", async () => {
        await assert.rejects(
            withFamily({ family: null }, (tx) => tx.execute(sql`select pg_sleep(2)`)),
            (error) => codeOf(error) === "57014",
            "57014 is a statement cancelled by its timeout",
        );
        const rows = await withFamily({ family: null }, (tx) =>
            tx.execute(sql`select current_setting('statement_timeout') as limit`),
        );
        const [row] = rows;
        assert.ok(row && "limit" in row);
        assert.equal(row.limit, "300ms");
    });
});
