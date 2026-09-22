import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PICTURES } from "../../../engine/ui/pictures";
import { ART } from "../../../school/worlds/art";

// The creatures a child is drawn with are drawn as a world draws them, so each line of PICTURES has
// to say what its line in school/worlds/art.ts says. The tie is tested here because engine/ui may
// not import school/ and school/worlds may not import engine/ui, and the family page, which is the
// screen that draws them, is this app's.

describe("each creature's line", () => {
    it("says what school/worlds/art.ts says for the same id", () => {
        const byId = new Map(ART.map((a) => [a.id, a]));
        for (const p of PICTURES) {
            const e = byId.get(p.id);
            assert.ok(e, `${p.id} is not an art id a world can use`);
            assert.equal(e.from, p.from, `${p.id} is drawn from somewhere else in a world`);
            assert.equal(e.ref, p.ref, `${p.id} names another drawing in a world`);
            assert.deepEqual(p.params ?? {}, e.params ?? {}, `${p.id} is drawn with other numbers`);
            assert.ok(e.roles.includes("creature"), `${p.id} is not a creature`);
        }
    });
});
