import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { check, type Envelope } from "../../../engine/answer";
import { events, type Event } from "../schema";

// An envelope is one events row: the same keys, and the same type in every field. `kind` and `data`
// are correlated per kind in `Envelope` and wide in the row, so they are compared at the row's width.
// The type check fails, not this runtime, when the two drift.

type Equal<A, B> =
    (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
// Mapped over the concrete union rather than a type parameter, so it yields one object and does not
// distribute into one per kind, which the equality below would count as a different type.
type WideEnvelope = {
    [K in keyof Envelope]: K extends "kind"
        ? Event["kind"]
        : K extends "data"
          ? Event["data"]
          : Envelope[K];
};

export type SameKeys = Expect<Equal<keyof Envelope, keyof Event>>;
export type SameRow = Expect<Equal<WideEnvelope, Event>>;
export type SameId = Expect<Equal<Envelope["id"], Event["id"]>>;
export type SameFamily = Expect<Equal<Envelope["family_id"], Event["family_id"]>>;
export type SameKid = Expect<Equal<Envelope["kid_id"], Event["kid_id"]>>;
export type SameKind = Expect<Equal<Envelope["kind"], Event["kind"]>>;
export type SameData = Expect<Equal<Envelope["data"], Event["data"]>>;
export type SameActor = Expect<Equal<Envelope["actor"], Event["actor"]>>;
export type SameDevice = Expect<Equal<Envelope["device"], Event["device"]>>;
export type SameSeq = Expect<Equal<Envelope["seq"], Event["seq"]>>;
export type SameAt = Expect<Equal<Envelope["at"], Event["at"]>>;

describe("an envelope is an events row", () => {
    it("has exactly the table's column names, which are its property names", () => {
        const row: Event = {
            id: "00000000-0000-5000-8000-000000000001",
            family_id: "00000000-0000-5000-8000-000000000002",
            kid_id: null,
            kind: "day-added",
            data: { onDay: "2026-09-16", subject: "science", minutes: 60, note: "A museum." },
            actor: null,
            device: "00000000-0000-5000-8000-000000000003",
            seq: 0,
            at: "2026-09-16T10:00:00.000Z",
        };
        const columns = getTableConfig(events)
            .columns.map((c) => c.name)
            .sort();
        assert.deepEqual(Object.keys(row).sort(), columns);
        assert.equal(check(row).ok, true, "a row read back passes the edge unchanged");
    });

    it("refuses an instant in any format but the one", () => {
        const row = {
            id: "00000000-0000-5000-8000-000000000001",
            family_id: "00000000-0000-5000-8000-000000000002",
            kid_id: null,
            kind: "day-added",
            data: { onDay: "2026-09-16", subject: "science", minutes: 60, note: "x" },
            actor: null,
            device: "00000000-0000-5000-8000-000000000003",
            seq: 0,
        };
        for (const at of [
            "2026-09-16 10:00:00Z",
            "2026-09-16T10:00:00Z",
            "2026-09-16T10:00:00+00:00",
            "2026-09-16T10:00:00.000000Z",
        ]) {
            assert.equal(check({ ...row, at }).ok, false, at);
        }
        assert.equal(check({ ...row, at: "2026-09-16T10:00:00.000Z" }).ok, true);
    });
});
