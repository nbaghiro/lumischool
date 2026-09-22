import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { onThisComputer } from "../device";

describe("the browser an app is in", () => {
    it("is a developer's computer only on its own loopback names", () => {
        for (const host of ["localhost", "127.0.0.1", "[::1]"])
            assert.equal(onThisComputer(host), true);
        for (const host of ["lumischool.ai", "www.lumischool.ai", "localhost.example.com", ""])
            assert.equal(onThisComputer(host), false, host);
    });
});
