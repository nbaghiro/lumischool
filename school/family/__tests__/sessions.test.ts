import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { check, type Envelope, type PlanOp, type SessionOp } from "../../../engine/answer";
import { cellsFor, childRecord, trackDays, type PlanInput } from "../family";
import { foldCalendar } from "../calendar";
import { nowIn } from "../now";
import type { Sitting } from "../../record/record";
import type { YearLesson } from "../../year";
const today = "2026-09-23",
    kid = randomUUID(),
    family = randomUUID(),
    parent = randomUUID();
const base: PlanInput = {
    track: "maths",
    lessons: ["m1", "m2", "m3"],
    perWeek: 5,
    start: today,
    today,
    until: "2026-10-15",
    moves: [],
    sittings: [],
};
const session = (patch: Partial<SessionOp> = {}): SessionOp => ({
    op: "session",
    id: randomUUID(),
    source: null,
    track: "maths",
    onDay: today,
    lesson: "m2",
    kind: "lesson",
    minutes: 20,
    order: 1000,
    note: "",
    removed: false,
    ...patch,
});
const move = (op: PlanOp): PlanInput["moves"][number] => ({ on: today, op });
function event(op: PlanOp, child = kid): Envelope {
    const r = check({
        id: randomUUID(),
        family_id: family,
        kid_id: child,
        actor: parent,
        device: parent,
        seq: 1,
        at: `${today}T12:00:00.000Z`,
        kind: "plan-changed",
        data: { op },
    });
    assert.ok(r.ok, r.ok ? "" : r.problem);
    return r.envelope;
}
const sitting: Sitting = {
    child: kid,
    lesson: "m2",
    on: today,
    minutes: 20,
    mode: "screen",
    finished: true,
    withGrownUp: false,
    subject: "maths",
};
test("extras append, moving into an occupied day preserves its session, and removal targets only one", () => {
    const extra = session();
    const projection = session({
        id: `maths:${today}:0`,
        source: `maths:${today}:0`,
        lesson: "m1",
        onDay: "2026-09-24",
    });
    const days = trackDays({ ...base, moves: [move(extra), move(projection)] });
    assert.equal(days.filter((d) => d.on === today).length, 1);
    assert.equal(days.filter((d) => d.on === "2026-09-24").length, 2);
    const removed = trackDays({
        ...base,
        moves: [move(extra), move(projection), move({ ...extra, removed: true })],
    });
    assert.equal(removed.filter((d) => d.on === today).length, 0);
    assert.equal(removed.filter((d) => d.on === "2026-09-24").length, 2);
});
test("a manual projection and parked sessions survive pausing recurrence without a duplicate projection", () => {
    const pin = session({ id: `maths:${today}:0`, source: `maths:${today}:0`, lesson: "m1" });
    const pause: PlanOp = { op: "routine", track: "maths", from: today, weekdays: [], sessions: 1 };
    const days = trackDays({ ...base, moves: [move(pin), move(pause)] });
    assert.equal(days.length, 1);
    assert.equal(days[0]?.session, pin.id);
    assert.equal(
        trackDays({ ...base, moves: [move(pin), move(pause), move({ ...pin, onDay: null })] })
            .length,
        0,
    );
});
test("recurrence applies from its effective date and can generate two sessions per day", () => {
    const days = trackDays({
        ...base,
        moves: [
            move({ op: "routine", track: "maths", from: "2026-09-24", weekdays: [4], sessions: 2 }),
        ],
    });
    assert.equal(days.filter((d) => d.on === today).length, 1);
    assert.equal(days.filter((d) => d.on === "2026-09-24").length, 2);
    assert.equal(days.filter((d) => d.on === "2026-09-25").length, 0);
});
test("completed manual work is protected, and one sitting never completes two repeats", () => {
    const a = session(),
        b = session();
    const days = trackDays({
        ...base,
        perWeek: 0,
        sittings: [sitting],
        moves: [move(a), move(b), move({ ...a, removed: true })],
    });
    assert.ok(days.some((d) => d.session === a.id));
    const cells = cellsFor(days, [sitting], today);
    assert.equal(cells.filter((c) => c.state === "done").length, 1);
    assert.equal(cells.filter((c) => c.state === "planned").length, 1);
});
test("extra subjects and cross-grade lessons reach both the family calendar and the child's day; undo restores them", () => {
    const lessons: YearLesson[] = [
        {
            id: "art1",
            title: "Art",
            subject: "art",
            grade: 4,
            unit: 1,
            source: "a",
            goal: null,
            format: "teach",
        },
    ];
    const op = session({ track: "art", lesson: "art1" });
    const e = event(op);
    const sibling = { id: randomUUID(), grade: 1 };
    const record = childRecord([e], { id: kid, grade: 1 }, lessons, "UTC", today);
    assert.ok(nowIn(record).includes("art1"));
    const cal = foldCalendar({
        events: [e],
        sittings: [],
        kids: [{ id: kid, grade: 1 }, sibling],
        lessons,
        timeZone: "UTC",
        today,
        until: "2026-10-15",
    });
    assert.equal(cal.kids.get(kid)?.cells.get(today)?.length, 1);
    assert.equal(cal.kids.get(sibling.id)?.cells.get(today)?.length ?? 0, 0);
    const removed = event({ ...op, removed: true });
    removed.at = `${today}T13:00:00.000Z`;
    const undone = event({ op: "undo", of: removed.id });
    undone.at = `${today}T14:00:00.000Z`;
    assert.equal(
        nowIn(childRecord([e, removed], { id: kid, grade: 1 }, lessons, "UTC", today)).length,
        0,
    );
    assert.ok(
        nowIn(
            childRecord([e, removed, undone], { id: kid, grade: 1 }, lessons, "UTC", today),
        ).includes("art1"),
    );
});

test("pausing today's routine preserves work already begun, and completing one repeat does not lock its neighbour", () => {
    const pause: PlanOp = { op: "routine", track: "maths", from: today, weekdays: [], sessions: 1 };
    const finished = { ...sitting, lesson: "m1" };
    const paused = trackDays({ ...base, sittings: [finished], moves: [move(pause)] });
    assert.equal(paused.length, 1);
    assert.equal(cellsFor(paused, [finished], today)[0]?.state, "done");
    const a = session(),
        b = session();
    const kept = trackDays({
        ...base,
        perWeek: 0,
        sittings: [sitting],
        moves: [move(a), move(b), move({ ...b, removed: true })],
    });
    assert.equal(kept.length, 1);
    assert.equal(kept[0]?.session, a.id);
});
