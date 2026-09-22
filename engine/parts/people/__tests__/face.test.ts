import assert from "node:assert/strict";
import { test } from "node:test";
import { MOODS } from "../../speech";
import { face } from "../face";

test("a face is described by its brows, eyes and mouth, never by the feeling a question asks about", () => {
    for (const mood of MOODS) {
        for (const hair of [0, 1, 2, 3]) {
            const said = face.describe({ mood, hair, name: "" }) ?? "";
            for (const feeling of [...MOODS, "feel", "emotion", "mood", "smile", "frown"]) {
                assert.doesNotMatch(said, new RegExp(`\\b${feeling}`, "i"), `${mood}: ${said}`);
            }
        }
    }
    assert.notEqual(
        face.describe({ mood: "sad", hair: 0, name: "" }),
        face.describe({ mood: "cross", hair: 0, name: "" }),
    );
});
