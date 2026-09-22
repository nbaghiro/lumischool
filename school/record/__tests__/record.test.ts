import assert from "node:assert/strict";
import { test } from "node:test";
import { check, type Envelope, type QuestionRef } from "../../../engine/answer";
import {
    addDays,
    dayIn,
    fold,
    isSchoolDay,
    mastery,
    mondayOf,
    progressOf,
    sheetFor,
    weekdayOf,
    type Sitting,
} from "../record";

test("a lesson's result reads as secure, getting there or worth another look, and never finer", () => {
    const at = (right: number) => mastery({ stars: 1, on: "2026-09-01", minutes: 10, right });
    assert.deepEqual(
        [at(0.85), at(0.84), at(0.65), at(0.64)],
        ["secure", "growing", "growing", "revisit"],
    );
});

test("progress counts a lesson done from its first finished sitting, and a sheet not marked yet as done without a share", () => {
    const sat = (
        lesson: string,
        on: string,
        finished: boolean,
        mode: Sitting["mode"] = "paper",
    ): Sitting => ({
        child: "kid",
        lesson,
        on,
        minutes: 15,
        mode,
        finished,
        withGrownUp: true,
        subject: "maths",
    });
    const p = progressOf(
        ["a", "b", "c"],
        ["a", "b", "c"],
        "kid",
        [],
        [
            sat("a", "2026-09-02", false),
            sat("a", "2026-09-03", true),
            sat("a", "2026-09-01", true),
            sat("c", "2026-09-04", true),
        ],
        "2026-08-31",
        "2026-09-07",
    );
    assert.deepEqual(p.done.a, { stars: 1, on: "2026-09-01", minutes: 45, right: 0 });
    assert.equal(
        p.current,
        "b",
        "the child is on the first lesson of the path not done, whatever is done after it",
    );
    assert.equal(p.week, 2);
});

const FAMILY = "11111111-1111-4111-8111-111111111111";
const KID = "21111111-1111-4111-8111-111111111111";
const TABLET = "a1111111-1111-4111-8111-111111111111";
const PARENT = "81111111-1111-4111-8111-111111111111";
const TZ = "America/Denver";

let seq = 0;

/** An event at noon in Denver on a day, so the day it falls on is never in doubt. */
function ev<K extends Envelope["kind"]>(
    kind: K,
    day: string,
    data: Extract<Envelope, { kind: K }>["data"],
    device = TABLET,
): Envelope {
    seq++;
    const made = check({
        id: `e${String(seq).padStart(7, "0")}-1111-4111-8111-111111111111`,
        family_id: FAMILY,
        kid_id: KID,
        kind,
        data,
        actor: device === PARENT ? PARENT : null,
        device,
        seq,
        at: `${day}T18:00:00.000Z`,
    });
    assert.ok(made.ok, made.ok ? "" : made.problem);
    return made.envelope;
}

const q = (lesson: string, n: number): QuestionRef => ({
    lesson,
    lessonHash: "h",
    section: "do",
    n,
    item: "bonds.make-ten",
    itemHash: "i",
    variant: `a=${n}`,
    ask: `${n} and how many make 10?`,
    skills: ["bonds-to-10"],
});
const subjectOf = () => "maths";

test("days are days, and a school week runs Monday to Friday", () => {
    assert.equal(weekdayOf("2026-08-03"), "Monday");
    assert.equal(mondayOf("2026-08-07"), "2026-08-03");
    assert.equal(mondayOf("2026-08-03"), "2026-08-03");
    assert.equal(
        mondayOf("2026-08-09"),
        "2026-08-03",
        "a Sunday belongs to the week that just ended",
    );
    assert.equal(isSchoolDay("2026-08-08"), false);
    assert.equal(addDays("2026-08-31", 1), "2026-09-01", "and a day crosses a month");
});

test("a day is the day an instant falls on in the family's time zone", () => {
    assert.equal(dayIn("2026-09-14T03:00:00.000Z", TZ), "2026-09-13");
    assert.equal(dayIn("2026-09-14T18:00:00.000Z", TZ), "2026-09-14");
});

test("a sitting is its beginning and its end, and one never ended is not finished", () => {
    const log = [
        ev("sitting-began", "2026-09-07", {
            sitting: "s1",
            lesson: "g1-a",
            lessonHash: "h",
            pack: "p",
            mode: "screen",
        }),
        ev("sitting-ended", "2026-09-07", {
            sitting: "s1",
            finished: true,
            minutes: 14,
            withGrownUp: true,
        }),
        ev("sitting-began", "2026-09-08", {
            sitting: "s2",
            lesson: "g1-b",
            lessonHash: "h",
            pack: "p",
            mode: "screen",
        }),
    ];
    const f = fold(log, TZ, subjectOf);
    assert.deepEqual(
        f.sittings.map((s) => [s.lesson, s.on, s.minutes, s.finished, s.withGrownUp, s.mode]),
        [
            ["g1-a", "2026-09-07", 14, true, true, "screen"],
            ["g1-b", "2026-09-08", 0, false, false, "screen"],
        ],
    );
});

test("a screen answer is its last `answered` in the sitting, and one waiting for a grown-up is not counted", () => {
    const base = {
        sitting: "s1",
        given: { k: "number" as const, text: "7" },
        timing: { k: "screen" as const, toFirstInput: 900, toAnswer: 4000, leftPage: false },
        rule: null,
        hints: 0,
    };
    const log = [
        ev("answered", "2026-09-07", {
            ...base,
            q: q("g1-a", 1),
            right: false,
            tries: 1,
            rule: "That is how many are in the frame. Count the empty squares.",
        }),
        ev("answered", "2026-09-07", { ...base, q: q("g1-a", 1), right: true, tries: 2 }),
        ev("answered", "2026-09-07", {
            ...base,
            q: q("g1-a", 2),
            right: null,
            tries: 1,
            given: { k: "unmarked" },
        }),
    ];
    const f = fold(log, TZ, subjectOf);
    assert.equal(f.attempts.length, 1);
    const [a] = f.attempts;
    assert.deepEqual(
        [a?.right, a?.tries, a?.mode, a?.toAnswer, a?.given],
        [true, 2, "screen", 4000, "7"],
    );
});

test("a paper mark belongs to the day the sheet was worked, and marking again corrects rather than doubles", () => {
    const log = [
        ev(
            "sheet-printed",
            "2026-09-06",
            {
                sheet: "sh1",
                lesson: "g1-a",
                lessonHash: "h",
                pack: "p",
                paper: "Letter",
                questions: [q("g1-a", 1), q("g1-a", 2)],
                grownUps: true,
            },
            PARENT,
        ),
        ev(
            "sitting-began",
            "2026-09-07",
            { sitting: "p1", lesson: "g1-a", lessonHash: "h", pack: "p", mode: "paper" },
            PARENT,
        ),
        ev(
            "sitting-ended",
            "2026-09-07",
            { sitting: "p1", finished: true, minutes: 20, withGrownUp: true },
            PARENT,
        ),
        ev(
            "marked",
            "2026-09-11",
            { sheet: "sh1", q: q("g1-a", 1), given: { k: "unmarked" }, right: false, rule: null },
            PARENT,
        ),
        ev(
            "marked",
            "2026-09-12",
            { sheet: "sh1", q: q("g1-a", 1), given: { k: "unmarked" }, right: true, rule: null },
            PARENT,
        ),
        ev(
            "marked",
            "2026-09-12",
            { sheet: "sh1", q: q("g1-a", 2), given: { k: "unmarked" }, right: true, rule: null },
            PARENT,
        ),
        ev(
            "day-added",
            "2026-09-12",
            { onDay: "2026-09-11", subject: "science", minutes: 90, note: "Museum" },
            PARENT,
        ),
    ];
    const f = fold(log, TZ, subjectOf);
    assert.deepEqual(
        f.attempts.map((a) => [a.n, a.on, a.right, a.markedBy]),
        [
            [1, "2026-09-07", true, "grown-up"],
            [2, "2026-09-07", true, "grown-up"],
        ],
    );
    assert.equal(sheetFor(f.printed, KID, "g1-a", "2026-09-07")?.sheet, "sh1");
    assert.equal(sheetFor(f.printed, KID, "g1-a", "2026-09-05"), null, "not before it was printed");
    assert.deepEqual(f.added, [
        { on: "2026-09-11", subject: "science", minutes: 90, note: "Museum" },
    ]);
});
