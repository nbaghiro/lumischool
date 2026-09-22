# Notation against JSON

Status: assessment, September 2026. Reviewed after the art shelf and the lesson set grew, and updated in September 2026 with the decision below. It revisits the decision recorded in [notation.md](notation.md) with measurements rather than argument, and it answers a second question that comes up alongside it: how the art fits into the language, given that art is written in TypeScript and content is written in the notation.

## Summary

We keep the notation. The text syntax is the cheapest layer in the language module, about 11% of it, and swapping it for JSON would leave the other 89% untouched while costing us comments, unescaped prose, precise error positions and about 40% more characters per lesson.

The expensive part of the system is not the syntax, it is the vocabulary: a visual is currently declared in four or five places, and one of those declarations (its size) is copy-pasted between the drawing and the layout. That cost is identical under JSON, which is the clearest evidence that the surface format is not what makes the system large.

## What we measured

Line counts in `scratchpad/src/lang`, which is the whole language implementation:

| Part | Lines | Survives a move to JSON |
|---|---|---|
| `syntax.ts` (parser 240, canonical formatter 68) | 309 | No |
| `expr.ts` (exact rational arithmetic, ranges, sets, conditions) | 477 | Yes |
| `registry.ts` (the vocabulary: types, settings, anchors, boxes, capacities) | 334 | Yes |
| `verify.ts` (variant enumeration and proof) | 269 | Yes |
| `scene-render.ts` | 242 | Yes |
| `check.ts` (validation against the registry, typed documents) | 238 | Yes |
| `lesson-render.ts`, `instantiate.ts`, `layout.ts`, `workspace.ts`, and the rest | 912 | Yes |
| Total | 2,781 | 2,472 |

Content size, comparing the notation with a hand-tuned JSON schema (not the generic parse tree, which is 13.8 times the lines and is what a naive port produces):

| File | Notation | Tuned JSON |
|---|---|---|
| `items/make-ten.lumi` | 16 lines, 368 characters | 23 lines, 583 characters |
| `lessons/making-ten.lumi` | 33 lines, 899 characters | 39 lines, 1,490 characters |

Across all 48 content files we have 1,033 lines and 31 KB of notation, including 50 triple-quoted prose blocks in 14 files and 6 comments. Every one of those prose blocks becomes an escaped string with `\n` in JSON, and the comments have nowhere to live unless we adopt JSONC.

One property we can now check rather than assert: the parser contains no vocabulary at all. There are 36 scene node types in the registry and none of them appear in `syntax.ts`. The three types added in September (`placevalue`, `array`, `dice`) required no grammar change.

## How content is read today

The pipeline is the same for every file:

1. `parse()` reads text into a generic tree of nodes, where every value is one of eight term kinds: number, word, string, text block, expression, size, list, setting.
2. `checkDoc()` validates that tree against the registry and builds typed documents (`Item`, `Lesson`, `Define`). Problems are collected with line and column, not thrown, so one mistake does not hide the next.
3. `Workspace` links files to each other, then `verifyItem()` enumerates every variant, or a seeded sample of 400 above 10,000, and proves the answer, the capacities and the scene fit.
4. `instantiate()` binds one variant, `layout()` resolves placements into boxes of squares, and the renderers draw to screen or to a sheet.

Art enters this pipeline by name, not by description. There are three ways in:

- A visual written in TypeScript (`defineVisual` with `box(p)` and `draw(c, p)` in `src/art/`), named by a registry entry, so a scene can write `tenframe frame count=n color=berry`.
- A component written in the notation itself (`define` in `content/components/`), placed with `use`.
- A hand-drawn file in `art/svg`, `art/excalidraw` or `art/strokes`, whose size and anchors are read without a DOM by `src/lang/assets.ts` so the verifier can check fit before anything is drawn, and placed with `art pic asset="sun"`.

The notation never describes a drawing. It names one and passes it settings, and the registry entry is what says which settings exist and which anchors a note, a tick or an arrow can attach to.

## The same work, done both ways

### Flow 1: an author writes a question

With the notation, the author creates one file and writes what a child will see:

```
item bonds.make-ten v=1 skills=[bonds-to-10] {
  title "Make ten"
  let n=1..9

  scene 26x8 {
    tenframe frame count=n color=berry at=canvas(1, 1)
    equation eq "{n} + {?more} = 10" right-of=frame gap=1
  }

  answer more=(10 - n)
  feedback {
    when (more == n) point=frame {
      say "That is how many are in the frame. Count the empty squares."
    }
  }
}
```

With JSON and a schema, the same item is:

```json
{
  "kind": "item",
  "id": "bonds.make-ten",
  "v": 1,
  "skills": ["bonds-to-10"],
  "title": "Make ten",
  "params": { "n": "1..9" },
  "scene": {
    "size": [26, 8],
    "nodes": [
      { "type": "tenframe", "id": "frame", "count": "n", "color": "berry", "at": [1, 1] },
      { "type": "equation", "id": "eq", "text": "{n} + {?more} = 10", "rightOf": "frame", "gap": 1 }
    ]
  },
  "answer": { "more": "10 - n" },
  "feedback": [
    {
      "when": "more == n",
      "point": "frame",
      "say": "That is how many are in the frame. Count the empty squares."
    }
  ]
}
```

Both express the same thing, and both put the expressions in strings (`"1..9"`, `"10 - n"`), so both need the expression language. The differences are that the JSON author gets schema autocomplete in an editor today, and the notation author writes 37% fewer characters, one node per line, with the range, the size `26x8`, the list and the blank `{?more}` written as values rather than as strings inside strings.

### Flow 2: the checker rejects it, and the author fixes it

This is where the surface format matters most, because it decides what an error can point at. These are real messages from the current checker, produced by mutating this item:

```
tenfrme frame          -> error line 6 col 5: unknown node type "tenfrme" (did you mean "tenframe"?)
colour=berry           -> error line 6 col 28: "tenframe" has no setting "colour" (did you mean "color"?)
point=frame.cel(3)     -> error line 12 col 5: point: "tenframe" has no anchor "cel(3)";
                          it has cell(0), cell(1), cell(2), cell(3), cell(4), cell(5), cell(6), cell(7)
answer more=(10 - m)   -> error line 10 col 3: answer more: unknown name "m" (did you mean "n"?)
scene 14x8             -> error line 5 col 3: eq does not fit the 14x8 scene (n = 1; n = 2; n = 3; and 6 more)
right-of=fram          -> error line 7 col 5: placement: there is no node "fram" in the scene
```

Every one of these is a semantic error, not a syntax error, so JSON would produce the same message. What JSON changes is the coordinate. `JSON.parse` reports a character offset for malformed JSON only, and a schema validator reports a JSON Pointer such as `/scene/nodes/1/count`. To say "line 6, column 28" over JSON we would have to parse with a position-keeping reader (jsonc-parser or an equivalent, roughly 150 lines or one dependency) and map every pointer back to a span. That machinery is free in the notation because the parser already records spans for every term.

The practical difference shows up in the editor on `lang.html`, where an error underlines the exact characters, and in the repair loop below.

### Flow 3: a model writes a unit

We expect most content to be drafted by a model against the registry, then repaired until it passes, which is the loop LlamaTrade uses for its strategy language. The loop is the same either way: generate, parse, check, verify, feed the errors back, repeat.

Two things differ. The model writes about 40% fewer characters per lesson in the notation, which matters once we are generating hundreds of lessons rather than fifteen. And the errors it gets back carry line and column for free, which is the form models repair from most reliably, rather than a pointer path it has to resolve against a nested document.

Against that, JSON has a real advantage here: a JSON Schema can be handed to a model as a tool schema, and some model APIs can constrain generation to it, so malformed output becomes impossible rather than merely detected. We do not use constrained generation today, and it would only remove the syntax class of errors, which is the class the checker already catches in one round.

### Flow 4: a reviewer reads the change

Changing the practice block of a lesson from one item to two is this diff in the notation:

```
   do {
-    practice bonds.make-ten count=4 seed=3
+    practice bonds.make-ten count=2 seed=3
+    practice bonds.missing-part count=2 seed=5
   }
```

and this diff in JSON:

```
     { "type": "do", "blocks": [
-      { "type": "practice", "item": "bonds.make-ten", "count": 4, "seed": 3 }
+      { "type": "practice", "item": "bonds.make-ten", "count": 2, "seed": 3 },
+      { "type": "practice", "item": "bonds.missing-part", "count": 2, "seed": 5 }
     ] },
```

Both are readable. The notation diff is shorter and has no trailing-comma noise, and a reviewer who knows the vocabulary can read it without knowing the file. This is a small advantage repeated on every review.

### Flow 5: the studio saves an edit made in a form

A studio edits the typed tree, not the text, so on save it has to write a file back. In the notation this goes through `format()`, which produces one canonical layout (two-space indents, single spaces, canonical values) and keeps comments and blank-line grouping. Two tests hold that guarantee: every content file is already in canonical form, and formatting is idempotent. The result is that a change made in a form is a small diff rather than a reflow of the whole file.

In JSON the equivalent is `JSON.stringify` with a pinned key order and indent, which is easier to write but drops comments unless we move to JSONC and keep a comment-preserving reader. Neither is hard. The notation needs the formatter, JSON needs the discipline.

### Flow 6: adding a new visual to the vocabulary

This is the flow that decides the question, because it is the expensive one and it is identical in both worlds. Adding `placevalue` (tens and ones rods) in September touched five places:

1. `src/art/structures.ts`: the drawing, with `box(p)` and `draw(c, p)`.
2. `src/lang/registry.ts`: the `SCENE_TYPES` list and a registry entry with settings and anchors.
3. `src/lang/layout.ts`: a `sizeOf` case.
4. `src/lang/scene-render.ts`: a case mapping node values to the visual's parameters.
5. `src/art/catalog.ts`: the takes shown on the art shelf.

Under JSON, steps 1, 3, 4 and 5 are unchanged and step 2 becomes a schema entry instead of a registry entry. The cost is the same. What makes this flow expensive is that the visual's size is now written twice, identically, at `src/art/structures.ts:221` and `src/lang/layout.ts:53`, and fixed boxes are written twice as well (`structures.ts:61` and `registry.ts:142`). Imported art has the same problem by design: `assets.ts` computes a box from the file text for the verifier, and the importers in `core/` compute it again while drawing, with a comment asking the two to agree. There is also a fourth vocabulary in `src/space/journey.ts`, the `Sketch` union, which redescribes ten of the same visuals so the map can draw stand-ins for unwritten lessons.

### Flow 7: storing and serving content

The notation string is what we store, with fields recomputed from it on each write for querying (skills, visual types, parameter ranges), and a hash of the canonical text to refer to an item from a replay. In memory the typed tree is authoritative, and any JSON we produce is derived for an outside consumer.

With JSON as the source, the stored blob is the JSON and the derived fields are the same. The difference is only what a human sees when they open the row in a database client.

## What JSON would genuinely buy

We should be fair about the three things we give up by not using it.

Editor tooling comes free. A JSON Schema gives autocomplete, hover documentation and inline validation in VS Code with no work from us, while the notation needs a grammar file for highlighting and a language server for anything more. We can generate a JSON Schema from the registry for the studio's forms, but that does not help someone editing files by hand.

Every language has a parser. If a partner, an export pipeline or a future service in another language needs to read content, JSON is readable everywhere, and the notation needs our parser or a port of it. This is a real constraint if we ever run content through non-TypeScript tooling.

Constrained generation. Some model APIs can force output to match a JSON Schema, which removes malformed output as a class.

## Decision

Reviewed and settled in September 2026: the notation stays the source of truth for the core. The argument that would have changed it, that content may need to be read outside our TypeScript, does not apply to how this product is meant to be authored. Authoring will be a purpose-built interface over the notation, usable by a parent, or generation by AI, both inside our own systems. Nobody is expected to hand-edit content files as the normal path, and no outside consumer is planned, so the ecosystem argument for JSON has no weight here, while the properties the notation gives us (prose without escaping, precise error positions for the repair loop, small reviewable diffs) all still hold.

This remains reversible at roughly a day of work, as described above, if either of those assumptions changes.

## Verdict

The notation is not overkill for this system. It costs 309 lines plus 77 lines of tests, it has held its main promise (36 node types and no grammar change to add any of them), and it fits content that is mostly prose and pictures rather than deeply nested data. JSON would remove a parser we have already written and paid for, and would add escaping, a position-mapping layer and about 40% more text in the files we read most often.

The decision would change if content stopped being hand-written and reviewed. If every item came out of a studio GUI and nobody opened a file, the text surface would be earning much less, and JSON plus a schema would be the simpler choice.

## What to fix instead

The work worth doing is in the vocabulary, not the syntax.

Let the visual be the single declaration. `defineVisual` should carry its scene settings and anchors alongside its box and draw function, and the registry's scene entries should be built from the art catalogue at load, so adding a visual is one file plus one catalog line instead of five edits.

Delete `sizeOf` in `layout.ts` and call the visual's own `box()` with the concrete values. The visual's box function is pure and needs no DOM, so this removes the copied formulas and the drift they invite.

Replace the journey's `Sketch` union with a one-node scene in the notation, since a stand-in picture is exactly that, and it would remove the fourth description of the same ten visuals.

For imported art, keep the two readers but test them against each other: one test that loads every file in `art/` through both paths and asserts the boxes agree.
