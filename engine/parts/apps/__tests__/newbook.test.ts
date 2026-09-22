import assert from "node:assert/strict";
import { test } from "node:test";
import { drawn, letteringIn } from "../../__tests__/check";
import { STAGES, newbook } from "../newbook";

test("the empty page names a child only when it has one, and never on the new book", () => {
    const name = "Maya";
    for (const stage of STAGES) {
        const p = { stage, name, cover: "sky" as const };
        const said = newbook.describe(p) ?? "";
        assert.doesNotMatch(said, /[—!]/, stage);
        const written = letteringIn(drawn(newbook, p, { paper: false }).marks).map((l) => l.s);
        assert.equal(said.includes(name), stage === "named", `${stage}: ${said}`);
        assert.equal(written.includes(name), stage !== "new", stage);
        assert.ok(!(newbook.describe({ ...p, name: "" }) ?? "").includes(name), stage);
    }
    assert.match(
        newbook.describe({ stage: "named", name: "Maya", cover: "sky" }) ?? "",
        /Maya written on its label/,
    );
    assert.deepEqual(newbook.box({ stage: "open", name: "", cover: "sky" }), { w: 15, h: 8 });
});
