// The coding checkers over a flowchart, a world with sensors and a question about test cases, each
// proved by running the program the scene draws.
import assert from "node:assert/strict";
import { test } from "node:test";
import { Workspace } from "../notation";

const probe = (body: string): { issues: string[]; answers: Record<string, string>[] } => {
    const ws = new Workspace({
        "items/probe.lumi": `item probe.one v=1 skills=[coding.tracing] {\n  title "Probe"\n${body}}\n`,
    });
    const report = ws.reports.get("probe.one");
    return {
        issues: (report?.issues ?? []).map((i) => `${i.level}: ${i.message}`),
        answers: (report?.variants ?? []).map((v) => v.answers),
    };
};
const errors = (r: { issues: string[] }): string[] => r.issues.filter((m) => m.startsWith("error"));

const THERMOSTAT = `["repeat 20", "  if temp is less than 18", "    switch heater on", "  if temp is more than 21", "    switch heater off", "  wait 1"]`;

test("a flowchart runs as its program does, and blank asks for the missing shape", () => {
    const r = probe(`  let a=2..3
  scene 60x60 {
    flowchart f code=["set n to 1", "repeat {a}", "  double n", "say n"] blank=3 at=canvas(1, 0)
    number-input n right-of=f gap=1
    choice pick options=["double n", "add 1 to n", "say n"] below=n gap=1
  }
  check coding.runs of=f n="value(n)" pick=blank
`);
    assert.deepEqual(errors(r), []);
    assert.deepEqual(r.answers, [
        { n: "4", pick: "double n" },
        { n: "8", pick: "double n" },
    ]);
});

test("a flowchart beside a listing has to draw the listing's program", () => {
    const r = probe(`  scene 40x30 {
    program p code=["right 2", "down 1"] at=canvas(1, 0)
    flowchart f code=["right 2", "down 2"] right-of=p gap=1
    number-input col below=p gap=1
  }
  check coding.runs of=p col=col
`);
    assert.ok(
        r.issues.some((m) => m.includes("f is a flowchart of a different program from p's")),
        r.issues.join(" | "),
    );
});

test("coding.runs reads a sensor: the value after some minutes, a band, and how often it switched", () => {
    const r = probe(`  scene 60x40 {
    program p code=${THERMOSTAT} sense=["temp starts 15 changes -1 heater 2"] at=canvas(1, 0)
    number-input temp right-of=p gap=1
    number-input times below=temp gap=1
    choice stays options=["yes", "no"] below=times gap=1
  }
  check coding.runs of=p temp="minute(7).temp" times="switched(heater, on)" stays="stays(temp, 17, 22)"
`);
    assert.deepEqual(errors(r), []);
    assert.deepEqual(r.answers, [{ temp: "22", times: "2", stays: "yes" }]);
    const bad = probe(`  scene 60x40 {
    program p code=["wait 1"] sense=["temp starts warm"] at=canvas(1, 0)
    number-input temp right-of=p gap=1
  }
  check coding.runs of=p temp="value(temp)"
`);
    assert.ok(
        bad.issues.some((m) => m.includes("whole number")),
        bad.issues.join(" | "),
    );
});

test("coding.tests proves which inputs catch a planted bug, and the fewest that take every way", () => {
    const scene = (
        ask: string,
        options = `["5 and 13", "11 and 12", "3 and 20"]`,
    ): string => `  scene 60x40 {
    program p code=["if age is less than 12", "  say child", "otherwise", "  say adult"] at=canvas(1, 0)
    choice pick options=${options} below=p gap=1
    number-input n right-of=p gap=1
  }
  check coding.tests of=p input=age bug="1: if age is less than 11" try=0..20 ${ask}
`;
    const caught = probe(scene(`pick=catches n=catching`));
    assert.deepEqual(errors(caught), []);
    assert.deepEqual(caught.answers, [{ pick: "11 and 12", n: "1" }]);
    const smallest = probe(scene(`n=smallest`));
    assert.deepEqual(smallest.answers, [{ n: "11" }]);
    const fewest = probe(scene(`n=fewest`));
    assert.deepEqual(fewest.answers, [{ n: "2" }], "one child and one adult");
    const covers = probe(scene(`pick=covers`, `["5 and 11", "3 and 20", "12 and 20"]`));
    assert.deepEqual(covers.answers, [{ pick: "3 and 20" }]);
    // two options catch it, so the question has two answers
    const two = probe(scene(`pick=catches`, `["11 and 3", "11 and 12", "3 and 20"]`));
    assert.ok(
        two.issues.some((m) => m.includes("more than one answer")),
        two.issues.join(" | "),
    );
});

test("coding.tests finds the fewest over a hundred inputs without trying every set of them", () => {
    const r = probe(`  scene 60x40 {
    program p code=["if oxygen is less than 60", "  if oxygen is less than 30", "    if oxygen is less than 10", "      say alarm", "    otherwise", "      say danger", "  otherwise", "    say low", "otherwise", "  say fine"] at=canvas(1, 0)
    number-input n right-of=p gap=1
  }
  check coding.tests of=p input=oxygen try=0..1000 n=fewest
`);
    assert.deepEqual(errors(r), []);
    assert.deepEqual(r.answers, [{ n: "4" }], "three deep needs four");
    const missed = probe(`  scene 60x40 {
    program p code=["if oxygen is less than 60", "  say low", "otherwise", "  say fine"] at=canvas(1, 0)
    number-input n right-of=p gap=1
  }
  check coding.tests of=p input=oxygen try=0..50 n=fewest
`);
    assert.ok(
        missed.issues.some((m) => m.includes("take every if both ways")),
        missed.issues.join(" | "),
    );
});
