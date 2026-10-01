import assert from "node:assert/strict";
import test from "node:test";
import { EVENTS } from "../chronicle";
import { centuryName, centuryOf, yearsBetween } from "../history";
import { Workspace } from "../notation";

const item = (id: string, body: string): Record<string, string> => ({
    [`items/${id}.lumi`]: `item history.${id} v=1 skills=[history.order] {\n  title "Test"\n${body}\n}\n`,
});

const issuesOf = (ws: Workspace): string[] =>
    [...ws.files.values()].flatMap((f) => f.issues.map((i) => `${i.level}: ${i.message}`));

test("years are counted across year one with no year nought, and centuries on either side of it", () => {
    assert.equal(yearsBetween(1666, 1903), 237);
    assert.equal(yearsBetween(-44, 14), 57);
    assert.equal(yearsBetween(-1, 1), 1);
    assert.equal(centuryOf(1666), 17);
    assert.equal(centuryOf(1900), 19);
    assert.equal(centuryOf(1901), 20);
    assert.equal(centuryOf(-500), 5);
    assert.equal(centuryName(-221), "3rd century BC");
    assert.equal(centuryName(2011), "21st century");
});

test("every name in the record belongs to one entry, and every span runs forwards", () => {
    const seen = new Set<string>();
    for (const e of EVENTS) {
        assert.ok(e.names.length > 0);
        assert.ok(e.year !== 0 && e.to !== 0, `${e.names[0]} is dated in year nought`);
        assert.ok((e.to ?? e.year) >= e.year, `${e.names[0]} ends before it starts`);
        for (const n of e.names) {
            assert.ok(!seen.has(n), `${n} names two entries`);
            seen.add(n);
        }
    }
});

test("history.dates orders a sequence from the record, and refuses an event it does not hold", () => {
    const ws = new Workspace(
        item(
            "dates-sample",
            `  scene 36x10 {
    sequence s items=["teddy bear", "spinning top", "puzzle cube"] blanks=[a, b, c] at=canvas(1, 1)
  }

  check history.dates of=s a="rank(0)" b="rank(1)" c="rank(2)"`,
        ),
    );
    assert.deepEqual(issuesOf(ws), []);
    assert.deepEqual(ws.reports.get("history.dates-sample")?.variants[0]?.answers, {
        a: "2",
        b: "1",
        c: "3",
    });
    const bad = new Workspace(
        item(
            "dates-bad",
            `  scene 36x10 {
    sequence s items=["teddy bear", "a dragon"] blanks=[a, b] at=canvas(1, 1)
  }

  check history.dates of=s a="rank(0)" b="rank(1)"`,
        ),
    );
    assert.ok(issuesOf(bad).some((i) => i.includes("not in the dated record")));
});

test("history.dates refuses a timeline that draws a year the record does not give", () => {
    const ws = new Workspace(
        item(
            "timeline-wrong",
            `  scene 30x12 {
    timeline line from=1880 to=1920 step=10 years=[1890, 1903] labels=["Bicycle", "First flight"] at=canvas(1, 1)
    number-input answer below=line gap=1
  }

  check history.dates of=line answer="between(0 1)"`,
        ),
    );
    assert.ok(issuesOf(ws).some((i) => i.includes("the record gives 1885")));
});

test("history.street finds the one thing too new for the year on the sign", () => {
    const ws = new Workspace(
        item(
            "street-sample",
            `  let k=0..1
  scene 36x22 {
    thenandnow street year=pick(k, 1850, 1950) sign=1 things=["horse and cart", "{pick(k, \\"motor car\\", \\"mobile phone\\")}"] at=canvas(1, 1)
    choice pick options=["horse and cart", "motor car", "mobile phone"] below=street gap=1
  }

  check history.street of=street pick=could-not`,
        ),
    );
    assert.deepEqual(issuesOf(ws), []);
    assert.deepEqual(
        ws.reports.get("history.street-sample")?.variants.map((v) => v.answers.pick),
        ["motor car", "mobile phone"],
    );
});
