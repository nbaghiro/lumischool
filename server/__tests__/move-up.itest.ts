// Moving a child up a year, or back (.docs/api.md): the row and a `moved-up` event in one transaction,
// taken by a parent of the family, and only to the grade next to the child's that is offered.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PACK, type LessonFacts } from "../../engine/pack";
import { closeApp, open, type Store } from "../db/client";
import { prepare, truncate } from "../db/__tests__/test-db";
import { addKid, at, Browser, local, sessionInto, startFamily, type Answer } from "./browser";

const reason = await prepare();
const owner: Store | null = reason === null ? open() : null;

after(async () => {
    await closeApp();
    if (owner) await owner.close();
});

const db = (): Store => {
    if (!owner) throw new Error("no database");
    return owner;
};

const { config, outbox } = local();
// one lesson a grade, so grades one to four are written and five is not
const lesson = (grade: number): LessonFacts => ({
    id: `g${grade}-one`,
    source: `lessons/g${grade}-one.lumi`,
    title: "One",
    goal: null,
    grade,
    unit: 1,
    subject: "maths",
    format: "teach",
    art: [],
    file: `lessons/g${grade}-one.json`,
    levels: ["medium"],
    first: null,
    skills: [],
});
config.pack = {
    digest: "test",
    index: { pack: PACK, lessons: [1, 2, 3, 4].map(lesson) },
    file: () => null,
};
const made = { family: "", maya: "", other: "" };
const parent = new Browser(config);

const move = (b: Browser, kid: string, grade: unknown): Promise<Answer> =>
    b.call("POST", `/api/kids/${kid}/move-up`, { body: { grade } });

async function gradeOf(kid: string): Promise<number | undefined> {
    const [row] = await db().raw<{ grade: number }[]>`select grade from kids where id = ${kid}`;
    return row?.grade;
}

async function moves(kid: string): Promise<{ data: unknown; actor: string | null }[]> {
    return db().raw<{ data: unknown; actor: string | null }[]>`
        select data, actor from events where kid_id = ${kid} and kind = 'moved-up' order by seq`;
}

describe("moving a child up a year", { skip: reason ?? false }, () => {
    before(async () => {
        await truncate(db());
        const me = await startFamily(parent, outbox, {
            email: "move@example.test",
            name: "Naib",
            family: "Oakley",
        });
        made.family = me.family;
        made.maya = await addKid(parent, "Maya", 3);
        const other = new Browser(config);
        await startFamily(other, outbox, {
            email: "elsewhere@example.test",
            name: "Anna",
            family: "Harlow",
        });
        made.other = await addKid(other, "Theo", 3);
    });

    it("moves the row and appends the event from today, and the record reads the new grade", async () => {
        const up = await move(parent, made.maya, 4);
        assert.equal(up.status, 200, JSON.stringify(up.body));
        assert.equal(at(up.body, "kid", "grade"), 4);
        assert.equal(await gradeOf(made.maya), 4);
        const [event] = await moves(made.maya);
        const onDay = at(event?.data, "onDay");
        assert.match(String(onDay), /^\d{4}-\d{2}-\d{2}$/);
        assert.deepEqual(event?.data, { from: 3, grade: 4, onDay });
        assert.ok(event?.actor, "the parent who moved them is the actor");
        const record = await parent.call("GET", `/api/kids/${made.maya}/record`);
        assert.equal(record.status, 200);
        assert.equal(at(record.body, "kid", "grade"), 4);
    });

    it("moves back a grade for a move made too early, as the same kind of event", async () => {
        const back = await move(parent, made.maya, 3);
        assert.equal(back.status, 200, JSON.stringify(back.body));
        assert.equal(await gradeOf(made.maya), 3);
        assert.deepEqual(
            (await moves(made.maya)).map((m) => at(m.data, "grade")),
            [4, 3],
        );
    });

    it("refuses a grade that is not next to the child's, one not offered, or not a number", async () => {
        for (const grade of [5, 3, 0.5, "4", null]) {
            const r = await move(parent, made.maya, grade);
            assert.equal(r.status, 400, `grade ${JSON.stringify(grade)}`);
            assert.equal(at(r.body, "error"), "bad-request");
        }
        assert.equal((await move(parent, made.maya, 4)).status, 200);
        const past = await move(parent, made.maya, 5);
        assert.equal(past.status, 400, "grade five is not offered yet");
        assert.equal(await gradeOf(made.maya), 4);
        assert.equal((await moves(made.maya)).length, 3);
    });

    it("refuses a child of another family, someone signed out, and a grown-up who is not a parent", async () => {
        assert.equal((await move(parent, made.other, 4)).status, 404);
        assert.equal(await gradeOf(made.other), 3);
        assert.equal((await move(new Browser(config), made.maya, 3)).status, 401);

        const [tutor] = await db().raw<{ id: string }[]>`
            insert into users (name, email) values ('Kate', 'kate@example.test') returning id`;
        if (!tutor) throw new Error("no tutor");
        await db().raw`
            insert into members (family_id, user_id, kid_id, from_day, to_day)
            values (${made.family}, ${tutor.id}, ${made.maya}, '2020-01-01', '2099-12-31')`;
        const b = new Browser(config);
        await sessionInto(b, made.family, tutor.id);
        const r = await move(b, made.maya, 3);
        assert.equal(r.status, 403, JSON.stringify(r.body));
        assert.equal(await gradeOf(made.maya), 4);
    });
});
