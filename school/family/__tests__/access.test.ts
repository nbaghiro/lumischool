import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EVENT_KINDS, type Envelope } from "../../../engine/answer";
import { ACCESS, isParent, mayRead, mayWrite, reach, reaches } from "../access";

const AUTH_KINDS = [
    "signed-in",
    "signed-out",
    "session-changed",
    "login-changed",
    "member-added",
    "member-changed",
    "member-removed",
    "consent-given",
    "consent-withdrawn",
    "kid-session-opened",
    "kid-session-ended",
    "pin-set",
    "kid-deleted",
    "exported",
] as const;

const sitting = (mode: "screen" | "paper"): Envelope => ({
    id: "00000000-0000-4000-8000-000000000001",
    family_id: "00000000-0000-4000-8000-000000000002",
    kid_id: "00000000-0000-4000-8000-000000000003",
    kind: "sitting-began",
    data: { sitting: "s", lesson: "g1-making-ten", lessonHash: "h", pack: "p", mode },
    actor: null,
    device: "00000000-0000-4000-8000-000000000004",
    seq: 0,
    at: "2026-09-14T09:00:00.000Z",
});

const window = { kid_id: "maya", from_day: "2026-09-10", to_day: "2026-10-16", ended_at: null };

describe("who may write and read each kind", () => {
    it("has an entry for every event kind", () => {
        assert.deepEqual(Object.keys(ACCESS).sort(), [...EVENT_KINDS].sort());
    });

    it("lets only the server write the thirteen auth kinds, and neither a child's view nor a tutor read them", () => {
        for (const kind of AUTH_KINDS) {
            assert.deepEqual(ACCESS[kind].write, [], kind);
            assert.equal(mayRead("kid", kind), false, kind);
            assert.equal(mayRead("tutor", kind), false, kind);
            assert.equal(mayRead("parent", kind), true, kind);
        }
    });

    it("keeps a child's answers to their view and a grown-up's marks to people", () => {
        for (const kind of ["answered", "hint-opened", "round-played"] as const)
            assert.deepEqual(ACCESS[kind].write, ["kid"], kind);
        for (const kind of ["sheet-printed", "marked"] as const)
            assert.equal(ACCESS[kind].write.includes("kid"), false, kind);
        assert.deepEqual(ACCESS["plan-changed"].write, ["parent"]);
        assert.equal(
            mayRead("kid", "day-added"),
            false,
            "a parent's note on a day is not the child's",
        );
    });

    it("lets a parent choose a child's worlds and the child's view read the choice, and no one else", () => {
        assert.deepEqual(ACCESS["world-chosen"].write, ["parent"]);
        assert.equal(mayRead("kid", "world-chosen"), true);
        assert.equal(mayRead("tutor", "world-chosen"), false);
    });

    it("lets a child's view record screen sittings only, since a paper sitting is recorded by a grown-up", () => {
        assert.equal(mayWrite("kid", sitting("screen")), null);
        assert.match(mayWrite("kid", sitting("paper")) ?? "", /screen sittings/);
        assert.equal(mayWrite("parent", sitting("paper")), null);
    });
});

describe("a member's reach on a day", () => {
    it("gives a parent every kid, and a removed parent nothing", () => {
        const parent = { kid_id: null, from_day: null, to_day: null, ended_at: null };
        assert.equal(reach([parent], "2026-09-14"), "every kid");
        assert.equal(isParent([{ ...parent, ended_at: "2026-09-01T00:00:00.000Z" }]), false);
    });

    it("gives a tutor their kid on both ends of the window and not a day either side", () => {
        assert.equal(reaches([window], "maya", "2026-09-10"), true);
        assert.equal(reaches([window], "maya", "2026-10-16"), true);
        assert.equal(reaches([window], "maya", "2026-09-09"), false);
        assert.equal(reaches([window], "maya", "2026-10-17"), false);
        assert.equal(reaches([window], "theo", "2026-09-14"), false, "never the other kid");
    });

    it("gives a tutor whose membership has ended nothing, inside the window or not", () => {
        assert.deepEqual(
            reach([{ ...window, ended_at: "2026-09-11T18:00:00.000Z" }], "2026-09-14"),
            [],
        );
    });
});
