import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { policySql } from "../scope";

const MIGRATION = new URL("../migrations/0000_initial.sql", import.meta.url);

describe("the policies in the migration", () => {
    it("are exactly the ones server/db/scope.ts generates", () => {
        assert.ok(readFileSync(MIGRATION, "utf8").includes(policySql()));
    });
});
