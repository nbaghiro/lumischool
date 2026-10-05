import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hosted, leaves } from "../native";

describe("host mode", () => {
    it("is off outside the app's web view", () => {
        assert.equal(hosted(), false);
    });

    it("hands the app the links that leave this app's pages", () => {
        for (const href of ["/kids", "/kids/sign-in", "/open-child?child=k1", "/sign-in?shared=1"])
            assert.equal(leaves(href), true, href);
        for (const href of ["/", "/explore/k-01", "/kidsroom", "/calendar#today"])
            assert.equal(leaves(href), false, href);
    });
});
