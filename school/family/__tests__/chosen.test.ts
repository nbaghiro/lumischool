import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { check, type Envelope, type WorldTweak } from "../../../engine/answer";
import type { YearLesson } from "../../year";
import { chosenWorlds, savedChoice } from "../chosen";

const FAMILY = "11111111-1111-4111-8111-111111111111";
const KID = "21111111-1111-4111-8111-111111111111";
const OTHER = "31111111-1111-4111-8111-111111111111";
const PARENT = "81111111-1111-4111-8111-111111111111";
const KID_DEVICE = "a1111111-1111-4111-8111-111111111111";
const TZ = "America/Denver";
let seq = 0;

function logged<K extends Envelope["kind"]>(
    kind: K,
    at: string,
    data: Extract<Envelope, { kind: K }>["data"],
    kid: string,
    writer: string,
): Envelope {
    seq++;
    const made = check({
        id: `c${String(seq).padStart(7, "0")}-1111-4111-8111-111111111111`,
        family_id: FAMILY,
        kid_id: kid,
        kind,
        data,
        actor: writer === PARENT ? PARENT : null,
        device: writer,
        seq,
        at,
    });
    assert.ok(made.ok, made.ok ? "" : made.problem);
    return made.envelope;
}

const chose = (
    at: string,
    terms: Record<string, string[]>,
    tweaks: Record<string, WorldTweak> = {},
    kid = KID,
): Envelope => logged("world-chosen", at, { terms, tweaks }, kid, PARENT);

const began = (at: string, lesson: string, kid = KID): Envelope =>
    logged(
        "sitting-began",
        at,
        { sitting: `s${seq}`, lesson, lessonHash: "h", pack: "p", mode: "screen" },
        kid,
        KID_DEVICE,
    );

const facts = (id: string, grade: number, unit: number, subject = "maths"): YearLesson => ({
    id,
    source: `lessons/${id}.lumi`,
    title: id,
    goal: null,
    grade,
    unit,
    subject,
    format: "teach",
});

/**
 * Two years of nine units, one maths lesson a unit, so each term is three units; and three reading
 * lessons in the first year, which hang off the maths lessons of units 3, 6 and 9 (school/year.ts), so
 * one falls in each term.
 */
const LESSONS: YearLesson[] = [
    ...Array.from({ length: 9 }, (_, i) => facts(`g1-u${i + 1}`, 1, i + 1)),
    ...Array.from({ length: 9 }, (_, i) => facts(`g2-u${i + 1}`, 2, i + 1)),
    ...[1, 2, 3].map((n) => facts(`read-${n}`, 1, 1, "reading")),
];

const OWN: Record<number, string[]> = {
    1: ["meadow", "harbour", "railway"],
    2: ["woods", "kitchen", "town"],
};
const own = (grade: number): string[] => OWN[grade] ?? [];
const GRADES = [1, 2];

describe("the worlds a family chose, as each term's first work found them", () => {
    it("leaves every term in its own world for a family that never chose", () => {
        const w = chosenWorlds([began("2026-09-01T15:00:00.000Z", "g1-u1")], KID, LESSONS, TZ);
        assert.deepEqual([w.terms, w.tweaks], [{}, {}]);
        assert.deepEqual(savedChoice(w, own, GRADES), { terms: {}, tweaks: {} });
    });

    it("puts every term where a choice made before any work put it", () => {
        const log = [
            chose("2026-08-29T18:00:00.000Z", {
                "1": ["valley-farm", "winter-fair", "railway"],
                "2": ["woods", "kitchen", "valley-farm"],
            }),
            began("2026-09-01T15:00:00.000Z", "g1-u1"),
            began("2026-11-02T15:00:00.000Z", "g1-u4"),
        ];
        const w = chosenWorlds(log, KID, LESSONS, TZ);
        assert.deepEqual(w.terms, {
            "1": ["valley-farm", "winter-fair", "railway"],
            "2": ["woods", "kitchen", "valley-farm"],
        });
    });

    it("leaves a term with work in it as it was when a later choice changes it, and moves the terms with none", () => {
        const log = [
            chose("2026-08-29T18:00:00.000Z", { "1": ["valley-farm", "harbour", "railway"] }),
            began("2026-09-01T15:00:00.000Z", "g1-u2"),
            // the family changes its mind about the first term once the farm has work in it
            chose("2026-09-20T18:00:00.000Z", { "1": ["meadow", "winter-fair", "railway"] }),
        ];
        const w = chosenWorlds(log, KID, LESSONS, TZ);
        assert.deepEqual(w.terms, { "1": ["valley-farm", "winter-fair", "railway"] });
        assert.deepEqual(savedChoice(w, own, GRADES).terms, {
            "1": ["valley-farm", "winter-fair", "railway"],
        });
    });

    it("keeps a term that had work before any choice in its own world", () => {
        const log = [
            began("2026-09-01T15:00:00.000Z", "g1-u1"),
            chose("2026-09-20T18:00:00.000Z", { "1": ["valley-farm", "winter-fair", "railway"] }),
        ];
        const w = chosenWorlds(log, KID, LESSONS, TZ);
        assert.deepEqual(w.terms, { "1": [null, "winter-fair", "railway"] });
        assert.deepEqual(savedChoice(w, own, GRADES).terms, {
            "1": ["meadow", "winter-fair", "railway"],
        });
    });

    it("reads when the work happened rather than when it arrived, so a choice made while it waited offline changes nothing there", () => {
        // the choice reached the log first; the sitting began earlier on a device that was offline
        const log = [
            chose("2026-09-01T18:00:00.000Z", { "1": ["valley-farm", "harbour", "railway"] }),
            began("2026-09-01T15:00:00.000Z", "g1-u1"),
        ];
        const w = chosenWorlds(log, KID, LESSONS, TZ);
        assert.deepEqual(w.terms, { "1": [null, "harbour", "railway"] });
        assert.deepEqual(savedChoice(w, own, GRADES).terms, {
            "1": ["meadow", "harbour", "railway"],
        });
    });

    it("puts a term with no work back in its own world when a later choice leaves its grade out", () => {
        const log = [
            chose("2026-08-29T18:00:00.000Z", { "1": ["valley-farm", "winter-fair", "railway"] }),
            began("2026-09-01T15:00:00.000Z", "g1-u1"),
            chose("2026-09-20T18:00:00.000Z", {}),
        ];
        const w = chosenWorlds(log, KID, LESSONS, TZ);
        assert.deepEqual(w.terms, { "1": ["valley-farm", null, null] });
        assert.deepEqual(savedChoice(w, own, GRADES).terms, {
            "1": ["valley-farm", "harbour", "railway"],
        });
    });

    it("counts a lesson off the maths path as work in the term of the lesson it hangs off", () => {
        const log = [
            began("2026-09-01T15:00:00.000Z", "read-2"),
            chose("2026-09-20T18:00:00.000Z", { "1": ["valley-farm", "winter-fair", "railway"] }),
        ];
        const w = chosenWorlds(log, KID, LESSONS, TZ);
        assert.deepEqual(w.terms, { "1": ["valley-farm", null, "railway"] });
        assert.deepEqual(Object.keys(w.begun), ["1.2"]);
    });

    it("reads only this child's choices and work, and the tweaks of their latest choice", () => {
        const log = [
            chose(
                "2026-08-29T18:00:00.000Z",
                { "1": ["valley-farm", "harbour", "railway"] },
                {
                    meadow: { weather: "breezy" },
                },
            ),
            chose(
                "2026-09-02T18:00:00.000Z",
                { "1": ["meadow", "winter-fair", "railway"] },
                { harbour: { guide: "bird" } },
            ),
            began("2026-09-01T15:00:00.000Z", "g1-u5", OTHER),
            chose(
                "2026-09-03T18:00:00.000Z",
                { "2": ["woods", "winter-fair", "town"] },
                { woods: { motion: false } },
                OTHER,
            ),
        ];
        const w = chosenWorlds(log, KID, LESSONS, TZ);
        assert.deepEqual(w.terms, { "1": ["meadow", "winter-fair", "railway"] });
        assert.deepEqual(w.tweaks, { harbour: { guide: "bird" } });
        assert.deepEqual(w.begun, {}, "the other child's work is not this child's");
    });

    it("leaves a term with work in it exactly as it was when a later choice changes its world's tweaks", () => {
        const log = [
            chose(
                "2026-08-29T18:00:00.000Z",
                { "1": ["valley-farm", "harbour", "railway"] },
                { "valley-farm": { landmarks: ["barn", "tractor"], weather: "clear" } },
            ),
            began("2026-09-01T15:00:00.000Z", "g1-u1"),
            // the tractor may already be lit beside a lesson done on the farm
            chose(
                "2026-09-20T18:00:00.000Z",
                { "1": ["valley-farm", "harbour", "railway"] },
                { "valley-farm": { landmarks: ["barn"] }, harbour: { weather: "rain" } },
            ),
        ];
        assert.deepEqual(savedChoice(chosenWorlds(log, KID, LESSONS, TZ), own, GRADES), {
            terms: { "1": ["valley-farm", "harbour", "railway"] },
            tweaks: {
                "valley-farm": { landmarks: ["barn", "tractor"], weather: "clear" },
                harbour: { weather: "rain" },
            },
        });
    });

    it("keeps a world with no tweaks when its term's work began without any, whatever is tweaked later", () => {
        const log = [
            began("2026-09-01T15:00:00.000Z", "g1-u1"),
            chose("2026-09-20T18:00:00.000Z", {}, { meadow: { creatures: [] } }),
        ];
        assert.deepEqual(savedChoice(chosenWorlds(log, KID, LESSONS, TZ), own, GRADES).tweaks, {});
    });

    it("keeps a place in no term as it stood at the child's first work, and takes the latest before any", () => {
        const before = chose("2026-08-29T18:00:00.000Z", {}, { marsh: { weather: "mist" } });
        const after = chose("2026-09-20T18:00:00.000Z", {}, { marsh: { landmarks: [] } });
        const work = began("2026-09-01T15:00:00.000Z", "g2-u4");
        const tweaks = (log: Envelope[]) =>
            savedChoice(chosenWorlds(log, KID, LESSONS, TZ), own, GRADES).tweaks;
        assert.deepEqual(tweaks([before, work, after]), { marsh: { weather: "mist" } });
        assert.deepEqual(tweaks([before, after]), { marsh: { landmarks: [] } });
    });

    it("says the day each term's first work happened, in the family's own time zone", () => {
        const log = [
            began("2026-09-03T15:00:00.000Z", "g1-u2"),
            began("2026-09-01T03:00:00.000Z", "g1-u1"),
            began("2026-11-02T15:00:00.000Z", "g2-u7"),
        ];
        assert.deepEqual(chosenWorlds(log, KID, LESSONS, TZ).begun, {
            "1.1": "2026-08-31",
            "2.3": "2026-11-02",
        });
    });
});
