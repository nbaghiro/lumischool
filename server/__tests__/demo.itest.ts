// The Harlows, written into the test database by the same code `npm run db:demo` runs, and used
// through the API as any family is: their parents sign in with the code sent to their address.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { gzipSync } from "node:zlib";
import { closeApp, open, type Store } from "../db/client";
import { demo } from "../db/seed/demo";
import { DEMO, TUTORS } from "../db/seed/demo-household";
import { prepare, truncate } from "../db/__tests__/test-db";
import { loadPack } from "../pack";
import { at, Browser, items, local, signIn, text } from "./browser";

const ROOT = join(import.meta.dirname, "..", "..");

/** A pack written by `tools/pack.ts` as `npm run pack` writes one, into a folder of this run's own. */
function packDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "lumischool-pack-"));
    execFileSync(
        process.execPath,
        ["--import", join(ROOT, "tools/scripts/resolve.ts"), join(ROOT, "tools/pack.ts"), dir],
        { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] },
    );
    return dir;
}

const reason = await prepare();
const owner: Store | null = reason === null ? open() : null;

after(async () => {
    await closeApp();
    if (owner) await owner.close();
});

const { config, outbox } = local();
const parent = new Browser(config);
let written = 0;
let packs = "";

async function logOf(name: string): Promise<unknown[]> {
    const family = await parent.call("GET", "/api/family");
    const kid = items(at(family.body, "kids")).find((k) => at(k, "name") === name);
    return items(
        at((await parent.call("GET", `/api/events?kid=${text(at(kid, "id"))}`)).body, "events"),
    );
}

const answered = (log: unknown[], track: RegExp) =>
    log.filter(
        (e) => at(e, "kind") === "answered" && track.test(text(at(e, "data", "q", "lesson"))),
    );

const firstTry = (list: unknown[]): number =>
    list.filter((e) => at(e, "data", "right") === true && at(e, "data", "tries") === 1).length /
    Math.max(1, list.filter((e) => at(e, "data", "right") !== null).length);

describe("the seeded Harlows", { skip: reason ?? false }, () => {
    before(async () => {
        if (!owner) return;
        await truncate(owner);
        written = (await demo(owner)).written;
        const signedIn = await signIn(parent, outbox, DEMO.parents[1]?.email ?? "");
        assert.ok(at(signedIn.body, "me"), JSON.stringify(signedIn.body));
        packs = packDir();
        const pack = loadPack(packs);
        assert.ok(!("problem" in pack), "problem" in pack ? pack.problem : "");
        config.pack = pack;
    });

    after(() => {
        if (packs) rmSync(packs, { recursive: true, force: true });
    });

    it("is written through the store's own rules, and a second run writes nothing", async () => {
        assert.ok(owner);
        assert.ok(written > 2000, `${written} events`);
        const again = await demo(owner);
        assert.equal(again.already, true);
        assert.equal(again.written, 0);
    });

    it("has two parents, a tutor whose window is open, a removed tutor, three children, the family's PIN, and no children's view left open", async () => {
        const family = await parent.call("GET", "/api/family");
        assert.deepEqual(
            items(at(family.body, "kids")).map((k) => [
                at(k, "name"),
                at(k, "grade"),
                at(k, "settings", "picture"),
            ]),
            [
                ["Rosie", 1, "hedgehog"],
                ["Leo", 3, "owl"],
                ["Ivy", 4, "fox"],
            ],
        );
        const members = items(at(family.body, "members"));
        assert.equal(members.filter((m) => at(m, "kid_id") === null).length, 2);
        assert.equal(members.filter((m) => at(m, "ended_at") !== null).length, 1);
        assert.ok(owner);
        const kinds = await owner.raw<
            { kind: string }[]
        >`select distinct kind from keys where family_id = ${DEMO.family.id} order by kind`;
        assert.deepEqual(
            kinds.map((k) => k.kind),
            ["pin", "session"],
            "the PIN is set, and the views Anna opened have all run out",
        );
        const views = await parent.call("GET", "/api/kid-sessions");
        assert.deepEqual(at(views.body, "pin"), true);
    });

    it("makes each child a different learner: Leo strong in maths and weaker in reading, Rosie on hints, Ivy on paper", async () => {
        const leo = await logOf("Leo");
        assert.ok(firstTry(answered(leo, /^g3-/)) > 0.85);
        assert.ok(firstTry(answered(leo, /^reading-/)) < 0.7);
        const hints = async (name: string) =>
            (await logOf(name)).filter((e) => at(e, "kind") === "hint-opened").length;
        const rosie = await hints("Rosie");
        assert.ok(rosie > 3 * (await hints("Leo")) && rosie > 3 * (await hints("Ivy")));
        const ivy = await logOf("Ivy");
        const modes = ivy
            .filter((e) => at(e, "kind") === "sitting-began")
            .map((e) => at(e, "data", "mode"));
        assert.ok(modes.filter((m) => m === "paper").length / modes.length > 0.6);
        const rules = answered(await logOf("Rosie"), /^g1-/)
            .map((e) => at(e, "data", "rule"))
            .filter((r) => typeof r === "string");
        assert.ok(
            rules.some((r, i) => rules.indexOf(r) !== i),
            "a named mistake repeats",
        );
    });

    it("names only real revisions: a pack and a body that was saved resolve in the content store, and every lesson and item hash names a level of the pack", async () => {
        const log = items(at((await parent.call("GET", "/api/events")).body, "events"));
        // a revision is a body somebody saved, which the store holds by its hash: the catalogue's
        // manifest, which is what a pack digest is, and a question a parent wrote
        const revisions = new Set<string>();
        // a lesson or item hash names the level a child was drawn, which is worked out from a file
        // rather than stored, so it is checked against the pack (engine/pack.ts, PackLevel.hash)
        const levels = new Set<string>();
        const asked = new Map<string, Set<string>>();
        const item = (q: unknown): void => {
            const lesson = at(q, "lesson"),
                hash = at(q, "itemHash");
            if (typeof lesson !== "string" || typeof hash !== "string") return;
            const mine = asked.get(lesson) ?? new Set<string>();
            mine.add(hash);
            asked.set(lesson, mine);
        };
        for (const e of log) {
            for (const path of [["pack"], ["hash"]]) {
                const h = at(e, "data", ...path);
                if (typeof h === "string") revisions.add(h);
            }
            const lessonHash = at(e, "data", "lessonHash");
            if (typeof lessonHash === "string") levels.add(lessonHash);
            item(at(e, "data", "q"));
            for (const q of at(e, "kind") === "sheet-printed"
                ? items(at(e, "data", "questions"))
                : []) {
                const h = at(q, "lessonHash");
                if (typeof h === "string") levels.add(h);
                item(q);
            }
        }
        assert.ok(revisions.size > 1, "the log names no pack and no body that was saved");
        for (const h of revisions)
            assert.equal((await parent.call("GET", `/api/content/${h}`)).status, 200, h);
        const view = (await parent.call("GET", "/api/pack")).body;
        const digest = text(at(view, "pack"));
        const lessons = items(at(view, "index", "lessons"));
        // the index carries the first ten characters of each level's hash (engine/pack.ts, LevelFacts)
        const known = new Set<string>();
        const fileOf = new Map<string, string>();
        for (const l of lessons) {
            fileOf.set(text(at(l, "id")), text(at(l, "file")));
            for (const level of ["easy", "medium", "hard"]) {
                const h = at(l, "levels", level, "hash");
                if (typeof h === "string") known.add(h);
            }
        }
        assert.ok(levels.size > 30, `the log names ${levels.size} lesson hashes`);
        for (const h of levels)
            assert.ok(
                known.has(h.slice(0, 10)),
                `${h} is not a level of any lesson in the pack, so no sitting can be told from a lesson that has changed`,
            );
        assert.ok(asked.size > 30, `the log names questions from ${asked.size} lessons`);
        for (const [lesson, hashes] of asked) {
            const file = fileOf.get(lesson);
            assert.ok(file, `${lesson} is not in the pack`);
            const body = (await parent.call("GET", `/api/pack/${digest}/${file}`)).body;
            const mine = new Set<string>();
            for (const level of ["easy", "medium", "hard"])
                for (const section of items(at(body, "levels", level, "sections")))
                    for (const block of items(at(section, "blocks")))
                        if (at(block, "k") === "ask") mine.add(text(at(block, "item", "hash")));
            for (const h of hashes) {
                // a question a parent wrote and put on a sheet is not one of the lesson's items: it is
                // a body they saved, so it is in the content store under its own hash
                if (mine.has(h)) continue;
                assert.equal(
                    (await parent.call("GET", `/api/content/${h}`)).status,
                    200,
                    `${h} is neither an item of ${lesson} at any level nor a body that was saved`,
                );
            }
        }
    });

    it("opens a children's view for Rosie and Leo, shows their work from the seed and Leo's tutor, and leaves it with the family's PIN", async () => {
        const grown = new Browser(config);
        const email = DEMO.parents[0]?.email ?? "";
        assert.ok(at((await signIn(grown, outbox, email)).body, "me"));
        const kids = items(at((await grown.call("GET", "/api/family")).body, "kids"));
        const rosie = text(at(kids[0], "id"));
        const leo = text(at(kids[1], "id"));
        const opened = await grown.call("POST", "/api/kid-sessions", {
            body: { kids: [rosie, leo] },
        });
        assert.equal(opened.status, 204, JSON.stringify(opened.body));
        const view = await grown.call("GET", "/api/kid");
        assert.deepEqual(
            items(at(view.body, "kids")).map((k) => at(k, "name")),
            ["Rosie", "Leo"],
        );
        const state = await grown.call("GET", `/api/kid/${rosie}/state`);
        assert.ok(items(at(state.body, "events")).length > 100, "Rosie's work from the seed");
        const tutors = await grown.call("GET", `/api/kid/${leo}/state`);
        assert.deepEqual(
            items(at(tutors.body, "tutors")).map((t) => at(t, "name")),
            ["Grace Okafor"],
        );
        const left = await grown.call("POST", "/api/kid/leave", { body: { pin: DEMO.pin } });
        assert.equal(left.status, 204, JSON.stringify(left.body));
        assert.equal(at((await grown.call("GET", "/api/me")).body, "user", "email"), email);
    });
    it("folds each child's record on the way out, small and only for the view's own children, and serves the pack it was folded against", async () => {
        const grown = new Browser(config);
        assert.ok(at((await signIn(grown, outbox, DEMO.parents[0]?.email ?? "")).body, "me"));
        const kids = items(at((await grown.call("GET", "/api/family")).body, "kids"));
        const rosie = text(at(kids[0], "id"));
        const ivy = text(at(kids[2], "id"));
        assert.equal(
            (await grown.call("POST", "/api/kid-sessions", { body: { kids: [rosie] } })).status,
            204,
        );

        const record = await grown.call("GET", `/api/kid/${rosie}/record`);
        assert.equal(record.status, 200, JSON.stringify(record.body));
        const b = record.body;
        assert.equal(at(b, "kid", "name"), "Rosie");
        assert.equal(at(b, "pack"), config.pack?.digest);
        assert.match(text(at(b, "start")), /^\d{4}-\d{2}-\d{2}$/);
        // The plan is the grade's default with the family's own ops over it, so what Rosie ends up
        // doing is the last word on each track. The seed turns the rest of grade 1's default off by
        // hand, and this fails the day the default grows a subject the seed does not answer for.
        const on = new Map<string, boolean>();
        for (const t of items(at(b, "tracks"))) on.set(text(at(t, "track")), at(t, "on") === true);
        assert.deepEqual(
            [...on]
                .filter(([, yes]) => yes)
                .map(([track]) => track)
                .sort(),
            ["maths", "reading", "writing"],
        );
        const years = items(at(b, "years"));
        assert.deepEqual(
            years.map((y) => at(y, "grade")),
            [1],
        );
        const done = at(years[0], "progress", "done");
        assert.ok(
            typeof done === "object" && done !== null && Object.keys(done).length >= 5,
            "lessons done in twenty weeks",
        );
        assert.ok(
            text(at(years[0], "progress", "current")).startsWith("g1-"),
            "on a grade 1 maths lesson",
        );
        const plan = items(at(b, "plan"));
        assert.deepEqual(
            plan.map((p) => at(p, "track")).sort((a, b) => text(a).localeCompare(text(b))),
            ["maths", "reading", "writing"],
        );
        for (const p of plan)
            assert.ok(items(at(p, "days")).length > 20, `${text(at(p, "track"))} has planned days`);
        assert.deepEqual(at(b, "unfinished"), [], "the seed ends every sitting");
        assert.deepEqual(
            [
                at(b, "worlds", "terms"),
                at(b, "worlds", "tweaks"),
                at(b, "kid", "settings", "worlds"),
            ],
            [{}, { meadow: { weather: "breezy" } }, undefined],
            "the worlds are chosen with the plan, as an event, and not kept in the child's settings",
        );
        assert.ok(
            at(b, "worlds", "begun", "1.1"),
            "the meadow has had work in it from the first week",
        );
        const bytes = gzipSync(JSON.stringify(b)).length;
        assert.ok(bytes < 30_000, `the record is ${bytes} bytes gzipped`);
        const whole = gzipSync(
            JSON.stringify((await grown.call("GET", `/api/kid/${rosie}/state`)).body),
        ).length;
        assert.ok(
            bytes * 4 < whole,
            `the record (${bytes}) is far smaller than the log (${whole})`,
        );

        assert.equal(
            (await grown.call("GET", `/api/kid/${ivy}/record`)).status,
            404,
            "not a child of this view",
        );

        const one = await grown.call("GET", `/api/kid/${rosie}/state?lesson=g1-counting-to-twenty`);
        const events = items(at(one.body, "events"));
        assert.ok(events.length > 10);
        for (const e of events) {
            const lesson = at(e, "data", "lesson") ?? at(e, "data", "q", "lesson");
            assert.ok(
                at(e, "kind") === "sitting-ended" || lesson === "g1-counting-to-twenty",
                text(at(e, "kind")),
            );
        }

        const pack = await grown.call("GET", `/api/kid/${rosie}/pack`);
        assert.equal(at(pack.body, "pack"), config.pack?.digest);
        const lessons = items(at(pack.body, "index", "lessons"));
        assert.ok(lessons.length > 200);
        const file = text(
            at(
                lessons.find((l) => at(l, "id") === "g1-counting-to-twenty"),
                "file",
            ),
        );
        const digest = text(at(pack.body, "pack"));
        const res = await grown.handle(
            new Request(`http://localhost:8501/api/kid/${rosie}/pack/${digest}/${file}`, {
                headers: {
                    cookie: [...grown.jar]
                        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                        .join("; "),
                },
            }),
            grown.ip,
        );
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("cache-control"), "private, max-age=31536000, immutable");
        assert.equal(at(await res.json(), "id"), "g1-counting-to-twenty");
        assert.equal(
            (await grown.call("GET", `/api/kid/${rosie}/pack/${digest}/lessons/nowhere.json`))
                .status,
            404,
        );
        assert.equal(
            (await grown.call("GET", `/api/kid/${rosie}/pack/0000/${file}`)).status,
            404,
            "another pack",
        );
        assert.equal(
            (await grown.call("GET", `/api/pack/${digest}/${file}`)).status,
            401,
            "a child's cookie opens no grown-up route",
        );

        assert.equal(
            (await grown.call("POST", "/api/kid/leave", { body: { pin: DEMO.pin } })).status,
            204,
        );
        assert.equal(
            at((await grown.call("GET", "/api/pack")).body, "pack"),
            digest,
            "a grown-up reads the same pack",
        );
    });

    it("folds each child for a parent's page: the record, what came back from last Monday, what still waits with its printed questions, and one thing to look at; a tutor is refused", async () => {
        const kids = items(at((await parent.call("GET", "/api/family")).body, "kids"));
        let waited = 0;
        for (const kid of kids) {
            const id = text(at(kid, "id"));
            const answer = await parent.call("GET", `/api/kids/${id}/record`);
            assert.equal(answer.status, 200, JSON.stringify(answer.body));
            const b = answer.body;
            assert.equal(at(b, "kid", "id"), id);
            assert.equal(at(b, "pack"), config.pack?.digest);
            assert.ok(items(at(b, "plan")).length > 0, "the plan the child's view reads");
            const from = text(at(b, "from"));
            const back = items(at(b, "back"));
            const waiting = back.filter(
                (s) => at(s, "mode") === "paper" && at(s, "marked") === false,
            );
            waited += waiting.length;
            for (const s of waiting) {
                assert.equal(typeof at(s, "sheet"), "string", "a waiting sheet names its print");
                assert.ok(items(at(s, "questions")).length > 0, "and carries its questions");
            }
            for (const s of back)
                assert.ok(
                    text(at(s, "on")) >= from || waiting.includes(s),
                    "older sheets only while they wait",
                );
            const bytes = gzipSync(JSON.stringify(b)).length;
            assert.ok(bytes < 40_000, `the grown-up's record is ${bytes} bytes gzipped`);
        }
        assert.ok(waited > 0, "the seed leaves paper sheets waiting to be marked");
        const looks = await Promise.all(
            kids.map(async (k) =>
                at(
                    (await parent.call("GET", `/api/kids/${text(at(k, "id"))}/record`)).body,
                    "look",
                ),
            ),
        );
        assert.ok(
            looks.some((l) => l !== null && typeof at(l, "rule") === "string"),
            "a named mistake came up more than once for someone",
        );

        const tutor = new Browser(config, "198.51.100.40");
        const grace = TUTORS.find((t) => t.key === "grace");
        assert.ok(grace);
        assert.ok(at((await signIn(tutor, outbox, grace.email)).body, "me"));
        const reached = items(at((await tutor.call("GET", "/api/family")).body, "kids"));
        assert.equal(reached.length, 1);
        const refused = await tutor.call("GET", `/api/kids/${text(at(reached[0], "id"))}/record`);
        assert.equal(refused.status, 403);
        assert.equal(at(refused.body, "error"), "not-allowed");
    });

    it("writes the family again with --fresh in one transaction, and the old family's sessions go with it", async () => {
        assert.ok(owner);
        const fresh = await demo(owner, { fresh: true });
        assert.equal(fresh.already, false);
        assert.ok(fresh.written > 2000, `${fresh.written} events`);
        assert.equal((await parent.call("GET", "/api/me")).status, 401);
    });
});
