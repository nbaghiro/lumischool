// The address after the `#` an overlay reads and writes: the map, a world, a lesson in its world, and
// one layer up from each.
import assert from "node:assert/strict";
import { test } from "node:test";
import { atFrom, hashOf, sameAt, upOf } from "../hash";

test("the address names the map, a world, or a lesson in its world, and anything else is no look", () => {
    assert.deepEqual(atFrom("#/map"), { world: null, lesson: null });
    assert.deepEqual(atFrom("#/map/harbour"), { world: "harbour", lesson: null });
    assert.deepEqual(atFrom("#/map/harbour/g1-l4"), { world: "harbour", lesson: "g1-l4" });
    assert.deepEqual(atFrom("#map/harbour"), { world: "harbour", lesson: null });
    assert.equal(atFrom(""), null);
    assert.equal(atFrom("#"), null);
    assert.equal(atFrom("#top"), null);
    assert.deepEqual(
        atFrom("#/lesson/g1-l4"),
        { world: null, lesson: "g1-l4" },
        "a lesson whose world the page finds",
    );
    assert.equal(atFrom("#/lesson"), null);
    assert.equal(atFrom("#/lesson/"), null);
    assert.deepEqual(
        atFrom("#/map//g1-l4"),
        { world: null, lesson: null },
        "a lesson needs its world",
    );
    assert.deepEqual(atFrom("#/map/%E2%9C%93/a%20b"), { world: "✓", lesson: "a b" });
    assert.deepEqual(
        atFrom("#/map/%E0%A4%A"),
        { world: null, lesson: null },
        "an address that cannot be read names the map",
    );
});

test("a look's address reads back as the same look, and up goes out of a world to the map and off the map", () => {
    for (const at of [
        { world: null, lesson: null },
        { world: "harbour", lesson: null },
        { world: "harbour", lesson: "a b/c" },
    ]) {
        assert.deepEqual(atFrom(hashOf(at)), at);
        assert.ok(sameAt(atFrom(hashOf(at)), at));
    }
    assert.equal(hashOf({ world: null, lesson: "g1-l4" }), "#/lesson/g1-l4");
    assert.deepEqual(atFrom(hashOf({ world: null, lesson: "a b" })), {
        world: null,
        lesson: "a b",
    });
    assert.deepEqual(upOf({ world: "harbour", lesson: "g1-l4" }), { world: null, lesson: null });
    assert.deepEqual(upOf({ world: null, lesson: "g1-l4" }), { world: null, lesson: null });
    assert.deepEqual(upOf({ world: "harbour", lesson: null }), { world: null, lesson: null });
    assert.equal(upOf({ world: null, lesson: null }), null);
    assert.equal(sameAt(null, null), true);
    assert.equal(sameAt(null, { world: null, lesson: null }), false);
    assert.equal(sameAt({ world: "a", lesson: null }, { world: "a", lesson: "b" }), false);
});
