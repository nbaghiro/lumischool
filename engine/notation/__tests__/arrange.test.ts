// Questions answered by arranging the drawing: the verifier's proof over every arrangement of the
// curriculum's items. The boards' own tests are engine/__tests__/arrange.test.ts, and the answer as it
// is recorded through the kid client's queue is engine/ui/__tests__/kid.test.ts's.
import assert from "node:assert/strict";
import { test } from "node:test";
import { judge, LUCK, plankBoard, plankOf, type Plank } from "../../arrange";
import { Workspace } from "../notation";
import { content } from "./helpers";

const all = content();
const ITEMS = Object.fromEntries(
    [
        "items/g1-level-the-plank.lumi",
        "items/physics-seesaw-place.lumi",
        "items/g2-fair-shares.lumi",
    ].map((p) => [p, all[p] ?? ""]),
);
const ws = new Workspace(ITEMS);
const issues = (w: Workspace): string[] =>
    [...w.files.values()].flatMap((f) => f.issues.map((i) => `${f.path} ${i.level}: ${i.message}`));
const plank = (v: Record<string, number | number[]>): Plank => {
    const p = plankOf(v);
    if (typeof p === "string") throw new Error(p);
    return p;
};

test("the arranged items in the curriculum prove clean: always answerable, luck bounded, and no rule on a right arrangement", () => {
    assert.deepEqual(issues(ws), []);
    for (const id of ["bonds.level-the-plank", "physics.seesaw-place", "fraction.fair-shares"]) {
        const r = ws.reports.get(id);
        assert.ok(r?.arranged, `${id} has no proof`);
        assert.ok(
            r.variants.length > 0 && r.variants.every((v) => v.arranged && v.arranged.right > 0),
            `${id}: a variant has no right arrangement`,
        );
        assert.ok(r.arranged.luck <= LUCK, `${id}: luck ${r.arranged.luck}`);
        assert.ok(
            r.arranged.spoken > 0.9,
            `${id}: its rules speak to ${r.arranged.spoken} of the wrong arrangements`,
        );
    }
});

const probe = (
    answer: string,
    feedback = "",
    say = `\n    say "Weights that come to {n} kilograms on step 3 on the right."`,
): string => `item probe.plank v=1 {
  title "Probe"
  let n=6..7

  scene 30x30 {
    balance-plank plank steps=3 load=n load-at=-3 bags=[1, 2, 3, n - 3] open=[3] at=canvas(1, 1)
  }

  answer plank=${answer} {${say}
  }
  feedback {${feedback}
  }
}
`;
const probeIssues = (src: string): string[] =>
    issues(new Workspace({ "items/probe.lumi": src })).map((i) =>
        i.replace("items/probe.lumi ", ""),
    );

test("the verifier refuses an arranged item that luck answers, that cannot be answered, or whose feedback fires on a right answer", () => {
    assert.deepEqual(
        probeIssues(
            probe(
                "(turning == 0)",
                `
    when (rightkg < n) point=plank.left {
      say "Too light."
    }`,
            ),
        ),
        [],
    );
    assert.match(
        probeIssues(probe("(turning <= 0)")).join("\n"),
        /error: \d+ of the \d+ arrangements a child can make are right, more than one in four/,
    );
    assert.match(
        probeIssues(probe("(turning == 100)")).join("\n"),
        /no arrangement a child can make is right/,
    );
    assert.match(
        probeIssues(
            probe(
                "(turning == 0)",
                `
    when (placed >= 1) point=plank {
      say "Placed."
    }`,
            ),
        ).join("\n"),
        /also true for a right arrangement/,
    );
    assert.match(probeIssues(probe("(turning == 0)", "", "")).join("\n"), /needs a say line/);
    assert.match(
        probeIssues(probe("(turning == 0)").replace("let n=6..7", "let n=6..7 placed=1..2")).join(
            "\n",
        ),
        /has the name of a measure/,
    );
});

test("judging an arrangement on the page gives the feedback rule that speaks to it", () => {
    const it = ws.items.get("bonds.level-the-plank");
    const r = ws.reports.get("bonds.level-the-plank");
    const v = r?.variants[0];
    const answer = it?.answers.find((a) => a.name === "plank")?.expr;
    assert.ok(it && v && answer && v.arranged);
    const node = it.scene?.nodes.find((n) => n.id === "plank");
    assert.ok(node);
    const n = Number(v.values.n);
    const b = plankBoard(
        plank({
            steps: 3,
            load: n,
            "load-at": -3,
            bags: [Number(v.values.a), 1, n - Number(v.values.a), 5],
            open: [3],
            most: 2,
        }),
    );
    assert.equal(judge(b, v.env, answer, it.feedback, v.arranged.key).right, true);
    const light = judge(b, v.env, answer, it.feedback, [{ piece: "bag(1)", at: 3 }]);
    assert.equal(light.right, false);
    assert.equal(light.rule?.point, "plank.left");
});
