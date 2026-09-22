import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NOTICE_VERSION } from "../../school/family/privacy";
import { CONSENT_NOTICE } from "../db/events";

describe("the consent notice", () => {
    it("is the version the server accepts consent to", () => {
        assert.equal(NOTICE_VERSION, CONSENT_NOTICE);
    });
});
