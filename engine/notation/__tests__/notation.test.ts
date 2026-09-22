import assert from "node:assert/strict";
import { test } from "node:test";
import { checkDoc, format, parse, shape } from "../notation";
import { content } from "./helpers";

const files = content();
const canon = (s: string): string => format(parse(s).doc);

test("every content file is already in canonical form: text → tree → text is unchanged", () => {
    assert.ok(Object.keys(files).length >= 15);
    for (const [path, src] of Object.entries(files)) {
        const r = parse(src);
        assert.deepEqual(r.errors, [], path);
        assert.equal(format(r.doc), src, path);
    }
});

test("tree → text → tree gives the same tree", () => {
    for (const [path, src] of Object.entries(files)) {
        const doc = parse(src).doc;
        assert.deepEqual(shape(parse(format(doc)).doc), shape(doc), path);
    }
});

const messy = `item   balance.chain   v=1    skills=[ multiplication.scaling ] {
      title    "Balance chain"
   let a=(2 .. 3)   b=2..4
  where (a*b!=a+b)     #  2 and 2 would hide the adding mistake
  roles heavy=cube mid=ball light=star
  scene 32x16 {
     use chain-scene heavy=heavy mid=mid light=light a=a b=b
     text ask "How many {light.many} balance 1 {heavy}?" narrate below=s1 gap=1
     number-input answer right-of=ask gap=1
  }
  answer (a*b)
}
`;
test("the formatter normalises hand-written text and is idempotent", () => {
    const once = canon(messy);
    assert.equal(canon(once), once);
    assert.match(once, /^item balance\.chain v=1 skills=\[multiplication\.scaling\] \{$/m);
    assert.match(once, /^  let a=2\.\.3 b=2\.\.4$/m);
    assert.match(once, /^  where \(a \* b != a \+ b\)  # 2 and 2 would hide the adding mistake$/m);
    assert.match(once, /^  answer \(a \* b\)$/m);
});

test("values are read into kinds, and only spaced expressions get parentheses", () => {
    const n = parse(
        `n x 32x16 007 0.50 -3 s2.right-pan frame.cell(9) ? [a, mid * 2] canvas(1,1) 2..4 a*b (n) k=(1 + 2)\n`,
    ).doc.nodes[0];
    assert.ok(n);
    const kinds = n.parts.map((p) => (p.k === "prop" ? `prop:${p.value.k}` : p.k));
    assert.deepEqual(kinds, [
        "word",
        "size",
        "num",
        "num",
        "num",
        "word",
        "word",
        "word",
        "list",
        "expr",
        "expr",
        "expr",
        "word",
        "prop:expr",
    ]);
    assert.equal(
        canon(
            `n x 32x16 007 0.50 -3 s2.right-pan frame.cell(9) ? [a, mid*2] canvas(1,1) 2..4 a*b (n) k=(1+2)\n`,
        ),
        "n x 32x16 7 0.50 -3 s2.right-pan frame.cell(9) ? [a, mid * 2] canvas(1, 1) 2..4 (a * b) n k=(1 + 2)\n",
    );
});

test("comments survive: above a node, at the end of a line, before a closing brace, at the end of the file", () => {
    const src = `# above\nlesson x v=1 format=teach {  # opener\n  title "T"  # trailing\n  # before close\n}\n# tail\n`;
    assert.equal(canon(src), src);
});

test("text blocks are dedented on reading and re-indented on writing", () => {
    const src = `lesson x v=1 format=teach {\n  grown-ups """\n    First line.\n      Indented line.\n\n    After a blank.\n    """\n}\n`;
    const doc = parse(src).doc;
    const block = doc.nodes[0]?.children?.[0]?.parts[0];
    assert.ok(block && block.k === "block");
    assert.equal(block.v, "First line.\n  Indented line.\n\nAfter a blank.");
    assert.equal(format(doc), src);
});

test("errors point at the line and column, and parsing continues after them", () => {
    const r = parse(
        `item x v=1 {\n  let a=2..3 b=(1 +\n  scene 3x {\n    balance s1\n  }\n  answer (a +)\n`,
    );
    assert.deepEqual(
        r.errors.map((e) => `${e.line}:${e.col} ${e.message.split(":")[0]}`),
        [
            "2:14 a bracket is not closed",
            '3:10 cannot read "3x"',
            '6:14 cannot read "(a +)"',
            '1:1 "item" is missing its closing "}"',
        ],
    );
    assert.equal(parse("}\n").errors[0]?.message, 'unexpected "}"');
});

const issues = (src: string): string[] => {
    const r = parse(src);
    assert.deepEqual(
        r.errors.map((e) => e.message),
        [],
    );
    return checkDoc(r.doc).issues.map((i) => `${i.line}:${i.col} ${i.message}`);
};

test("unknown node types and settings get a suggestion", () => {
    assert.deepEqual(
        issues(
            `item x v=1 {\n  scene 10x10 {\n    balanse s1 at=canvas(1, 1)\n    tenframe f cont=3 at=canvas(1, 1)\n  }\n}\n`,
        ),
        [
            '3:5 unknown node type "balanse" (did you mean "balance"?)',
            '4:16 "tenframe" has no setting "cont" (did you mean "count"?)',
            '4:5 "tenframe" needs count=',
        ],
    );
});

test("a node must be allowed where it is written", () => {
    assert.deepEqual(issues(`item x v=1 {\n  say "hello"\n}\n`), [
        '2:3 "say" cannot go inside "item"; it takes title, difficulty, set, let, where, roles, scene, answer, check, feedback, hint, level',
    ]);
});

test("values must have the kind the vocabulary asks for", () => {
    assert.deepEqual(
        issues(
            `item x v=1 {\n  let a=1..9 b=a-b\n  scene 10x10 {\n    tenframe f count=a-b at=canvas(1, 1)\n  }\n}\n`,
        ),
        [
            '2:16 let b: "a-b" is not an expression; write a subtraction with spaces inside parentheses, (a - b)',
            '4:22 tenframe count: "a-b" is not an expression; write a subtraction with spaces inside parentheses, (a - b)',
        ],
    );
    assert.deepEqual(issues(`lesson x v=1 format=teech {\n}\n`), [
        '1:21 lesson format: "teech" is not one of teach, puzzles, worked, review (did you mean "teach"?)',
    ]);
    assert.deepEqual(issues(`lesson x v=1 {\n}\n`), ['1:1 "lesson" needs format=']);
});

test("flags are words the type lists; anything else is reported", () => {
    assert.deepEqual(
        issues(
            `define d {\n  text t "hi" narrate at=canvas(0, 0)\n  text u "hi" loud at=canvas(0, 2)\n}\n`,
        ),
        ['3:15 "text" does not take this value; its flags are narrate'],
    );
});
