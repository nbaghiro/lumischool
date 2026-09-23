import assert from "node:assert/strict";
import { test } from "node:test";
import { check } from "../answer";

const ID = "00000000-0000-4000-8000-000000000001";

const envelope = (over: Record<string, unknown>): Record<string, unknown> => ({
    id: ID,
    family_id: ID,
    kid_id: null,
    actor: null,
    device: ID,
    seq: 0,
    at: "2026-09-14T09:12:00.000Z",
    kind: "signed-out",
    data: { everywhere: true },
    ...over,
});

const answered = (given: unknown): Record<string, unknown> =>
    envelope({
        kind: "answered",
        data: {
            sitting: "s",
            q: {
                lesson: "l",
                lessonHash: "h",
                section: "do",
                n: 1,
                item: "i",
                itemHash: "h",
                variant: "a=1",
                ask: "?",
                skills: [],
            },
            given,
            timing: { k: "paper" },
            right: null,
            tries: 1,
            rule: null,
            hints: 0,
        },
    });

/** The problem `check` gives, which the request edge answers with; it must never throw instead. */
const problem = (v: unknown): string => {
    const r = check(v);
    if (r.ok) assert.fail("the value passed the check");
    assert.equal(typeof r.problem, "string");
    return r.problem;
};

test("an envelope in the one shape passes", () => {
    assert.equal(check(envelope({})).ok, true);
});

test("a kind every object has is not an event kind or an answer kind, and is refused with a reason", () => {
    const names = new Set([
        "valueOf",
        "hasOwnProperty",
        "toLocaleString",
        "__proto__",
        "constructor",
        ...Object.getOwnPropertyNames(Object.prototype),
    ]);
    for (const name of names) {
        assert.equal(problem(envelope({ kind: name })), `kind "${name}" is not an event kind`);
        assert.equal(problem(answered({ k: name })), `given.k "${name}" is not an answer kind`);
    }
});

test("an instant or a day that is not on the calendar is refused, not thrown or rolled over", () => {
    for (const at of [
        "2026-13-01T00:00:00.000Z",
        "2026-09-14T25:00:00.000Z",
        "2026-02-30T00:00:00.000Z",
        "2026-09-14T09:60:00.000Z",
    ]) {
        assert.equal(
            problem(envelope({ at })),
            "at must be an instant in the one format, 2026-09-14T09:12:00.000Z",
            at,
        );
    }
    const shift = (from: string) =>
        envelope({ kind: "plan-changed", data: { op: { op: "shift", from, weeks: 1 } } });
    for (const from of ["2026-99-99", "2026-02-30", "2026-13-01", "2026-00-10"]) {
        assert.equal(problem(shift(from)), "shift needs a day and a whole number of weeks", from);
    }
    assert.equal(check(shift("2028-02-29")).ok, true, "a leap day is a day");
});

test("a drawing's strokes are x, y, pressure triples", () => {
    const drawing = (points: number[]) => answered({ k: "drawing", strokes: [{ points }] });
    assert.equal(check(drawing([1, 2, 0.5, 3, 4, 0.7])).ok, true);
    assert.equal(
        problem(drawing([1, 2])),
        "given.strokes must be strokes of x, y, pressure triples of finite numbers",
    );
});

test("the calendar's plan operations accept only their complete shapes", () => {
    const plan = (op: Record<string, unknown>): Record<string, unknown> =>
        envelope({ kind: "plan-changed", data: { op } });
    for (const op of [
        { op: "days-off", from: "2026-10-12", to: "2026-10-16", note: "At the lake" },
        { op: "school-days", weekdays: [1, 2, 3, 4, 6] },
        {
            op: "terms",
            terms: [
                { n: 1, from: "2026-08-31", to: "2026-12-18" },
                { n: 2, from: "2027-01-04", to: "2027-03-26" },
            ],
        },
        { op: "move", track: "maths", from: "2026-09-15", to: "2026-09-17" },
        { op: "undo", of: ID },
    ])
        assert.equal(check(plan(op)).ok, true, JSON.stringify(op));
    assert.equal(
        problem(plan({ op: "days-off", from: "2026-10-16", to: "2026-10-12", note: "" })),
        "days-off needs a first and last day in order, and a note",
    );
    assert.equal(
        problem(plan({ op: "school-days", weekdays: [1, 1] })),
        "school-days needs different weekdays, Monday 1 to Sunday 7",
    );
    assert.equal(
        problem(plan({ op: "undo", of: "last change" })),
        "undo needs the event id it takes back",
    );
});

test("a choice of worlds names each grade's worlds in term order and tweaks only what a tweak holds", () => {
    const chosen = (data: Record<string, unknown>): Record<string, unknown> =>
        envelope({ kind: "world-chosen", kid_id: ID, data });
    for (const data of [
        { terms: {}, tweaks: {} },
        {
            terms: { "1": ["valley-farm", "harbour", "railway"] },
            tweaks: {
                meadow: { weather: "breezy", guide: "firefly", motion: false },
                harbour: { landmarks: ["lighthouse"], creatures: [] },
            },
        },
    ])
        assert.equal(check(chosen(data)).ok, true, JSON.stringify(data));
    const refused = "world-chosen needs each grade's worlds in term order and each world's tweaks";
    for (const data of [
        { terms: { first: ["meadow"] }, tweaks: {} },
        { terms: { "1": [] }, tweaks: {} },
        { terms: { "1": ["meadow", ""] }, tweaks: {} },
        { terms: { "1": "meadow" }, tweaks: {} },
        { terms: {}, tweaks: { meadow: { colour: "#ff0000" } } },
        { terms: {}, tweaks: { meadow: { motion: "no" } } },
        { terms: {}, tweaks: { meadow: { toString: "x" } } },
        { terms: {} },
    ])
        assert.equal(problem(chosen(data)), refused, JSON.stringify(data));
});

test("an arrangement names its part and places one or more pieces, each at a finite number", () => {
    const arranged = (given: Record<string, unknown>) => answered({ k: "arranged", ...given });
    const plank = [
        { piece: "bag(0)", at: 3 },
        { piece: "bag(2)", at: -2 },
    ];
    assert.equal(check(arranged({ part: "balance-plank", places: plank })).ok, true);
    assert.equal(
        check(arranged({ part: "fair-cut", places: [{ piece: "cut", at: 4.5 }] })).ok,
        true,
    );
    for (const part of [undefined, "", 3]) {
        assert.equal(
            problem(arranged({ part, places: plank })),
            "given.part must name the part",
            String(part),
        );
    }
    for (const places of [
        undefined,
        [],
        "cut@4",
        [null],
        [{ piece: "cut" }],
        [{ piece: "cut", at: "4" }],
        [{ piece: 3, at: 4 }],
        [{ piece: "cut", at: Number.NaN }],
        [{ piece: "cut", at: Number.POSITIVE_INFINITY }],
    ]) {
        assert.equal(
            problem(arranged({ part: "fair-cut", places })),
            "given.places must be one or more pieces, each at a finite number",
            String(JSON.stringify(places)),
        );
    }
});

test("session placements and routines validate identity, duration, weekdays and child scope", () => {
    const op = {
        op: "session",
        id: "maths:2026-09-23:0",
        source: "maths:2026-09-23:0",
        track: "maths",
        lesson: "g1-counting",
        onDay: "2026-09-24",
        kind: "practice",
        minutes: 20,
        order: 0,
        note: "",
        removed: false,
    };
    const plan = (value: Record<string, unknown>) =>
        envelope({ kid_id: ID, kind: "plan-changed", data: { op: value } });
    assert.equal(check(plan(op)).ok, true);
    for (const change of [
        { minutes: 0 },
        { minutes: 241 },
        { minutes: 2.5 },
        { onDay: "2026-02-30" },
        { order: Infinity },
        { removed: "no" },
    ])
        assert.equal(check(plan({ ...op, ...change })).ok, false);
    assert.equal(check({ ...plan(op), kid_id: null }).ok, false);
    const routine = {
        op: "routine",
        track: "maths",
        from: "2026-09-23",
        weekdays: [1, 3, 5],
        sessions: 2,
    };
    assert.equal(check(plan(routine)).ok, true);
    assert.equal(check(plan({ ...routine, weekdays: [] })).ok, true);
    for (const change of [
        { weekdays: [1, 1] },
        { weekdays: [0] },
        { sessions: 0 },
        { sessions: 4 },
        { from: "bad" },
    ])
        assert.equal(check(plan({ ...routine, ...change })).ok, false);
});
