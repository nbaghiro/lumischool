import assert from "node:assert/strict";
import test from "node:test";
import { Workspace } from "../notation";

const item = (id: string, body: string): Record<string, string> => ({
    [`items/${id}.lumi`]: `item nature.${id} v=1 skills=[nature.cells] {\n  title "Test"\n${body}\n}\n`,
});

const issuesOf = (ws: Workspace): string[] =>
    [...ws.files.values()].flatMap((f) => f.issues.map((i) => `${i.level}: ${i.message}`));

const CELLS = item(
    "cells-sample",
    `  let kind={0, 2} mag={100, 400}

  scene 34x30 {
    microview m kind=kind mag=mag scale=0 field=1 at=canvas(1, 1)
    number-input answer below=m gap=1
  }

  check nature.cells of=m answer=size`,
);

test("nature.cells works a cell's length out from the field and the cells across it", () => {
    const ws = new Workspace(CELLS);
    assert.deepEqual(issuesOf(ws), []);
    const got = ws.reports.get("nature.cells-sample")?.variants.map((v) => v.answers.answer);
    // onion skin is drawn 225 µm long at 100 and 400; pondweed 90 µm, drawn at 400 for 100
    assert.deepEqual(got, ["225", "225", "90", "90"]);
});

test("nature.cells counts the cells across at another magnification, and refuses a count that is not whole", () => {
    const at = (spec: string, kind = 0): string[] =>
        issuesOf(
            new Workspace(
                item(
                    "cells-at",
                    `  scene 34x30 {
    microview m kind=${kind} mag=100 scale=0 field=1 at=canvas(1, 1)
    number-input answer below=m gap=1
  }

  check nature.cells of=m answer="${spec}"`,
                ),
            ),
        );
    assert.deepEqual(at("across(400)"), []);
    assert.ok(at("across(1000)", 1).some((i) => i.includes("not a whole number")));
    assert.ok(at("across(300)").some((i) => i.includes("magnification of 40, 100, 400 or 1000")));
});

test("nature.seeds reads the dishes by the rule they are drawn by", () => {
    const ws = new Workspace(
        item(
            "seeds-sample",
            `  scene 34x30 {
    seedtest s mode=0 water=[1, 0, 1, 1] air=[1, 1, 0, 1] warmth=[1, 1, 1, 1] light=[1, 1, 1, 0] seeds=10 rate=80 after=1 at=canvas(1, 1)
    choice pick options=["water", "air", "warmth", "light"] below=s gap=1
    number-input answer below=pick gap=1
  }

  check nature.seeds of=s pick="differ(A D)" answer="sprouted(D)"`,
        ),
    );
    assert.deepEqual(issuesOf(ws), []);
    assert.deepEqual(ws.reports.get("nature.seeds-sample")?.variants[0]?.answers, {
        pick: "light",
        answer: "8",
    });
});

test("nature.seeds refuses two dishes that differ in more than one thing", () => {
    const ws = new Workspace(
        item(
            "seeds-unfair",
            `  scene 34x30 {
    seedtest s mode=0 water=[1, 0] air=[1, 1] warmth=[1, 0] light=[1, 1] seeds=8 rate=100 after=0 at=canvas(1, 1)
    choice pick options=["water", "air", "warmth", "light"] below=s gap=1
  }

  check nature.seeds of=s pick="differ(A B)"`,
        ),
    );
    assert.ok(issuesOf(ws).some((i) => i.includes("differ in water and warmth")));
});
