import assert from "node:assert/strict";
import test from "node:test";
import { check } from "../../engine/answer";
import { finishing, fold, progressOf, type Sitting } from "../record";

const KID = "00000000-0000-4000-8000-000000000002";

const sat = (on: string, part: number | undefined, finished = true): Sitting => ({
    child: KID,
    lesson: "book-sample",
    on,
    minutes: 20,
    mode: "screen",
    finished,
    withGrownUp: false,
    subject: "reading",
    ...(part === undefined ? {} : { part }),
});

test("a book lesson is finished once each of its sittings is, on the day the last of them was", () => {
    const one = sat("2026-09-21", 1);
    const two = sat("2026-09-23", 2);
    assert.equal(finishing([one], 2), null);
    assert.equal(finishing([one, sat("2026-09-22", 2, false)], 2), null);
    assert.equal(finishing([two, one], 2), two);
    // a lesson read in one sitting is finished by any finished sitting, as it always was
    assert.equal(finishing([sat("2026-09-21", undefined)], 1)?.on, "2026-09-21");
});

test("a book counts as one lesson done, and only when every sitting is", () => {
    const at = (sittings: Sitting[]) =>
        progressOf(
            ["book-sample", "next"],
            ["book-sample", "next"],
            KID,
            [],
            sittings,
            "2026-09-01",
            "2026-09-30",
            new Map([["book-sample", 2]]),
        );
    const half = at([sat("2026-09-21", 1)]);
    assert.equal(half.done["book-sample"], undefined);
    assert.equal(half.current, "book-sample");
    const whole = at([sat("2026-09-21", 1), sat("2026-09-23", 2)]);
    assert.equal(whole.done["book-sample"]?.on, "2026-09-23");
    assert.equal(whole.done["book-sample"]?.minutes, 40);
    assert.equal(whole.current, "next");
});

test("a sitting of a book lesson is folded with the part it read", () => {
    const read = check({
        id: "00000000-0000-4000-8000-000000000009",
        family_id: "00000000-0000-4000-8000-000000000001",
        kid_id: KID,
        kind: "sitting-began",
        data: {
            sitting: "s",
            lesson: "book-sample",
            lessonHash: "h",
            pack: "p",
            mode: "screen",
            part: 2,
        },
        actor: null,
        device: "00000000-0000-4000-8000-000000000003",
        seq: 1,
        at: "2026-09-21T09:00:00.000Z",
    });
    assert.ok(read.ok, read.ok ? "" : read.problem);
    const [sitting] = fold([read.envelope], "UTC", () => "reading").sittings;
    assert.equal(sitting?.part, 2);
    const nought = check({ ...read.envelope, data: { ...read.envelope.data, part: 0 } });
    assert.equal(nought.ok, false);
});
