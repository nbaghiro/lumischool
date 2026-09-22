# Product

Status: the north star, September 2026. This is what we are building towards and what we will not build. It sets the target that [structure.md](structure.md) is organised to serve, and it is deliberately longer-lived than either: the modules can be rearranged, this should not need to be.

## What this is

A family can teach a full year of maths without preparing anything. The child opens a page drawn for what they are learning today, works through it on the screen or on paper, and the parent gets the same page with the answers, a short read on what is sticking, and what to do tomorrow. Behind that, every question is generated from a small set of drawn objects and proved correct before a child ever sees it, so the catalogue can grow without a person checking each one. Because the page is laid out in millimetres on squared paper, what is on the screen is what comes out of the printer, and because the drawing is separate from the maths, the same machinery carries any subject that can be drawn: reading, logic, and later science.

## Who it is for

The first family is a parent teaching one or two children at home, roughly ages five to ten, who has decided to teach maths properly and does not want to assemble it from worksheets. They are not a maths teacher. They have a printer. They want to know that what the child did today was right, that it was the right thing to do today, and what to do next.

The child is the second user, not the first. They should be able to open the page and work without being read to, which is a constraint on reading load rather than on mathematical content, and they should be able to do it with a pencil as happily as with a screen.

Tutors come later, and schools or co-ops later still, and neither should change the shape of the product. A tutor is a second grown-up attached to a child, not a different system.

## The bet

Three decisions compound, and the product is the compound rather than any one of them.

A question is a scene: named drawn objects placed on a grid of squares, with anchors that notes, arrows and marks attach to. This means a question is data rather than a drawing, so it can be re-rendered at any size, on paper, as a card on a map, or described aloud, and it can be changed by changing a number rather than by redrawing.

Content is written in one small text notation, and that text is the source of truth. A question declares its parameters and their ranges, so one question is hundreds of versions, and a lesson is a short file that names the questions it wants.

Every version is proved before it ships. The verifier evaluates the answer for each version, checks that the drawing fits and that the props fit the pans, and rejects feedback that would also fire on a correct answer. A question that cannot be proved does not reach a child. This is what makes generation safe: an AI can write a hundred questions and the verifier decides which of them exist.

Take any one away and the others are worth much less. Scenes without verification give us pretty pages we cannot trust at volume. Verification without a scene model gives us correct arithmetic that we cannot draw. The notation without either is a file format.

## A day, and a week

For the child, a day is one lesson: a page that opens where they left off, a few questions of the kind they met yesterday, one that is new, and one that is harder than it needs to be. They answer on the screen, or the parent prints the sheet and they answer with a pencil. When they get something wrong, the guide says the specific thing that is wrong with that mistake, and points at the part of the picture where it went wrong, rather than saying "try again".

For the parent, a week is: see where the child is on the map, print Monday to Friday in one go, keep the grown-ups sheet with the answers and the hints, and on Friday read a short account of what is secure, what is growing and what needs another go. Nothing to plan, nothing to mark unless they want to, and no daily decision to get wrong.

## What this is not

Not a game with points and streaks that a child works for instead of working for the maths. Rewards exist, they are small, and they never gate the next lesson.

Not a video platform. Explanation is a page and a picture, and where a voice helps it reads what is already on the page.

Not an LMS. We do not model classes, rosters or assignments until schools are a real customer, and even then the family stays the unit.

Not adaptive in the sense of a hidden algorithm choosing what a child sees. The year is visible, the parent can move it, and the scheduler's decisions are explainable in one sentence.

Not advertising supported, and not a data business. See Trust.

## Beyond maths

Maths first, because it is where the scene model pays immediately and where families feel the most pain. The test of whether the platform is general is whether a second subject costs a new part and a lesson file rather than a new system.

Reading and logic are already in the content set and use the same scene, the same answers and the same printed sheet. Science should be next, because a labelled diagram, a sorted set and a simple measurement are all scenes. Where a subject needs something the core does not have, and sound is the obvious example, that is a core capability we add once rather than a second product.

We tested this in September 2026 rather than assuming it. Eight subjects went in through the type registry alone, with nothing changed in the syntax, the checker, the expression language, instantiation or the verifier: reading comprehension, phonics, grammar, logic, forces and picture vocabulary needed no addition at all, and spelling, ordering, matching, diagram labelling, rhythm, handwriting, program tracing and map references each needed one new drawn part. What did not generalise is the answer. A question's answer must be a number unless its node offers options, so a life cycle became four numbered boxes and a spelling became a one item multiple choice. The next piece of core work is the answer model, not the picture, and the same conclusion came independently out of the grade 4 study.

We should keep one rule while we expand: a subject is only in when its questions can be proved. Where an answer is a judgement rather than a fact, a child writing a sentence, we can still present and collect it, but we should be honest that the grown-up is the marker, and say so on the page.

## How content gets made

An author or a model writes the notation, runs it through the checker and the verifier, and repairs it from errors that carry a line and a column. The verifier is the gate, not a review queue, so the cost of a wrong question is caught in seconds rather than in a child's week.

This is why the notation stays the source of truth and why the studio, when it exists, edits the same text through forms. A parent who wants to change one number in a question is editing the same file a model wrote, and both go through the same gate. See [notation.md](notation.md) and [notation-vs-json.md](notation-vs-json.md).

## Paper is an output, not an afterthought

One square is five millimetres on paper, and everything is placed in whole squares. A ruler drawn in a lesson is life size when printed, so a child can lay a real pencil on the page. Answers, hints and the notes written for the grown-up never appear on the child's sheet; they print on a separate one.

This matters more than it looks. It is the reason a family can use the product on a day when the tablet is flat, it is the reason a parent can sit with a child over a page rather than over a screen, and it is a constraint that keeps the drawing honest, because anything that only works with colour, animation or hover has to be redesigned until it works in ink.

## Progress

A year is a path of lessons through units, with prerequisites that open the next one and side paths that do not block anything. The whole year is visible from the start, including what is locked, because a family deciding whether to buy wants to see where it goes.

Behind the path is a skill graph. A lesson teaches skills, a question exercises them, and what a child got right is evidence about a skill rather than a score for a page. Review is scheduled from that: a skill that is secure comes back rarely, a skill that is shaky comes back in the warm-up on Monday. The parent can always override it, and the override sticks.

## Trust

Correctness first. A wrong answer key in a maths product is the failure that loses a family permanently, which is why verification is a build gate and why the answer and the checker are independent of each other.

Privacy second, and it is a design constraint rather than a policy page. The amended COPPA rule is in force, so a child's account exists under a parent's, we collect what the product needs to teach and nothing else, the child's build carries no third-party code and talks to no outside host, and evidence stays the family's. A guard enforces the third of those in the repository rather than in a promise.

Accessibility third. Every question has a text form, so it can be read aloud or read by a screen reader. Nothing depends on colour alone. Type sizes and reading load are set for the age, not for the adult looking at the screenshot.

## What we sell

Undecided, and deliberately left so. The likely shape is a family subscription with everything included and no per-subject upsell, because a curriculum sold in pieces stops being a curriculum. Printing must not be a paid tier. Tutors, when they come, are a second seat rather than a different product. No numbers until we have any evidence for them.

## Milestones

These describe what "done" means rather than when.

1. One year of maths for one grade, complete, verified, printable, with the map and the grown-ups sheet. A family could actually use it for a year.
2. The studio, so content is written without the repository, and so a parent can change a question.
3. A second grade and a second subject, to prove the core is general rather than shaped around one year of maths.
4. Accounts, sync and evidence, so a child's work follows them and a parent's week is assembled from what actually happened.
5. Tutors.

## Risks

The content mountain is the real one. A year is on the order of a hundred and eighty lessons, and the bet is that verified generation makes that cheap. If verification turns out to pass questions that are correct but badly taught, we have automated the wrong half of the problem and a person is back in the loop.

Drawing is the second. The art has to stay consistent across hundreds of parts drawn over months, or the product stops looking like one thing, which is why a part is one declaration and the pen is shared.

Reading load is the third, and it is the quiet one. Every question we write for a five-year-old is a sentence they may not be able to read, and the failure mode is a child who cannot start rather than a child who gets it wrong.

Distribution is the fourth, and the one we understand least. Homeschool families choose curricula through other families, which is slow and does not respond to advertising.
