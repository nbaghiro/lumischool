# AI

## Decided

Three things in this document were put up for a decision and are now settled.

**Tier one is the default and the first build.** No model is reachable from a child's device, online or offline. Generation happens at an author's or a parent's desk, or in a job, and its output is verified and compiled into the pack before a child can receive it. The claim we make to a parent is not that the model is constrained but that there is no model, which is a stronger sentence and a checkable one. Tier two is built only on evidence that tier one is insufficient, and then behind a parent's switch.

**A child reads no model-written text.** The request channel carries a fixed set of actions and a state, never language, so there is nothing to inject into and nothing child-authored to store. The property a parent can check is that every word a child reads was written by a person.

**A generated activity cannot declare its own thresholds.** They come from the mechanic, because a model that writes its own pass mark has not been gated. The prover is necessary and not sufficient, so a parent's play-through is the second half of the gate.

The measurement in this document reorders the work: across the items we have there are ninety-three hints, no item has two, and twenty-four items recognise no mistake at all. A chooser is only as good as the shelf it chooses from, so the first useful AI work is model-written hints and feedback rules at author time, where the verifier already refuses a rule that would also fire on a correct answer. That comes before anything at a child's screen.


Status: proposed design, September 2026, prototyped in `scratchpad/assistant.html`. It covers what AI does for a child, what it does for a parent, where generation and verification sit, and what we refuse to build. It depends on the verifier being a build gate ([notation.md](notation.md)), on content compiling to a pack ([structure.md](structure.md)), and on the trust constraints in [product.md](product.md). Nothing here changes the notation or the verifier; the places where it needs a core change are listed rather than assumed.

It sits on two documents written alongside it. [parents.md](parents.md) owns the parent's side, and this document adds the AI flows to the authoring layers and the ranks it sets out rather than proposing a second parent product. [activities.md](activities.md) owns what a mini game is: the declaration, the mechanics, the win conditions and the exact wording of the promise a game makes. This document owns the surfaces over both: how a parent asks, what the model is given, what happens when the gate rejects what it wrote, and what a child can choose.

Extended on 15 September 2026 with a survey of every product surface: the workflows a parent, a child or an author could get from a model or an agent are listed in "The child's workflows", "The parent's workflows" and "The studio's workflows", each with where it runs, what leaves the device, what it costs and whether it works offline, as "Where a model runs, and what leaves" defines them; "What exists, what is decided, and what is new" sets the list against this document and the code; the safety properties gain seven more; "What we will not build" and "Core changes this needs" gain the entries the walk found; "Order of work" sorts the list into a first release for parents and one for children; and "Decisions for the owner" lists what the list cannot proceed without. Everything added that day is marked with the date, and nothing decided before it is reopened.

## Summary

A parent must not feel that we have handed their seven-year-old a chatbot, and that cannot be answered with a promise, a filter or a system prompt. So the design starts from what the product structurally cannot do, and the answer we arrived at is stronger than the one we set out to defend.

The position we started from was that the model never speaks freely to a child: it chooses among the product's own materials, and its output is constrained to notation and drawings that are checked before a child sees them. That holds up. Working through it, we found that the choosing can happen earlier than we assumed. Because content compiles to a pack and the verifier is author time code that cannot ship to a child's device, everything a child can receive is already on the device before the lesson starts. The selection among it is a few lines of deterministic code. That means the default build has no path at all from a child's screen to a model, which is a plainer claim than "the model can only pick from a safe list", costs nothing per lesson, and works with the network off.

So the design has two tiers. The first tier puts all generation upstream, at an author's desk or a parent's desk or in a job, and the child's device runs a deterministic policy over verified material. The second tier, which we would only build if the first proves insufficient, lets a child's device ask the model to choose, where the model's whole output is an identifier that the client validates against the pack. The safety argument in the second tier is the one we set out with. The first tier does not need it.

There are two kinds of artefact rather than one. A question is proved correct, and a mini game is proved playable, which is a different promise checked by a different gate. The flows here are the same pipeline over both: a parent asks, a model writes a declaration, the gate runs, the parent looks at what came back, and it becomes content or it does not. What changes with a game is that the gate is a search rather than an evaluation, and that the gate is not sufficient on its own, because a prover can show that a game can be won and cannot show that it is worth playing.

The measurement that matters for sequencing: across 132 items there are 93 hints (one each, none has two) and 131 recognised mistakes, with 24 items recognising none. A chooser is only as good as the shelf it chooses from, and today that shelf is thin. The first useful AI work in this product is not at a child's screen. It is writing hints and feedback rules at author time, where the verifier already rejects a rule that would also fire on a correct answer, which makes a model written rule provable content rather than a judgement call, though the sentence attached to the rule still needs an author to read it.

## How this fits the parent's side

[parents.md](parents.md) sets out four authoring layers and five ranks of work, and the AI flows below belong inside them rather than beside them.

Layer one, choosing a different sheet, needs no model at all. The variants were proved at build time, so more practice of the same item is a selection over content that already exists, and the right implementation is the deterministic pick that document describes. We should not put a model in front of it.

Layer two, changing the shape of the year, is where the plan flow sits. A model proposes an order and a pace over the lessons that exist, and the plan overlay and the prerequisite check are the parent's side's own machinery.

Layer three, changing a number, splits exactly as that document splits it. Inside the range an item declares, we are still choosing proved variants and nothing needs re-proving. Outside it, we have made new content and the verifier's existing checks are the gate. The AI flows in this document are all on the outside half, which is why every one of them names a gate.

Layer four, writing a question, a game or a year, is where generation earns its place, and it is last for the same reason that document gives: it needs the verifier reachable from the home app without the verifier being in the home app. That document prefers the verifier as a service, and these flows are its main consumer, so the case for the service is stronger than it looks there.

Two things from that document constrain this one. The evidence store is where the AI log belongs, as more rows of the same kind rather than a second store, and the matched feedback rule is already named there as the most valuable field in an attempt row, for the same reason it matters here. And the words a parent says to a struggling child, with the thing to do with an object on the table, are content an author writes per skill, which that document states and we agree with: a model may draft that for an author, never for a parent in the moment.

## The child's surface

### How a child asks

A child of five to ten does not type a question, and we do not want them to. Typing is the shape we are refusing, it creates a store of text a child wrote, and at five it does not work at all. Speech is attractive for a pre-reader and is handled below, but it is not in the first build.

A child asks by acting on the page. There are four actions, they are always in the same place, and they are the whole vocabulary:

- Show me. Gives the next rung of the item's hint ladder.
- Where? Points the guide at the place in the picture the question turns on.
- Easier first. Offers one step back: an easier item on the same skill, or the worked example of this one.
- Ask a grown-up. Pins the question for the parent and moves on.

A wrong answer is the fifth request, and it is implicit: the item's feedback rules are evaluated against what the child wrote, and if one matches, the guide says that rule's line and points where the rule says to point. That already exists and is already proved.

The consequence is the property the rest of this document rests on: the channel from a child to anything downstream carries an enum and a state, never language. There is no free text to jailbreak with, no prompt to inject into, no child-authored text to store, and no off-topic ask to field, because there is no channel in which to be off topic.

### What the model may do, and what it may never do

Four actions are available to AI in this product, and the child's surface can only ever show the output of the first three:

1. Pick. Name an existing piece of authored material: a hint, a recognised mistake's line, a worked example, a sibling item on the same skill.
2. Point. Name an anchor in the instantiated scene for the guide to look or point at. The reference is resolved against the concrete scene, so an anchor that does not exist is rejected the same way the verifier rejects one in a content file.
3. Compose. Assemble a scene from parts that exist, which then goes through instantiation, capacity and layout before anything is drawn.
4. Generate. Write notation, which goes through parse and check and then through the gate its kind has: the verifier for a question or a lesson, the prover for an activity. It becomes real content only if the report has no errors, and for an activity only after someone has played it.

The fourth is a parent's or an author's flow and is discussed below. On the child's surface, generation is limited to new parameter values for an item that already exists, because those reuse the author's sentence with different numbers in it.

The rule that follows is worth stating on its own, because it is the one a parent can check:

Every word a child reads was written by a person. The only things a model contributes to a child's page are a choice among authored materials, a place to point, and numbers.

### The free text question, and what we lose

We looked for the smallest amount of free model text a child actually needs, expecting it to be small but non zero. We think it is zero, and there are three places where that costs us something real.

The first is a mistake the item does not recognise. A child writes 12 where the answer is 20, no feedback rule matches, and a model could write the sentence that names the error. This is the one place free text would clearly help. Our answer is that the sentence still gets written, but it does not go to the child in that moment: the unmatched answer goes to the parent's page, and if the parent accepts the proposed rule it becomes a `when` rule on the item, which the verifier proves cannot also fire on a correct answer, and from then on every child gets it. The cost is that the help arrives the next day rather than in the moment. The gain is that it arrives as content, in a person's words, for everyone.

The second is the question sentence in generated practice. A new question needs a sentence. Our answer is that a skill carries a small set of authored sentence frames, and generation fills in the numbers, so generated practice is new maths in old words. This limits how different a generated question can be, and the limit is deliberate.

The third is a child who is stuck at eight in the evening with no adult nearby. They get the hint ladder, the easier step, and a line saying to leave it for their grown-up. That is all they get, and we should not pretend otherwise. What we will not do is fill that gap with a model that talks to them.

Two things a chatbot would provide and we will not are worth naming as rejected options rather than oversights. Answering a child's question about something outside the lesson, which we decline because the value is small and the channel is the whole risk. And conversational encouragement, which we decline for the reasons in the next section.

### The guide

The guide is a firefly, and it is not a friend. It has one job, which is to light up the part of the page that matters.

What it may do: take one of six poses, point or look at an anchor, and say a line an author wrote. That is the entire repertoire, and it is the same repertoire on paper, where the line prints next to the question and the pointing becomes an arrow.

What it may not do, stated as rules on the strings we write as much as on the code:

- No name of its own beyond "the firefly", and no backstory.
- No first person about itself, no feelings, no preferences, no "I". Its lines are in the imperative or the second person, about the maths: "Count the empty squares."
- No questions back to the child about the child. It asks about the maths or it says nothing.
- No memory in its own voice. "You did this yesterday" is a sentence for the parent's page, not for the guide.
- No reciprocated affection, no greeting by name, no noticing an absence, no comment on a streak.
- Cheering is rare, and never for a streak or a login. It is for the hard one.

This is enforceable rather than aspirational, because every line the guide can say is a `say` or a `hint` in a content file. A guard over child facing strings can reject first person and relational vocabulary the same way `check:copy` rejects em-dashes today.

### Choosing a game

A child setting up their own mini game is a good thing to offer and it is not a generation flow. The reason is a property of the form [activities.md](activities.md) gives an activity: an activity declares parameters and ranges the way a question does, and roles that map to props, and the prover walks that cross product before anything ships. So the choices a child could be given are exactly the parameters and the roles, and every combination of them has already been proved winnable, free of dead ends, hard to win by accident and inside its difficulty band.

That makes the child's builder a version picker with pictures rather than a builder. Which guide is beside the board, which objects are being counted, how many of them there are, what the target is: each of those is a row of choices, each choice is a drawing from the shelf, and the set of choices offered is the set the prover cleared. A choice that would take the child outside the proved set does not appear, which is a different thing from appearing and being refused.

Two consequences worth stating, because they are what keep this from becoming a prompt box. A child never types anything into it and never names anything, so there is no channel and nothing to store. And a model is not needed for it: if we want the product to suggest a combination, a suggestion is a pick among proved versions, which is the first of the four actions and needs no new machinery. On the line the owner drew, this is the whole of it: choosing within bounded options is good, and there is no version of a child prompting a model that we offer.

What the builder does not let a child choose: anything about the guide beyond which of the six it is, because the persona rules apply inside a game as much as outside it; and anything that leaves the device, because a child cannot share a game with anyone.

### Session limits

There is no conversation, so there is no session length to cap. What needs a limit is the amount of extra work the product will hand a child in one sitting.

- Hints are a ladder of at most three rungs per question, and asking again gives the next rung, not a new sentence. After the last rung the only actions left are the easier step and the grown-up.
- Extra practice is capped at one set per lesson, offered only after the lesson's own questions are finished, and only if the parent has turned it on. After that set the page says the day's work is done.
- The day ends when the lesson ends. There is nothing to come back for, no notification to a child, and no reason for the product to want a child on it longer.
- A game is a round of one to three minutes and nothing accumulates across rounds, which [activities.md](activities.md) sets and this document does not add to. The one thing to add is that setting up a game through the builder is not a way around the day's limit: it counts as the lesson's own activity.

### What a parent sees, and whether that is enough

Every AI touched moment on a child's page is one line in the family's log: which question, which of the four actions, which material was chosen, and for a generated question the notation and the verifier's verdict. A parent's weekly page shows the shape of it, which questions needed help, and anything unusual.

Assume every exchange is visible to the parent. That is not enough, for three reasons, and we should say so rather than lean on it.

It is after the fact. A parent reading the log on Friday cannot unsee what a child saw on Tuesday, so visibility is an audit of us, not a protection for the child. The protection has to be that the set of things a child can receive is finite, authored and printable.

It will not be read. A parent teaching two children will not read a daily log, so a log designed to be complete is a log nobody opens. Ours has to be readable at a glance and has to surface only what is unusual: help on a question that usually needs none, an answer no rule recognised, a generated set.

It has a second job. The log is also what a parent shows a spouse, a co-op or a state reviewer, so it has to be truthful and dull rather than reassuring.

The guarantees that do the work are elsewhere: the child's build talks to no outside host and contains no author time code, the materials are finite and authored, the parent can turn all of it off, and with it off the product is unchanged except that no extra practice appears.

### Speech, if we ever add it

We are not building it in the first version, and the conditions under which it could ship are worth writing down now so that the option is not quietly lost or quietly taken.

Recognition would have to run on the device, with nothing sent anywhere. The grammar would have to be closed, meaning a handful of intents that map onto the same four actions, so that speech is a second way to press a button rather than a way to say anything. No audio may be retained, no transcript may be kept beyond the matched intent, and nothing that resembles a voiceprint may ever be computed. An utterance that matches nothing gets one authored line and a count in the log, and three in a row turns the microphone off for the session without turning the buttons off.

The rule reading behind this is in the privacy section: the amended rule treats a biometric identifier as personal information, and the older policy that allowed audio as a substitute for typing is narrow and depends on immediate deletion.

## Two tiers, and which one to build

The distinction is where the model sits relative to the child's device.

Tier one, which is the default and the first build. No model is reachable from a child's device, online or offline. Generation happens at an author's desk, at a parent's desk, or in a job, and its output is verified and compiled into the pack. The selection during a lesson is deterministic code over what is in the pack. The claim to a parent is not that the model is constrained but that there is no model.

To be exact about what "no model is reachable" means, since it is the load bearing claim: the child's build does talk to our own API, because [parents.md](parents.md) has it posting evidence rows there, and that is the only thing it sends. There is no request from a child's device whose response can become something the child reads.

Tier two, which is the design we set out to defend, and which we would only build if tier one proves insufficient. At the moment of a miss, the child's app asks our own API to choose, and the model's entire output is an identifier: a hint id, an anchor reference, an item id. The client validates the identifier against the pack and ignores anything else, so the model cannot introduce a string. This needs a parent's switch, needs the child's build to talk to our own host, and stops working with the network off, so the deterministic policy has to stay as the fallback in any case.

Written as properties, tier one gives: no network call, no per lesson cost, no latency, no outside host in the child's build, and the same behaviour with the network off. Tier two gives a better choice of material when the deterministic policy picks badly, and we have not measured how often that is. Since tier two requires keeping tier one's policy anyway, tier one is not wasted work if we later change our minds.

## Where a model runs, and what leaves

Added 15 September 2026. The two tiers say where a model sits relative to a child's device, and they are unchanged. The lists below need four more axes and a status, because two workflows in the same tier can differ in whose model answers, in what the prompt carries, in what a person waits for and in whether they work with the network off. Each workflow in the lists carries one value from each.

Where it runs. There are four values. None: deterministic code over the pack or the record, with no model anywhere, which is most of the child's side and more of the parent's than a reader might expect. Device: something that runs in the browser on the person's own machine and sends nothing, which in this list is only a voice reading authored text aloud and, if it is ever built, speech recognition with a closed grammar; neither is a language model, and the decision at the top of this document rules a language model out on a child's device whether it would run there or not. Ours: an open-weights model on our own server, so that no third party sees the prompt at all. Frontier: a hosted provider's model, called only from our own server through the one assembler, under terms that its provider keeps nothing and trains on nothing. Nothing in the first release needs the third value, and one class of workflow below cannot exist without it.

What leaves, and whose it is. Five classes. Class 0: nothing leaves the device and no model is involved. Class 1: the child's evidence goes to our own server and nowhere else, which is the ordinary path and involves no model. Class 2: a prompt reaches a model through our server, and it carries only what "What the model sees" allows: a grade, a skill state, item ids, numbers, canonical notation, the vocabulary, and a parent's request with the family's known child names taken out. No child's personal information is in it, which is the sentence the consent notice and the direct notice make, and [auth.md](auth.md) puts to the lawyer as question 2 whether a provider that receives this is support for our internal operations or a third party. Class 3: a prompt would carry something that is, or may be, a child's personal information under the amended rule's combining clause: a sentence a child typed, a drawing, a photograph of a paper sheet, a recording. Sending that to a provider is disclosure, disclosure ends our use of the email-plus consent method, which 312.5(b)(2)(viii) allows only to an operator who does not disclose, and it would need separate verifiable consent as well. Under the decision already taken, that a flow which needs more than class 2 does not ship, a class 3 workflow can run on our own model or not at all, and each one below says which. Class 4: a prompt carries a parent's own words about the product and nothing about any child, which is handled as class 2 with fewer fields.

Consent, by class. Classes 0 and 1 are covered by the consent a parent gives when adding the child, whose notice already says that a children's view records the child's answers, the drawings and marks a question asks for and the hints they open, and sends them to us and to nobody else ([auth.md](auth.md), "What the parent consents to"). Class 2 needs nothing further from the parent, because no child's personal information is in the prompt; what it needs from us is the direct notice naming the provider and the purpose, the line at the point of use, and the written assurances 312.8(c) asks of a service provider, and it rests on the lawyer's answer to question 2. Class 3 on a provider's model would be disclosure, which needs separate verifiable consent under 312.5(a)(2) and takes away the email-plus method, so it is not offered; class 3 on our own model is not disclosure, but it is a material change to the notice, which asks every parent to consent again before anything a child produced is read by anything but a person. Class 4 is a parent's own data and touches no child's consent. Under the UK code, every flow that explains a child's evidence to a parent (P12, P13, P18) is monitoring in the ICO's sense, which is why the sign to the child is decision 10 below and question 13 on the lawyer's list; profiling stays off by default because no model's reading of a child changes what the child sees without a parent's confirmation, which property 16 states; and data minimisation is the envelope's field list, in code rather than in a policy.

Cost and waiting. C0: nothing. C1: one short call, a few seconds, prose or a small structured answer. C2: one call and the gate, tens of seconds, which is what widening a range or checking a plan takes. C3: the repair loop, up to five calls and the gate each time, a minute or more, which may finish after the parent has left the page and tell them when it has. C4: a job over the corpus or a prover search, minutes to hours, never while a person waits. The per-family budget and the visible cap in "Cost, latency and no network" apply to C1 to C3; C4 is our cost.

Network. Yes: unchanged with the network off. No: unavailable, with a line saying so and the catalogue or the authored note standing in. Partial: the deterministic half works and the model's half waits.

Status. Exists: prototyped in `.scratchpad/src/ai/` with the scripted writer, or built at the root. Decided: in this document's order of work or its decided sections, and not built. New: not in this document before 15 September 2026. Refused: named in "What we will not build", and listed anyway so that the list is complete and the reason sits beside the request.

One consequence of class 3 decides several entries at once, so it is stated here once. Anything a child produced by hand or by voice, and any image of their work, is either marked by the grown-up with no model, or read by a model we run ourselves, and the second of those is not in either first release. This is not a new rule. It is what [writing.md](writing.md) and [art.md](art.md) already promise for a child's strokes and paintings, read against the consent method we chose.

## The workflows, listed

Added 15 September 2026. The sections above describe the child's surface and the parent's flows as they were designed in the first pass. This section introduces three lists, the child's, which follows it, and the parent's and the studio's, which follow "The parent's surfaces" below, and between them they hold every workflow in which a model or an agent could do something for a parent, a child, or an author, walked against every surface the product has in September 2026: the site and its lesson preview, sign-in and adding a child, the family page, the grown-ups' pages and their prototypes (the journal, marking, Explore, changing the plan, the calendar), the child's map, worlds and lesson, the games, music, paint and the drawing pad, the notation and Make your own, the Levels page, the printed packs, the records and the export, and the Assistant tab as it stands. Most of the parent's entries restate flows this document already had, in the same form as the new ones so that the two can be read against each other; the child's entries are shorter than the parent's, because the decisions at the top of this document leave a child's surface with no model in it, and each entry has to say so rather than quietly relax it.

Every entry is written the same way. It says what the person is trying to do and where in the product they are standing, what the model or the agent does, what it reads and what it may write, what the person sees and has to confirm, and what it must never do. It then carries five marks, defined in "Where a model runs, and what leaves" above: where it runs, what leaves the device and whether any of it is a child's, what it costs and how long the person waits, whether it works with the network off, and its status against this document and the code. The marks are compressed on purpose, so that a reader can scan a group and see, for instance, that nothing on the child's side needs a network and that nothing on the parent's side involves a child's name.

Two words are used with a fixed meaning. A model is a language model answering one request. An agent is a loop the product runs over several requests and gates, such as the repair loop or a job over the corpus, where the person sees the end of it rather than each step. Where an entry is a job, it says so, and no job runs while a person waits.

## The child's workflows

Added 15 September 2026. Nineteen entries. Every one of them is inside the rules "The child's surface" sets: no model is reachable from a child's device, the channel from a child carries an enum and not language, every word a child reads or hears was written by a person, and the guide has no persona. Where a request in this list is one those rules refuse, the entry says what stands in for it, because a child who cannot ask a question in words still needs the thing the question was for.

### The guide's help

#### K1. Show me

Exists. The child presses the button and the guide says the next rung of the item's hint ladder, an authored sentence with the variant's numbers filled in, and points where the rung says to point. Asking again gives the next rung and not a new sentence; after the third the only actions left are the easier step and the grown-up. The root's `mayHint` adds the parent's setting: on request, or only after a wrong try. It reads the pack, writes a `hint-opened` event, and must never show a rung ahead of the one the author ordered, which `validate` in the prototype refuses even when a model proposed it.

Marks: none; leaves class 1, the event to our server; C0; works offline; exists, in the prototype and at the root.

#### K2. Where?

Exists. The guide looks or points at the anchor the question turns on, resolved against the concrete scene, and says nothing. An anchor that does not exist in this variant is refused the way the verifier refuses one in a file, which the prototype exercises with a deliberately wrong proposal.

Marks: none; leaves class 1; C0; works offline; exists in the prototype.

#### K3. Easier first

Exists. One step back: an easier item on the same skill, or the item's own worked example. The sibling is chosen by the deterministic policy over the pack, by the item's stars or its order in the skill until skills carry an order of their own. It must never step outside the lesson's skill, and it counts toward the day's work rather than adding to it.

Marks: none; leaves class 1; C0; works offline; exists in the prototype.

#### K4. Ask a grown-up

Exists. The question is pinned for the parent and the child moves on. The pin is a line in the log that the parent's page surfaces as unusual, and it is the one action whose whole effect is on the parent's side.

Marks: none; leaves class 1; C0; works offline, sent when the queue empties; exists in the prototype.

#### K5. A wrong answer

Exists. The item's feedback rules are evaluated against what the child wrote, the first that holds says its line and points, and a right answer fires none; the root's `firstRule` does this over the pack's rules, and the six fixed lines in `LINES` cover the cases no rule covers ("Not yet. Have another look."). After three tries the answer is shown and the question comes back another day. It must never say a rule's line when the answer is right, which the verifier proves per item before the pack is built.

Marks: none; leaves class 1, the `answered` event with the matched rule; C0; works offline; exists at the root.

#### K6. Asking a question about the sheet

Refused, and the reason is the design. A child cannot type or say a question to a model, because typing is the channel we refuse, a typed question is a store of a child's words, and at five it does not work. What stands in: "Where?" for what the question is about, "Show me" for how to start, "Easier first" for a smaller step, and "Ask a grown-up" for everything else, which pins the question with the sheet and the variant so the parent sees exactly what the child was looking at.

Marks: none; refused.

#### K7. A hint in other words

Refused at the child's screen, met at the author's desk. A child who did not understand the first rung gets the second, which is an author's rephrasing, and the audit's rule that a ladder asks rather than tells makes the rungs different in kind and not only in words. A model paraphrasing a hint in the moment would be free model text, and the items carry ninety-three hints today with no item carrying two, so the shortage is content: S1 writes the ladders, the verifier proves each rung does not contain the answer once that warning exists, and an author reads them.

Marks: none at the child's screen; refused there, decided as S1.

#### K8. Reading aloud

A voice, not a model. `narrate` on a question's words is read by the device's own speech synthesis, sending nothing, on by default at grades one and two, and a parent's setting turns it off or on. Every word read is authored. The guide's lines and the fixed lines are read the same way. A story problem at grade one is still an adult's to read, since the constraint is reading load and not the voice.

Marks: runs on the device; leaves class 0; C0; works offline; decided in the notation, not wired at the root.

#### K9. A worked example

Exists through K3. The item's `worked` variant is drawn in the teacher's pen with the working shown, and "Easier first" offers it when no easier sibling exists. Nothing is generated.

Marks: none; leaves class 1; C0; works offline; exists.

#### K10. Another like this

Decided. After the lesson's own questions, if the parent turned it on, one more set of the same items with new numbers, drawn from the extra draws the pack already carries, capped at one set per lesson, after which the page says the day's work is done. The cap is `LIMITS.extraSetsPerLesson` in the prototype, declared and not yet read by anything.

Marks: none; leaves class 1; C0; works offline; decided, with the cap unwired.

#### K11. Choosing a game

Decided. The builder is a version picker with pictures over the parameters and roles an activity declares, and every combination it offers was proved. A suggestion is a pick among proved versions. A child never types into it and never names anything. It waits on the activity core, and the games in the arcade today are chosen by the child from a tray with no builder.

Marks: none; leaves class 1, a `round-played` event; C0; works offline; decided.

#### K12. A story in their world

Decided for the world's story, new for the family's. The world's arrivals, moments and the guide's lines are authored per world, at most eight words each, and a child meets them by finishing lessons, since a moment inks when a term's lessons are done ([story.md](story.md)). A story a parent asked for through P17 arrives as a sheet on a day, marked as made at home, and the child reads it only after the parent has. Nothing on the roll is written by a model.

Marks: none; leaves class 0; C0; works offline; decided and new.

### The map and the worlds

#### K13. What a place is, and what happens next

No model, and a little content. A child taps a landmark and the guide says that landmark's authored line, or the drawing's `describe()` sentence for a screen reader, which never gives an answer away. What happens next is already on the roll as the closed sheet under today with its title, and the next world's horizon drawn faint with a sign on the path. The content work is the `describe()` sentence on every drawing that stands in a world, which [shelf.md](shelf.md) plans and S13 drafts. A model at the child's screen would add a sentence a person did not write, so it does not.

Marks: none; leaves class 0; C0; works offline; decided in the shelf's plan.

### Drawing and painting

#### K14. Help with a drawing

No model, and one idea. The paint tool has no camera, no upload, no import, no share and no analytics, and a painting is never sent to a model ([art.md](art.md)); a drawing in the journal's margin stays on the device unless it becomes an attempt, and whether it ever leaves is an open privacy decision in [journal.md](journal.md). A model that "helped" would need the drawing, so there is none. What could help without one is deterministic: the shelf's drawings are stroke files, so a drawing can be replayed one stroke at a time as "draw a rabbit in five steps" beside the child's own paper, which is the same art the child sees everywhere else and needs no model. It is in this list as the answer to the request rather than as AI work.

Marks: none; leaves class 0; C0; works offline; new, and not AI.

### Music

#### K15. Echo and rhythm feedback

No model. The child plays the drawn keyboard or the beat track, the input is a `Performance` of pitches and onsets from the screen and never from a microphone, and the judge in the sound engine says whether the pitches match and whether the rhythm is inside its declared tolerance ([sound.md](sound.md)). The line the guide says is authored per exercise ("The drum played 4 and you played 3. Listen again."). Making up a tune is collected and never judged. There is no generated sound; a model composes only from the voices that exist, and only at an author's desk.

Marks: none; leaves class 1, a `performance` answer; C0; works offline; built in the prototype.

### Writing

#### K16. A sentence read back, and a spelling asked

A voice, not a model, and a list, not a model. A child who typed a sentence hears it read back by the device's own voice, on the device, so that they can hear the missing word; the sentence is already an answer when the item asks for one and goes to our server as an attempt, and it goes nowhere else. A spelling asked is the lesson's own word list: the child taps a word to hear it and see it, which the reading and writing tracks' word cards already draw. A spelling of a word the lesson does not hold is a question for a grown-up, because answering it would be free text.

Marks: runs on the device for the voice; leaves class 0 for the voice, class 1 for the answer; C0; works offline; new.

### Coding

#### K17. What a program does, and finding a bug

No model. The interpreter that draws the picture, proves the answer and animates the run is one function, so stepping a program on the grid shows exactly what it does, and a debugging item declares the one wrong line, with the checker having proved no other single change also works ([coding.md](coding.md)). The child's help is the same four actions with the item's authored rungs. A model explaining a program would be free text, and a model finding a bug would be doing what the checker already did.

Marks: none; leaves class 1; C0; works offline; built in the prototype.

### Speech

#### K18. Speech, if we ever add it

Restates "Speech, if we ever add it" unchanged: recognition on the device, a closed grammar of a few intents that map onto the same four actions, no audio retained, no transcript beyond the matched intent, nothing resembling a voiceprint, and three unmatched utterances turn the microphone off for the session. It is the only entry on the child's side that would put a model of any kind on the device, and it is not a language model. `check:privacy`, once it exists at the root, refuses the microphone APIs until this is decided.

Marks: runs on the device; leaves class 0 by construction; C0; works offline; decided as conditions, not built.

### What a child may never be offered

#### K19. The list

Restated and extended from "What we will not build", so that the child's side can be checked as a list. A child is never offered: a text box or a microphone that reaches a model; a word a person in their family did not write or read first; a hint, a story, a description or a greeting written by a model in the moment; a guide with a name, a memory or feelings; a photograph, a recording or an image of themselves anywhere in the product; a game they described rather than chose; a drawing a model made; a comparison with another child; a streak, a timer, a notification or a reason to come back; a sentence about being behind; a way to share anything with anyone; and any page on which a model's choice is not also a person's choice, which is what "no hidden adaptation" means on this side.

Marks: none; refused, as one list, so that a test over the child's build can be written against it.

## The parent's surfaces

The ground is different here. A parent is an adult who asked for something, so prose in an answer is fine, and the risk moves from what a child reads to whether what we produce is true. Every flow below says what the gate is, because a parent authoring flow is only offerable at all because anything a model writes becomes real content after it passes.

### More practice, and practice of a particular kind

A parent asks for more of question four, or more that is harder, or more with money instead of counters. Where what they want is inside the ranges the item declares, this is layer one and no model is involved: the variants were proved at build time and we pick different ones. Where it is outside them, the model widens the ranges or writes a new item, and the gate is the verifier on the real item over the variants the new ranges allow. New ranges on an existing item are the lowest risk and highest value generation flow in the whole document, because the teaching is still the author's and only the numbers are new.

Where a parent asks for a different skin ("use apples, she likes apples"), the `roles` line already does that without any generation, and we should use it rather than write a new item.

### Adjusting difficulty

Mechanical: parameter ranges, which items a lesson names, how many questions. The model proposes a diff to the lesson file, the verifier proves it, the parent applies it. Gate: the verifier, plus the rule that a lesson's `show` and `worked` settings must name a variant the item actually allows, which already exists.

### A curriculum from a goal

A parent says where their child is, what they want by June, and how many days a week. The model selects and orders lessons from the catalogue and proposes weeks. It does not write lessons in this flow. Gate: the plan is checked against the skill graph, so a lesson cannot appear before its prerequisites, and against pacing bounds, so a plan cannot ask for four lessons a day. The plan is data the parent edits, and it stays visible, which is what [product.md](product.md) means by not being adaptive in the hidden sense.

### A custom lesson

A parent wants a lesson on giving change using the names of the shops in their town. The model writes a lesson file naming existing items, and where it needs a new item it uses existing parts and authored sentence frames. Gate: parse, check, verify, and then the parent reads the prose, because this is the flow where new sentences are written. Accepted content is family scoped, carries its provenance, and shows a mark on the page and on the grown-ups sheet saying who made it. It does not reach another family without an author reviewing it.

### A mini game, and editing one

A parent asks for a game: something their child can play on the balance, or a counting game with the animals rather than the cubes, or the same game they had last week but harder. The model writes an activity declaration, the prover runs, the parent plays it, and it becomes content for that family. The pipeline is the one above with a different artefact, and four things about it are different.

The gate is a search rather than an evaluation. [activities.md](activities.md) states the promise in five clauses, and the prover settles all five per version from one bounded walk of the position graph. The important difference for this flow is cost: a question's version is checked once, and a game's version needs a search, so proving a generated game is not free the way proving a generated question is. The shape we propose is that a request proves a seeded sample of versions while the parent waits, the game is playable from that sample immediately, and a job proves the rest before the child is offered any version outside it. We have not measured either number.

The declared bounds are not the model's to write. An activity carries its own thresholds for luck, branching and the position cap, and a model that writes its own pass mark has not been gated at all. So a generated activity takes those thresholds from the mechanic rather than from the model, and the gate rejects a file whose declared thresholds are looser than the mechanic's. This is a requirement on the form in [activities.md](activities.md), where the open question of whether the position cap belongs to the mechanic or to the activity is currently open: for generated activities it has to belong to the mechanic, and if that document settles the other way we should reconcile the two rather than allow the looser reading here.

The art catalogue is both the palette and the boundary. A generated game composes drawings that already exist, named through the parts index, and it cannot ask for a drawing that has not been made. That is what keeps a generated game looking like the rest of the product, and it is the same property that makes the child's help surface safe: the output is a selection over a closed set. Where a parent asks for a game about something we have no art for, the answer is that we cannot make it, which is the same rule the curriculum already lives by.

The prover is necessary and not sufficient. It says a game can be won, has no dead ends and cannot be won by accident; it says nothing about whether the game is fun or whether it teaches the skill it claims, and [activities.md](activities.md) is explicit that those stay human judgements. For a generated question the verifier is nearly the whole gate. For a generated game the parent's own play through is the second half of the gate, and it is not a preview we can let them skip. So the flow is: prove, then play, then accept, and a game that was never played stays a draft.

Two smaller rules follow from that document. A generated activity has to name a paper companion, and `paper=none` is not allowed, so the model selects an existing item or lesson section on the same skill and the gate checks that the selection exists and shares a skill; where nothing suitable exists the request fails rather than leaving a hole in the day. And a generated activity is never in the print path, which is already a guard there.

Editing one is the same flow with the existing declaration as the base: different props, a different range, one fewer object, a different target. Changing the mechanic is not an edit, because it is a different game, and it goes through the flow from the start.

Where it lives afterwards: as an activity file scoped to the family, with provenance, attached to the lesson's `try` block or the map's side node the parent chose, switchable off in the week view the same way any activity is. It does not reach another family without a person reviewing it, which for a game means playing it.

### Explaining what the evidence suggests

A parent asks why times tables are not sticking. The model gets the evidence and answers in prose. This is a good use and it needs two limits.

It may not diagnose. No clinical or quasi clinical language, no named conditions, no age equivalent scores, no prediction of future ability. Where a parent's question is really a clinical one, the answer says that we cannot tell them that and that a person can.

It may not infer what the parent's side already refuses to infer. [parents.md](parents.md) has that list, and it binds a model as much as it binds a chart: nothing about effort, attention or motivation from time on task, nothing from a single attempt, no comparison to another child or to an age, and no timing claim about work done on paper. A sentence can imply all of those more easily than a chart can show them, so the prompt says what may not be claimed and the output is read for it.

It may not invent evidence. Every number in the answer comes from the evidence store, and a number in the prose that does not match a computed field is a defect we can detect mechanically by extracting the numerals and comparing them. That check is cheap and it is the same check the records flow needs.

### Drafting the records a family has to keep

Homeschooling families keep attendance, hours, samples of work and a progress narrative, and the requirements differ by state. This is genuinely valuable and it is the flow with the worst failure mode, because a document that misstates facts goes to an authority.

The split: every number and date in a record comes from the evidence store and is rendered by code, and the model writes only the connecting narrative. The numeric grounding check above applies. The parent signs it, and the draft says it is a draft until they do. We do not tell a family what their state requires; we produce the record from what they say it requires, and we say that is what we are doing.

### A tutor for a child

A parent configured tutor is not a new capability. It is the child's surface with a parent chosen configuration: which of the four actions are available, on which skills, with how much extra practice, whether the builder is on, and whether generated content is allowed at all. Those belong in the settings list [parents.md](parents.md) already has, as more rows rather than a panel of their own. Everything it does appears in the same log.

That is the whole difference from an open chatbot, and it is worth stating in those terms: a tutor here has a fixed repertoire, a scope a parent set, no channel for a child to type into, and a record. A human tutor, when tutors exist as a seat, is a second grown-up attached to a child, per [product.md](product.md), and gets the parent's surfaces rather than a new system.

## The parent's workflows

Added 15 September 2026. Twenty-eight entries, grouped by the job in [parent-app.md](parent-app.md) they serve. Where an entry restates a flow from "The parent's surfaces" above, it says so and adds only the marks and what the walk of the surfaces changed. The ground rules from that section hold for every entry: a parent is an adult who asked, so prose is fine; the risk is whether what we produce is true; and anything that would become content names its gate.

### Planning

#### P1. A curriculum from a goal

Restates "A curriculum from a goal". The parent is on the grown-ups' page, in the panel the journal direction calls "what to ask for" and option A calls Make, and says where the child is, what they want by June and how many days a week. The model reads the catalogue as lesson ids with their skills, prerequisites and grade, the child's skill state, and the parent's request; it writes a plan, which is an ordered list of lesson ids with a pace. It writes no lesson. The gate is `checkPlan`: every lesson exists, none comes before its prerequisites, and the pace is inside the pacing bounds. The parent sees the plan as weeks on the calendar with the base year visible under it, edits it, and keeps it, which is a `plan-changed` event per change. It must never hide a lesson it dropped, never claim a lesson teaches something its skills do not name, and never write a plan the calendar cannot show.

Marks: runs on a frontier model through our server; leaves class 2, grade and skill state and ids; C2; network needed; decided, and prototyped with the scripted planner.

#### P2. Adjusting pace and levels

Restates "Adjusting difficulty", and adds the Levels page. Every lesson now compiles with up to three levels, the way in, the core and the stretch, and the pack carries them ([audit.md](audit.md)). Choosing which level a child gets, how many questions a practice block has, and where the numbers stop is a setting per child, and it needs no model: the parent picks from what the pack holds and the pick is a `plan-changed` or a settings event. The model enters only when the parent asks for something the pack does not hold, such as a stretch level for a lesson that has none or numbers past the declared range, which is P15. What the parent sees on the Levels page is each level drawn as the child would see it, with the difficulty measure beside it as a label and not a score. The model must never move a child between levels on its own, and nothing here changes what a child sees without a parent's choice recorded.

Marks: runs on none for the choice, and on a frontier model only for a level the pack lacks; leaves class 0 for the choice; C0; works offline; new for the choice, decided for the generation.

#### P3. Catching up after a lost week

New. The parent is on the calendar or the week strip after two days lost to a cold, and the deterministic operations exist already: `shift`, `park` and `set-day` in `school/family/family.ts`, with prerequisites recomputed and a refusal explained. What a model adds is the sentence in front of them and the sentence after. The parent says what happened in their own words; the model reads the plan, the week's cells and the request, and proposes a set of those operations with one line of reason each, for instance to park the puzzle sheet and shift the rest by three days. The product applies nothing: it shows the proposal on the calendar as a preview, the parent confirms or edits, and each confirmed operation is an event. It must never describe the family as behind, must never propose an operation the plan would refuse, and must never propose more lessons a day than the pacing bounds allow.

Marks: runs on a frontier model through our server for the proposal, none for the operations; leaves class 2, the plan and the week as ids and dates and the request; C1; network partial, since the shift works offline and the sentence does not; new.

#### P4. Choosing worlds, and choosing tracks

No model. The world a term is in, the guide, the ground and the creatures are a parent's choice from a panel that lists what each world offers ([journal.md](journal.md)), and the tracks a child does are switches with a rate per week. A suggestion here would be a pick among a dozen options a parent can see at once, which is not worth a request, and the customisation model deliberately keeps a world's words and locks out of anyone's hands, a model's included. This entry is in the list so that a reader does not look for it.

Marks: none; leaves class 0; C0; works offline; refused as a model flow, built as a panel in the prototype.

#### P5. The morning order

No model. The order for one adult and two children is computed from the lessons' declared sections, since a `look` section is taught, a `story` at grade one is read aloud and `practice` is done alone ([parents.md](parents.md)), and the prototype's `src/family/morning.ts` does it. A model would add a sentence a template already writes truthfully. The one thing to add is not a model either: the minutes per section are a table until we have timed a few mornings, and every page that shows them says so.

Marks: none; leaves class 0; C0; works offline; built in the prototype.

### The morning

#### P6. Explaining a method before the lesson

New. A parent about to teach the regrouping lesson wants to know how to explain it before the child sits down, and the lesson's own `look` section and grown-ups note are written for that and may not be enough. From the lesson card on the grown-ups' page, the parent asks in their own words, and the model answers in prose for an adult, reading only the lesson's canonical notation, its grown-ups note, and the skill's authored words for the table, so that the method it describes is the one the lesson teaches and not one it prefers. It writes nothing into the product: the answer is shown once, kept only as long as "Privacy, logging and the amended rule" and decision 13 allow, and never becomes content or reaches a child. The parent confirms nothing, because nothing changes. What it must never do is describe the child, since the evidence is not in its envelope for this flow, or teach a method the lesson does not, which the prompt forbids and which we cannot check mechanically, so the answer says which lesson it is drawn from and the parent has the sheet beside it. The same entry covers a parent asking why the answer to question four is twelve: the grown-ups sheet has the answer and the hints, and the model walks the working from the notation.

Marks: runs on a frontier model through our server; leaves class 2 with no evidence fields, the lesson's notation and the question; C1; network needed, with the grown-ups note standing in; new.

#### P7. Reading a lesson aloud

No language model. The notation already carries `narrate` on a question's words, on by default at grades one and two, and reading those words aloud is a voice, not a model: the browser's own speech synthesis over authored text, on the device, sending nothing. On the child's device that is the whole of it. A better voice than the browser's would be a service, and [sound.md](sound.md) records that a service means a host and defers the choice to the second-language strand. Whichever voice reads, the words are the author's, so the property that every word a child reads was written by a person holds for every word a child hears.

Marks: runs on the device; leaves class 0; C0; works offline with the browser's voice; decided in the notation, not wired at the root.

### Marking

#### P8. A mistake the item does not recognise

Restates the first case in "The free text question, and what we lose", and it is the flow the marking surfaces need most. A child's answer on screen, or a parent's mark on a paper sheet, matches none of the item's rules. The unmatched answer goes to the parent's page as a number beside the question, and Make your own already does the deterministic half at the parent's desk: it works out which of the usual slips would give that number in this version and offers the rule with the cursor waiting for the line ([authoring.md](authoring.md)). Where no usual slip explains it, the model reads the item's notation, the variant and the answer, and drafts a `when` rule with its line and where to point. The verifier proves the rule cannot also fire on a correct answer, the parent reads the line, and on acceptance it is a revision of the item scoped to the family, with `content-authored` carrying the model's name. Every child in the family gets it from the next day; another family gets it only after an author reviews it for the catalogue. It must never send the line to a child the parent has not read, and never store anything but the number the child wrote.

Marks: runs on a frontier model through our server; leaves class 2, an item id, a variant and a number; C2; network needed; decided, and prototyped as the scripted "spot the mistake" flow, which the gate holds for a person because the rule also fires on four of nine versions.

#### P9. A written sentence, or a formed letter

Refused as marking, and the reason is now two reasons. [writing.md](writing.md) marks nineteen of fifty-six items by eye, with a `look-for` sentence for the grown-up, and "What we will not build" already says the grown-up is the marker where the answer is a judgement. The second reason is class 3: a sentence a child typed or a stroke they made is the child's, and reading it with a provider's model would be disclosure. What could exist, and only on a model we run ourselves, is a reading that drafts a mark against the author's `look-for` sentence for the parent to confirm or change. We do not recommend building it in either first release, and if it is ever built the page still says the grown-up marked it, because they did.

Marks: none; leaves class 0 today, class 3 if ever; C0; works offline; refused, with the class 3 variant as decision 3 below.

#### P10. A photograph of a paper sheet

Refused, and listed so that the request has its answer beside it. [parents.md](parents.md) rules out reading a photographed sheet, because a wrong mark from a reading is the failure that loses a family, and "What we will not build" rules out help with a photographed worksheet from elsewhere. A photograph of the sheet for the portfolio is a different thing and should exist: it is a file the family keeps, no model reads it, and it is exported with the rest. The variant that would be worth measuring one day is a pre-filled mark column, where a model we run ourselves reads the photograph and ticks what it thinks was wrong, and the parent confirms every mark before any is recorded, so that the product never claims to have marked what a person did not. That is class 3, it is our own model or nothing, and it is decision 4 below.

Marks: none; leaves class 0 for the portfolio photograph, class 3 for the pre-fill; C0; works offline; refused, with the pre-fill as a decision.

#### P11. The words to say at the table

No model at the table. When a child is stuck, the card gives the matched rule's sentence, the earlier lesson that teaches the step underneath, a re-seeded practice at the easier end, two sentences of what to say with one thing to do with an object, and permission to park the lesson ([parents.md](parents.md)). The words and the object are content an author writes per skill, and "How this fits the parent's side" already says a model may draft that for an author and never for a parent in the moment. That drafting is S4 below. At the table the card reads authored content and the evidence, and it works with the network off.

Marks: none; leaves class 0; C0; works offline; decided.

### Explaining the evidence

#### P12. What a pattern of mistakes means

Restates "Explaining what the evidence suggests". The parent is on a child's page or the gap ledger and asks why times tables are not sticking. The model reads the child's evidence as this document's envelope allows it: skill states, attempts as item ids, variants, answers as numbers, matched rules, and days, with no name, no age and no time on task. It answers in prose that names the rule that matched and the days it matched on. The three limits stand: no diagnosis or clinical language, nothing the parent's side refuses to infer, and no number that is not in the evidence, which `checkRecord`'s digit-level grounding already tests. The walk of the surfaces adds one thing: every reading on the parent's pages is already named by the author's sentence for the mistake rather than by a skill id, and the model's answer should use those same sentences, so that a parent hears one description of a mistake across the card, the letter and the answer.

Marks: runs on a frontier model through our server; leaves class 2, the evidence as numbers and ids; C1; network needed; decided, with the grounding check prototyped.

#### P13. Whether to move on

New, and small. The decision card's recommendation is deterministic and should stay so: stay only when the same rule matched more than once in one sitting, otherwise ask the parent ([parents.md](parents.md)). What a model adds is the answer to the parent's follow-up, "why do you think so", which is P12 scoped to one lesson, and, when the parent has chosen, nothing. The recommendation is never the model's, because a recommendation a parent trusts has to come from a rule they can read.

Marks: runs on a frontier model through our server for the follow-up only; leaves class 2; C1; network partial; new.

### Writing

#### P14. A custom lesson

Restates "A custom lesson". The parent asks for a lesson on giving change with the shops in their town; the model writes a lesson file naming existing items and, where it needs a new item, uses existing parts and the skill's authored sentence frames; the gate is parse, check, verify, and then the parent's read of the prose, because this is the flow where new sentences are written. Accepted content is family scoped with provenance, marked on the page and the grown-ups sheet as made at home, and reaches another family only through an author. The walk adds where it lands: Make your own already saves a question as a `content` row with `content-authored` and `content-verified` events and gives it to a child as a `set-day` operation on the plan, and a lesson lands the same way with the journal showing it on the day it was given. The word rule here is decision 1: a child reads model-written words only after a parent in their family has read them, and the page says who made it.

Marks: runs on a frontier model through our server; leaves class 2, the request with names stripped and the vocabulary; C3; network needed; decided, and prototyped as the scripted "corner shop" lesson.

#### P15. More practice, and practice of a kind

Restates "More practice, and practice of a particular kind". Inside an item's declared ranges nothing is generated: the pack carries the variants each lesson names and two more draws of every practice block, so another sheet is a pick. Outside the ranges the model widens them or writes a new item on the same skill, and the verifier over the new variants is the gate. A different skin is the `roles` line and needs no model. The Levels page gives this flow a second home: a stretch level for a lesson that has none is the same request with a difficulty target, and the difficulty measure labels the result for the author or the parent to read.

Marks: runs on none inside the ranges, a frontier model outside them; leaves class 0 inside, class 2 outside; C0 inside, C2 outside; works offline inside the ranges; decided, and prototyped as the scripted "harder bonds" flow, whose first attempt the verifier rejects.

#### P16. A mini game, and editing one

Restates "A mini game, and editing one" unchanged: a declaration over a mechanic that exists, the prover as the first half of the gate and the parent's play-through as the second, thresholds from the mechanic and never from the file, art from the parts index only, a paper companion required. The walk adds two things from [games.md](games.md) and [engine.md](engine.md): a generated activity cannot yet choose what its board looks like, because a mechanic's drawings are code rather than a filled slot, and it cannot yet be dragged without a hand-written binding, because `handles(position)` is not declared data. Both are core changes this flow waits on, and both are listed under "Core changes this needs".

Marks: runs on a frontier model through our server, with the prover as a job; leaves class 2, the mechanic contracts and the palette; C3 for the request and C4 for the full proof; network needed; decided, not prototyped.

#### P17. A story for a world

New. The fourth thing a parent wants to make in [authoring.md](authoring.md) is a picture story, a few pictures with a line of words under each and no answer to check, and the natural place for it is the world the child is in this term. The parent asks in their own words, and the model reads the world's identity (its drawings, its guide, its authored lines), the shelf as the parts index, and the request with the family's names taken out; it writes a lesson whose sections are pictures and words. The gate is the checker, since there is no answer to verify, and then the parent's read of every line, which is the whole of the gate for prose. The child's name is filled in locally, as "What the model sees" already requires. It must never write a line for the guide, never add a creature or a place to the world, and never reach the child before the parent has read it. This is not the world's own story: the moments, the arrivals and the guide's lines stay authored per world, at most eight words each ([story.md](story.md)), and a family story is a sheet on a day, not a change to the world.

Marks: runs on a frontier model through our server; leaves class 2; C2; network needed; new, and the second half of decision 1.

#### P18. A page for whoever teaches next

New. The handover pack in [parents.md](parents.md) is a print job: the week's sheets, the grown-ups sheets, and one page saying where the child is, what they are secure on, the one thing to watch for and how a lesson runs. The numbers on that page come from the evidence and are rendered by code; the model writes the connecting paragraph for a grandparent or a tutor, in the same envelope as P12 and under the same grounding check, and it is a draft until the parent reads it. It must never say a child is behind, never name a mistake that came up once, and never carry the child's name into the prompt, which the page fills in when it prints.

Marks: runs on a frontier model through our server; leaves class 2; C1; network needed; new.

#### P19. The Friday letter

No model. `src/family/letter.ts` writes the week as a letter from the child's guide, deterministically, from the same facts every other page reads, and it already refuses what the product refuses: it never says a child is behind, never counts stars, says a short week as a number of days, and leaves out a mistake that came up once ([parent-app.md](parent-app.md)). A model could write a warmer letter and could not write a truer one, and a letter that goes to a phone every Friday is the last place to introduce a sentence nobody checked. The letter stays a template; a parent who wants more asks P12.

Marks: none; leaves class 0; C0; works offline; built in the prototype.

### Records

#### P20. The records a family has to keep

Restates "Drafting the records a family has to keep". Attendance, hours by subject, the lesson log and the portfolio are rendered by code from `sitting-ended`, `day-added` and `sheet-printed` events; the model writes only the narrative, under the grounding check, and the parent signs it, with the page saying it is a draft until they do. We do not say what a state requires. The walk found the records surface itself unbuilt at the root, with the `exported` event kind declared and never emitted, so this flow waits on the records screen before it waits on a model.

Marks: runs on a frontier model through our server; leaves class 2, the counts and dates; C1; network needed; decided, and prototyped as the scripted "term one" record, whose loose draft the check rejects for three ungrounded numbers and one forbidden word.

#### P21. A cover for the export

New, and small. The export is one JSON download of everything the family holds, and the consent notice promises it. A parent, or a district a parent chooses to hand it to, reads JSON badly. The model writes a one-page cover in prose saying what the file holds, in what order, and which numbers the records were computed from, grounded the same way as P20. It never goes by email, because the export never does.

Marks: runs on a frontier model through our server; leaves class 2; C1; network needed; new.

### Onboarding

#### P22. Which grade, which tracks, the first week

New. A parent adding a child today chooses a name and a grade from one to four, and consents. A parent who does not know which grade band fits, or which tracks to start, has two paths. The first needs no model and we recommend it first: a placement sheet per track, printed, with a handful of proved items across the grade bands, whose marks place the child, since the items already carry a level and a skill. The second is the model: the parent describes what the child can do in their own words, the router refuses anything about health, diagnosis or behaviour before a model is called, the family's names are stripped, and the model proposes a grade band per track, the tracks to switch on, and a first week as a plan through `checkPlan`. The parent sees a proposed setting per track with the reason beside it and confirms each. It must never state an age, never compare the child to an age or a grade level, and never write a word the child reads.

Marks: runs on none for the sheet, a frontier model through our server for the conversation; leaves class 0 for the sheet, class 2 for the conversation; C0 or C2; network partial; new, with the sheet recommended first.

### The calendar

#### P23. Moving, parking and holidays by asking

New. The calendar prototype moves a lesson to another day, parks one, and lays tape across a week that went wrong. A parent who says "we are away the week of the twelfth and Theo has swimming on Wednesdays" is asking for a handful of plan operations and a per-track rate, and the model's job is to turn the sentence into those operations, reading the plan, the family's time zone and the request, and nothing about a child but their grade and the ids of their tracks. The calendar previews the result with the base year under it, the parent confirms, and each operation is an event, the same as P3. Prerequisites are checked by the plan, not by the model, and a refusal is explained by the plan's own reason. It must never apply anything unconfirmed, and it must never move a lesson that was printed for a day without saying so, which is the open question in [parent-app.md](parent-app.md) about what the child's device shows.

Marks: runs on a frontier model through our server; leaves class 2, the plan as ids and dates; C1; network partial; new.

### Tutors

#### P24. A tutor's questions

New. A tutor is a second grown-up on one child for a window of days, and [auth.md](auth.md) rules that tutors cannot generate. What a tutor needs from this list is P18, the page that says where the child is, and P12 about that one child, scoped by the same reach the API already computes per request. Whether a tutor may ask P12 at all, charged to the family's budget and written to the family's log with the tutor as actor, is decision 5. A tutor never sees another child, never authors, and a tutor's request is logged like a parent's.

Marks: runs on a frontier model through our server; leaves class 2, one child's evidence; C1; network needed; new, behind a decision.

### Asking about the product

#### P25. Asking anything about the product

New. A parent asks what the difficulty measure means, whether printing is a paid tier, how to withdraw consent, or what the product does with a model. The model answers from the design documents, the site's words and the consent notice, and from nothing about the family: this is class 4, a parent's own question and no child in it. It sits in the grown-ups' app, not on the site, because the site has no forms and collects nothing ([auth.md](auth.md), flow 13). The answer cites the page it drew from, so the parent can read the source, and the router refuses the same things it refuses everywhere: medical, legal and behavioural advice, and anything about a child who is not theirs. It must never answer a question about the family's evidence, which is P12 and has its own envelope, and never state a fact about the product that no document states.

Marks: runs on a frontier model through our server; leaves class 4; C1; network needed; new.

#### P26. Changing a setting by asking

New, and low. The settings list per child (how long a day is, what happens when it runs out, when hints appear, whether questions are read aloud, paper or screen) is short enough to browse, and a sentence like "read the questions aloud to Maya" saves a parent one click. The model maps the sentence to a setting and a value, the page shows the change and the parent confirms it. It is in the list because it is the one place a model would act on a child's day, and the rule is that it never does so unconfirmed.

Marks: runs on a frontier model through our server; leaves class 2, the settings' names; C1; network needed; new, last.

### Changing a question

#### P27. A question from a sentence

Restates the fourth way in from [authoring.md](authoring.md), which is the one authoring entry with a model behind it. The parent writes what they want ("three rabbits for Maya, and two more are born"), the names are taken out before it leaves the page, the model writes notation over parts that exist, the gate checks it, and the result opens on the page as a draft from a sentence until the parent has read it. A sentence the model cannot draft becomes a search of the shelf with the same words. The page's six steps then let the parent change anything, and every change edits the same notation.

Marks: runs on a frontier model through our server; leaves class 2; C2; network needed, with the shelf search standing in; decided, and prototyped with a script in Make your own.

#### P28. Changing a number, or a name, in a question

No model. Inside the ranges an item declares, and for a role mapped to another drawing, the change is a pick among proved variants; outside them it is P15. A parent who wants their children's names in a question edits the words on the page, and the names never leave it, because the sentence start is the only place a request leaves the page at all.

Marks: none; leaves class 0; C0; works offline; built in the prototype.

## The studio's workflows

Added 15 September 2026. Sixteen entries for the author's desk and for the jobs the product runs over its own corpus. The ground is different again: no family is involved, so no entry below carries a child's data and every prompt is in class 2 with the evidence fields empty, or the job reads nothing but content. The gate is the same Workspace the editor, the tests and the build use, and the second half of every gate is an author's read, since "The gate passes something badly taught" is the failure this document names as the real one. Several of these are agents in the sense above: a loop over the corpus that drafts, gates and queues, where the author sees a queue and not a conversation.

#### S1. Hint ladders and feedback rules for the items we have

Restates the second item of the order of work, and it is still first. A job walks every item with fewer than three rungs or no recognised mistake, gives the model the item's canonical notation, its variants and the skill's authored words, and asks for the missing rungs and `when` rules with their lines and anchors. The verifier proves each rule cannot fire on a correct answer, the audit's warning that a filled-in hint contains the answer refuses a rung that gives it away once that warning exists, and `check:voice` refuses first person and relational vocabulary. What survives lands in a review queue where an author reads the sentence, since a rule that is provable can still be badly put. The grade-one pilot did this by hand for forty-two items; the job does the rest.

Marks: runs on a frontier model through our server, as a job; leaves class 2 with no evidence, content only; C4; the desk is online; decided, prototyped in the gate and not as a job.

#### S2. Levels and variants

New. Every lesson is to carry a way in, a core and a stretch ([audit.md](audit.md)), and after the raise the corpus has 1,711 question slots with reasoning and non-routine questions at twenty-two per cent. A job reads a lesson, its items and the difficulty measure, and drafts what is missing: wider ranges for a way in, a stretch item over the same parts and frames with a two or three rung ladder, or a `try` that does not repeat the practice item. The verifier gates each item, the difficulty measure labels it, and the Levels page shows the three levels drawn for an author to read before any is compiled into the pack. The measure is a label and not a gate, which is decision 11: an item the measure calls a stretch still needs an author to agree.

Marks: runs on a frontier model through our server, as a job; leaves class 2 content only; C4; new.

#### S3. Checking a lesson against a standard

New, and a report rather than content. An author asks which objectives of the Common Core, the England curriculum or Singapore's a lesson covers, or which the track claims and no lesson exercises. The model reads the lesson's notation, its items' skills, and the standard's text as we hold it, and writes a table with a sentence per claim. Nothing it writes becomes content, and the audit's own tables are the check on it, since a model matching skill ids to objective codes can be wrong in a way the author will see at once and a parent would not.

Marks: runs on a frontier model through our server; leaves class 2 content only; C1; new.

#### S4. Descriptions, notes and the words for the table

New as a flow, present as a sentence before. For a lesson: the `goal`, the `grown-ups` note with the struggling case in mind, and the `remember` line. For a skill: the two sentences a parent says at the table and the one thing to do with an object, which [parents.md](parents.md) makes an author's content and which the stuck card reads. For a by-eye item: the `look-for` sentence and the two to five things to tick ([art.md](art.md), [writing.md](writing.md)). For the piano: the practice chart's wording. The model drafts, `check:copy` and `check:voice` run over the strings, and an author reads. It must never draft a line the guide says to a child in the moment without the author reading it, and it never drafts the consent notice, which is a lawyer's.

Marks: runs on a frontier model through our server; leaves class 2 content only; C1; new.

#### S5. Translating a lesson

New. [notation.md](notation.md) leaves open how translations are stored, and the flow does not need that settled to be specified. The model translates the strings of a lesson and its items (`title`, `ask`, `say`, `hint`, `goal`, `grown-ups`) and nothing else; the checker proves every placeholder, role and anchor reference survived; the verifier re-runs, since a longer sentence can no longer fit its scene; the print check re-runs; and a native-speaking author reads every line, because the register for a five-year-old does not survive a machine. Plural forms come from the roles' nouns, which the template language already handles for translation.

Marks: runs on a frontier model through our server, as a job per lesson; leaves class 2 content only; C4; new.

#### S6. A request for a drawing

New, and it is the only entry about art. No model draws. What a model can write is the brief for a drawing the shelf lacks: which lesson ideas from the pairings in [gaps.md](gaps.md) and the ranked list in [audit.md](audit.md) it would unlock, the size in squares, the anchors, the settings and their ranges, the subjects it would carry, and the bar in [shelf.md](shelf.md) it has to clear. The brief is a ticket for the person who draws. It must never ask for a photograph of anything, never for a person drawn other than by the kit, and never for a drawing whose only use is one family's request, which is answered with the shelf.

Marks: runs on a frontier model through our server; leaves class 2 content only; C1; new.

#### S7. The repair loop

Exists, unchanged: generate, parse, check, verify or prove, feed the errors back with their line and column, at most five times, and nothing partial exists as a state. The prototype's `generate` in `gate.ts` is the loop, and the scripted writer's first attempt at "harder bonds" fails it on purpose.

Marks: as the flow it serves; C3; exists.

#### S8. A lesson for a slot in the curriculum

New for the author, decided for the parent as P14. The forty lessons beyond maths and the tracks' scope and sequence are slots with a description and a grade, and the shelf's unused drawings are the palette. A job drafts a lesson per slot from the drawings that exist, in the lesson's format, gates it, and queues it with the difficulty measure and the print check's page count. An author reads the prose and the teaching, and the same job can be run against a track's open slots in one evening. It must never invent a drawing, and a slot no drawing serves produces S6 instead of a lesson.

Marks: runs on a frontier model through our server, as a job; leaves class 2 content only; C3 per lesson; new.

#### S9. Sentence frames per skill

Decided as a core change, and a drafting flow. A skill needs a small set of authored sentence frames so that generated practice has authored words; the model drafts candidates from the items the skill already has, and an author keeps the ones that read well at the grade. Once frames exist, every generated question is new numbers in old words, which is the limit this document chose.

Marks: runs on a frontier model through our server; leaves class 2 content only; C1; decided.

#### S10. A game for a mechanic

Restates the author's half of "A mini game": the same declaration, the same prover, and a play-through by a person before it is content for everyone. An author can also ask for the versions of an activity that the prover found hardest, which is a read of the prover's report and no model.

Marks: as P16; decided.

#### S11. A world's identity and its lines

New. [worlds-next.md](worlds-next.md) ranks candidate worlds on six criteria and gives each an identity table (light, weather, ground, way, horizon, landmark, creatures, guide, moment, rare sight), and [story.md](story.md) holds every line to eight words in the second person about the place. A model can draft a candidate's table and its lines against those rules, and the uniqueness test in `test/world.test.ts` refuses a world that shares a ground, a path, a light, a gate, a moment or a rare sight with another. An author reads it, and the person who draws builds it. It must never draft a line in the first person, never a line about the child, and never a world that borrows a real culture, which the sixth criterion scores.

Marks: runs on a frontier model through our server; leaves class 2 content only; C1; new.

#### S12. Reviewing a family's content for the catalogue

New, and minor. Whether a family's own question or game ever reaches the catalogue is open. If it does, the reviewer is a person, and what a model can do is summarise what the item asks, which skill it claims, how its versions differ and what the verifier held, so that the reviewer reads one paragraph before the notation. The family's request text is not in the summary, since it may name their child.

Marks: runs on a frontier model through our server; leaves class 2, the item's notation only; C1; new, behind the open question.

#### S13. Motion and description for a new drawing

New, and minor. A new drawing declares its small movement from a closed vocabulary ([animation.md](animation.md)) and its `describe()` sentence for a screen reader, which never gives an answer away. A model drafts both from the drawing's settings and the tests hold them: the reading rule refuses motion on anything read, and the description is read by an author.

Marks: runs on a frontier model through our server; leaves class 2 content only; C1; new.

#### S14. The tests that prove a generated thing

Restated as one list, since every entry above names some of them. A generated question or lesson is proved by parse, check and the verifier, which build every variant or a seeded sample of four hundred, evaluate every answer, fit every scene, fill every container and refuse a rule that fires on a correct answer; by the print check, which holds a lesson to as many pages as it lays out sheets; and by the two guards over strings, `check:copy` for the em-dash and `check:voice` for the guide's persona. A generated hint is proved by the warning that its filled-in text does not contain the answer, once that warning exists. A generated activity is proved by the prover's five clauses and then by a person's play-through. A generated plan is proved by `checkPlan`. A generated record or explanation is proved by the grounding check, which extracts every numeral and finds it in a computed fact, and by the forbidden-word list. A generated translation is proved by the checker over its placeholders and by the verifier and print check re-run. A generated world is proved by the uniqueness test and the eight-word rule. The prompt itself is proved by `audit` in `envelope.ts`, which finds any withheld field or known name. What none of them proves is whether the thing is well taught, kind, or the right thing for today, and every surface that shows a verdict says so.

Marks: none; these run on nothing but our own code; exists in part, with `check:copy`, `check:voice` and the hint warning still to write at the root.

#### S15. Reading the audit

New, and minor. The corpus numbers are computed by scripts; what a model adds is the ranked reading of them, in the shape [audit.md](audit.md) already has, for an author to argue with. Nothing it writes is content.

Marks: runs on a frontier model through our server; leaves class 2 content only; C1; new.

#### S16. The unmatched answers, across families

New, and it needs a decision. P8 handles one family's unmatched answer at that family's desk. Across families, the same wrong number on the same item is the strongest evidence we could have that a rule is missing, and a job that collected, per item, the unmatched numbers with their counts and nothing else, drafted rules for the most common, verified them and queued them for an author, would improve the catalogue for everyone. "What the model sees" forbids any other family's data in a prompt, and this job's prompt would hold no family's data, only an item id and a list of numbers with counts; whether that is cross-family data in the sense the rule means is decision 6. If it is, the job runs over our own test families and the pilot's items and no further.

Marks: runs on a frontier model through our server, as a job; leaves class 2, an item id and numbers with counts; C4; new, behind a decision.

## What exists, what is decided, and what is new

Added 15 September 2026. The list above has sixty-three entries: twenty-eight for the parent, nineteen for the child and sixteen for the studio. Counted by where they run:

| | Parent | Child | Studio | All |
|---|---|---|---|---|
| A frontier model through our server | 20 | 0 | 15 | 35 |
| Our own model | 0 in the first release; P9 and P10 if ever | 0 | 0 | 0 |
| The device's own voice or recogniser, no language model | 1 (P7) | 3 (K8, K16, K18) | 0 | 4 |
| No model: deterministic code, or refused | 7 | 16 | 1 | 24 |

Five of the parent's entries (P2, P3, P13, P15 and P22) have a deterministic half and a model's half, and the table counts each by its model's half. The child's column is the point of the table: nineteen entries and no language model in any of them, which is what the decision at the top of this document means in practice.

What exists. The child's four actions, the wrong-answer path, the router with its closed set, the envelope with its allowed and withheld fields, the gate over the real Workspace with its three verdicts, the repair loop with its cap of five, the log, the plan check and the record check with digit-level grounding, all in `.scratchpad/src/ai/` with tests over the whole corpus, and a page that runs them with a scripted writer that says it is scripted. At the root, the wrong-answer path and the hint policy are built into the lesson (`school/lessons.ts`), the pack carries hint ladders, feedback rules and three levels, and `boundaries.ts` declares `school/assistant` with its reach, but the directory does not exist and no model is called anywhere; `.env.example` has no key for one. The guards that exist at the root are `check:kids-build`, which refuses any adult route in the children's chunks, `check:boundaries`, `check:db` and `check:suppressions`. Three guards this document names, `check:prompt`, `check:voice` and the extension of `check:privacy`, do not exist, and neither does `check:copy` at the root.

What is decided and unbuilt. Hint ladders and rules at author time (S1); extra practice outside the ranges (P15); the plan from a goal (P1); records drafting (P20); custom lessons (P14); new items from parts and frames (P27 and S9); generated games with the child's builder after them (P16, K11); the extra set (K10); the speech conditions (K18); reading aloud (P7, K8); tier two, behind a switch, with evidence first. The surfaces several of these need are also unbuilt at the root: the grown-ups' app today is the family page, sign-in and adding a child with consent, and the week, the journal, marking, the records and the export are named on that page as coming.

What is new. On the parent's side: catching up by asking (P3), explaining a method (P6), the follow-up on the decision card (P13), a story for a world (P17), the handover page's paragraph (P18), the export's cover (P21), onboarding with a placement sheet first (P22), the calendar by asking (P23), a tutor's questions (P24), asking about the product (P25), and a setting by asking (P26); and the choice of a level as a setting without a model (P2). On the child's side: a sentence read back and a spelling from the list (K16), and the stroke-by-stroke drawing guide (K14), neither of which is AI. In the studio: levels and variants (S2), the standards check (S3), notes and the words for the table (S4), translation (S5), drawing briefs (S6), lessons for slots (S8), a world's identity (S11), the catalogue review summary (S12), motion and description (S13), reading the audit (S15), and the unmatched answers across families (S16).

What the walk changed in the design, in three sentences. The property "every word a child reads was written by a person" is, on the parent's side, "written or read and accepted by a person in the child's family", which [authoring.md](authoring.md) already assumes for the sentence start and this document now says in one place (decision 1). The privacy classes make one rule out of several: a child's typed sentence, drawing, photographed sheet or voice reaches a provider's model in no flow, and reaches our own only after a decision. And the deterministic prose on the parent's pages (the one sentence, the letter, the decision card's reason, the morning's order) stays deterministic, with the model answering the follow-up rather than writing the first sentence, because a template is truthful for free and a sentence is not.

## Architecture

### Where each piece runs

```
author's desk  ─ generate notation ─→ check ─→ verify or prove ─→ content in the tree ─→ pack
parent's desk  ─ request ─→ our API ─→ model ─→ notation, or a plan, or prose
                                        └─→ check ─→ verify or prove ─→ (play it) ─→ family content ─→ pack
child's device ─ pack only. deterministic policy over hints, rules, anchors, siblings, variants,
                 and the proved versions a builder offers. no model, no outside host,
                 no author time code.
```

The gate sits in exactly one place in every flow: between what a model wrote and anything becoming content. For a question and a lesson it is the same `Workspace` the editor, the tests and the build use, so there is no second implementation of correctness to keep in step: a generated file is added to the workspace, the workspace reports its issues, and content with any error is discarded rather than repaired by hand later. For an activity it is the prover in [activities.md](activities.md), which is a build gate in the same place, and a generated activity additionally has to be played by the parent before it is content, because the prover's promise is about play and not about worth.

The child's device cannot run either gate, because `features/authoring` is author time code and `apps/kids` may not contain it, which `check:runtime` enforces. That is a constraint rather than a preference, and it is what pushes all generation upstream of the pack.

### What the model sees

One assembler builds the prompt from a declared list of fields, and it is the only path from the evidence store to a model. What may be in it:

- The grade, and the skill graph state as skill to secure, growing or revisit.
- Which lessons are done, which items were attempted, and the answers given, as numbers.
- The item, lesson or activity under discussion, as its canonical notation.
- The vocabulary: the node types, their settings and the parts that exist.
- For a game, the mechanics that exist with their declared settings, and the thresholds they impose.
- The parent's request, and the time and days they said they have.

What may never be in it:

- The child's name, date of birth or exact age. The prompt carries a grade and a token, and the client fills the name in locally when it renders.
- A photo, a voice recording, or anything derived from either.
- Anything a child typed or said, of which there is none by construction.
- Location beyond a country, the school, any device identifier, the family's contact details.
- Anything a parent wrote about a child's health, diagnosis or behaviour, which we hold separately if we hold it at all and never send.
- Any other family's data. There is no cross family evidence in any prompt, so nothing a model writes for one family can carry another family's child in it.

A parent's free text can name their child even when no field does, so the assembler strips the family's known child names from it before it leaves, and the parent is told that is happening. This is imperfect and we should say so: a nickname we do not know will pass through.

### The repair loop

Generation is a loop, as [notation-vs-json.md](notation-vs-json.md) describes: generate, parse, check, verify, feed the errors back with their line and column, repeat. The loop is capped at five attempts, after which the request fails, the parent sees the errors in plain language, and nothing is shipped. A partially verified file does not exist as a state: either the report has no errors and it becomes content, or it is discarded.

We do not use constrained generation today. The notation is not JSON, so a JSON schema cannot be handed to a model as a grammar, and the class of errors it would remove is the syntax class the checker already catches in one round.

A game's failures come back in a different shape, and the loop only converges if they come back as something a model can act on. The verifier's messages say what is wrong at a line and a column; the prover's say that a version cannot be won inside its move budget, that a position has no route to a win, that random play wins more often than the threshold allows, that a position offers more moves than the branching cap, or that the search hit the position cap. Each of those has a mechanical direction to move in, and the feedback should say it: narrow a range, raise the budget, add an object, take one away, shrink the tray. The cap on attempts is the same five, and the failure is the same failure, which is that nothing ships.

## The safety design, as properties

Each of these is a property of the system rather than a rule someone follows, and each has a way to be enforced and a way to be tested. The ones marked as needing work are not true yet.

1. No model is reachable from a child's device. Enforced by `check:privacy`, which already forbids outside hosts and third party code in the kids build, and by the pack being the only content path. The one request the child's build makes is posting evidence to our own API, and nothing in its response can become something a child reads. Tested by the guard.
2. Every string a child sees was written by a person or is a number. Enforced by the child pipeline returning material identifiers rather than strings, and by the renderer resolving those identifiers against authored content. Tested over the whole corpus: for every item and every action, every string in the result is one of that item's authored strings.
3. A drawing a child sees was composed from declared parts and passed layout and capacity. Enforced by instantiation and layout being the only route to a drawing. Tested by the existing verifier tests.
4. A question a child sees has an answer that evaluates, in a scene that fits, with no feedback rule that also fires on the correct answer. Enforced by the verifier as a build gate. Already true.
5. The channel from a child carries an enum, not language. Enforced by there being no text input in the child app. Tested by the router rejecting anything outside the closed set.
6. Nothing the model writes becomes content without passing the gate. Enforced by one assembler and one gate function, with content created only from a report with no errors. Tested by feeding the gate a file that fails and asserting nothing is returned.
7. No field outside the declared list can enter a prompt. Needs a `check:prompt` guard so that the assembler is the only reader of the evidence store and its field list is one place. Tested by asserting the envelope for a fully populated record contains no denied field.
8. The guide has no persona beyond pointing and lighting. Needs a `check:voice` guard over child facing `say` and `hint` text. Testable the way `check:copy` is.
9. Generated content is attributable. Needs provenance in the pack, so a page can show who made a question and a parent can delete it.
10. Turning AI off leaves a working product. Enforced by the paper path and by the pack holding everything a lesson needs. Tested by running the child pipeline with no model and asserting the same decisions for every case a rule covers.
11. A game a child reaches was proved playable, and every setup a builder offers was in the proved set. Enforced by the prover as a build gate, and by the builder's rows being the activity's own parameters and roles rather than a second list. Tested the way [activities.md](activities.md) tests the runtime's move list: the options come from the proved versions or they do not exist.
12. A generated activity cannot set its own pass mark. Enforced by the thresholds coming from the mechanic and by the gate rejecting a declaration that loosens them. Needs the open question in [activities.md](activities.md) about where the caps live to settle on the mechanic.
13. No generated art. Every drawing in anything a model writes is a part from the index, because the vocabulary is assembled from that index and a name that is not a part fails the check. Already true, and it is what keeps a generated game looking like the product.

Added 15 September 2026: the list of workflows keeps the thirteen properties above and adds seven, each stated the same way, as a property with a way to enforce it and a way to test it.

14. A child's own production never reaches a provider's model. A typed sentence, a stroke, a painting, a photograph of a sheet and a recording are class 3, and no workflow sends them to a third party; a workflow that reads them runs on a model we host or does not exist. Enforced by the envelope's field list, which has no field for any of them, and by `check:prompt` once it exists. Tested by `audit` over a record that holds every answer kind, asserting that `drawing`, `painting`, `performance`, `program` and `word` answers never enter an envelope.
15. Words a child reads that a model drafted were read and accepted by a person in the child's family, and the page says who made them. Enforced by provenance in the pack and by the acceptance being the only path from a draft to a `content-verified` event with no errors. Tested by asserting that a draft with no acceptance is never in a pack a child's view is served.
16. A model changes nothing about a child's day without a person's confirmation recorded as an event. A plan operation, a setting, a level or a track proposed by a model is applied only when a parent confirms it, and the event carries the parent as actor. Enforced by the routes: no route a model's output reaches appends a `plan-changed` event on its own. Tested by the route table, sending a model's proposal to every route and asserting no event is written.
17. Every number in prose a model wrote for a parent is a number the record computed. Enforced by the grounding check, which is one function over every prose-writing flow (P12, P13, P18, P20, P21). Tested by the record check's existing tests, extended to each flow's facts.
18. The deterministic sentence on a parent's page is never replaced by a model's. The one thing to look at, the decision card's reason, the letter and the morning's order are templates over the record, and a model answers a follow-up beside them. Enforced by those pages not calling the assistant for their first sentence. Tested by rendering each page with the assistant unavailable and asserting the sentence is unchanged.
19. A job over the corpus reads content and no family's evidence, with one named exception (S16) that carries an item id and numbers with counts and no family id, behind decision 6. Enforced by jobs building their prompts from the content table with `family_id` null. Tested by asserting a job's envelope has empty evidence fields.
20. A voice on a child's device reads authored text only. Enforced by the narration reading the pack's strings and the fixed lines and nothing else. Tested over the corpus the way property 2 is tested: every string handed to the voice is one of the item's authored strings or a fixed line.

## Privacy, logging and the amended rule

The amended COPPA rule is in force, and the parts of it that bear on this design are, as we read them: a child's account exists under a parent's; disclosing a child's personal information to a third party for a purpose that is not integral to the service needs separate verifiable parental consent; personal information now includes biometric identifiers such as a voiceprint or a facial template; we need a written retention policy, may not keep a child's data indefinitely, and may keep it only as long as the purpose we collected it for needs; we need a written security programme; and we may not condition a child's participation on collecting more than is reasonably necessary. This reading needs a lawyer's confirmation before launch, and the design below is deliberately conservative so that the confirmation is unlikely to change it.

How each piece of the design lands against that:

Third party disclosure. A model provider is a third party. We do not send a child's personal information to one: the prompt carries a grade, a skill state, item ids and numbers, with no name, no age in years, no identifier, and no free text a child wrote. Where that is not enough for a flow, the flow does not ship. We also require of a provider that our data is not trained on and is not retained, which is a contract term rather than a property of our system, and we should say which it is.

Minimisation. The declared field list is the minimisation, and it is in code rather than in a policy. A field that is not in the list cannot reach a model even by accident, which is the point of property 7.

Retention. The event log for a child is kept for the school year and for as long as the family's record keeping needs, and is deletable before that. Prompts and responses for parent flows are kept thirty days for debugging and then deleted. Generated content is kept while the family uses it, because it is theirs. Nothing is kept indefinitely and nothing is kept for a purpose we did not collect it for.

Deletion. A parent can delete generated content, in which case the lessons that used it fall back to the catalogue; a child's event log; and the child. Deletion propagates to the prompt and response log. Two things we cannot delete, and should say so plainly: whatever a provider saw before a zero retention term took effect, and a sheet that has been printed.

Voice and images. Out by default, for the reasons in the speech section. A voiceprint is never computed.

Notice. The direct notice says what we send to a model provider, which provider, and for what, and the parent flows say it again at the point of use, because a parent deciding whether to press a button should not have to remember a notice they read at signup.

## Cost, latency and no network

The child's surface in tier one makes no model call, so its marginal cost is zero, its latency is the frame it renders in, and it behaves the same with the network off. This is worth saying to a family rather than treating as an implementation detail.

The parent's flows cost one call for a plan, one call plus verification for extra practice, and up to five calls for a custom lesson that needs repair. Verification is fast, since the verifier samples 400 variants above ten thousand, so the gate is not the slow part. We have not measured any of this against a real model, so the numbers to set are a per family monthly budget, a cap that the parent can see, and a per request timeout after which we say we could not do it rather than waiting.

With no network at all, a child's lesson is unaffected, printing is unaffected, the plan and the map are unaffected, and the parent's authoring is unavailable with a line saying so. AI has to be optional because the product works on paper, and in this design it is optional by construction rather than by a setting.

## Failure modes

The gate rejects everything the model wrote. The request fails after five attempts, the parent sees the errors in plain language, and nothing reaches a child. This is the expected failure and it is safe.

The gate passes something badly taught. This is the real risk, and [product.md](product.md) names it: if verification passes questions that are correct but badly taught, we have automated the wrong half. Three mitigations, none complete: generated practice defaults to new numbers for an authored item, so the teaching is the author's; a new item shape needs a parent's read; and provenance plus deletion means a bad question can be removed by the person who noticed it. We should also report what the verifier did not check, since a parent reading "verified" will otherwise hear more than we mean.

The deterministic policy picks the wrong hint. The ladder is ordered by the author, so the failure is a hint that is too advanced rather than one that gives the answer away. The fix is content, not code.

The model is slow or unavailable. Parent flows degrade to the catalogue and say so. Child flows are unaffected.

Model output does not validate. In tier two an invalid identifier is ignored and the deterministic policy answers instead, and the event is counted. If the invalid rate crosses a threshold for a family, the feature turns itself off and tells them.

A parent asks for something outside the product. Medical, legal or behavioural advice, content for a child who is not theirs, or a diagnosis. The router refuses with a fixed line and points at a person. This is a routing decision made before any model is called, not a judgement the model makes.

A safeguarding shaped signal. There is no channel from a child that could carry a disclosure, because there is no free text and no speech, so the honest statement is that we would not see one. We do not run a classifier over a child's language, because there is none, and we do not build the channel in order to be able to monitor it. If a parent writes something of that kind in a note, it is a person's job and not a feature.

Prompt injection. The only untrusted text in any prompt is what a parent typed. In tier one a model's output reaches the parent who typed it, or the gate, and never a child, so the blast radius is the parent's own screen. In tier two the output is an identifier validated against the pack, so an injected instruction has nothing to act on.

Cost runaway. A per family budget and a visible cap, and the cap refuses rather than degrades quietly.

Vocabulary drift. A model writes against a version of the vocabulary, and a pack version an app does not understand is refused rather than drawn wrongly, which is already an open decision in [structure.md](structure.md).

## What we will not build

This list is a product feature, and it should appear in the product's own words on the site, not only here.

- No chat interface for a child, at any age in our range. No text input from a child to a model, ever.
- No free model text shown to a child. Every word a child reads is a person's.
- No microphone by default, no audio retained, no voiceprint, no image of a child.
- No persona with a name, a backstory, feelings, memory in its own voice, or affection. Nothing that invites a child to form a relationship with the guide.
- No engagement machinery: no notifications to a child, no streaks for the guide to celebrate, no reason for a child to be on the product longer than the lesson.
- No hidden adaptation. Every decision that changes what a child sees is visible on the parent's page and reversible there.
- No diagnosis, no clinical language, no age equivalent scores, no comparison against other families' children.
- No cross family data in a prompt, no training on family data, no third party SDK in the child's build.
- No AI marking of work that is a judgement. Where the answer is a written sentence or a formed letter, the grown-up is the marker and the page says so.
- No help with a photographed worksheet from somewhere else, because it would need free generation with nothing to verify against.
- No AI written content shipped to another family without a person reviewing it, which for a game means playing it.
- No game a child described in words, and no text box anywhere in a builder. A child chooses among options that were proved; they do not ask for a game.
- No generated drawing. A game and a question are composed from the art that exists, and a request for art we do not have is refused rather than filled.
- No generated game that is a worksheet with a timer, which [activities.md](activities.md) rules out for the whole product and which a model asked for "something fun" will propose first.
- No child sharing a game with anyone, inside the product or outside it.

Added 15 September 2026, from the walk of the surfaces:

- No reading of a photographed sheet as marking, which [parents.md](parents.md) already rules out. A photograph goes in the portfolio, and a pre-filled mark column a parent confirms is decision 4, on our own model or not at all.
- No model in the paint tool or the drawing pad, and no drawing of a child's sent anywhere to be read. Help with drawing is the shelf's own strokes replayed.
- No model on the child's map or roll: a place is described by its author, and what happens next is the closed sheet and the next horizon.
- No model-written first sentence on a parent's page. The one thing to look at, the decision card's reason, the letter and the morning's order are templates over the record.
- No agent that changes a plan, a setting or a level without a parent confirming each change.
- No product help on the site, because the site collects nothing; the help desk is in the app and answers about the product, never about a child.
- No answer from a tutor's model request about any child but their one, and no generation by a tutor.
- No model-drafted consent notice, direct notice or retention policy. Those are a lawyer's words.
- No model call from a job while a person waits, and no job that reads a family's evidence.
- No "AI" as a persona on the parent's side either. The parent's desk is a form and a verdict, not a character, and nothing on it invites a parent to chat.

## Core changes this needs

Specified rather than made, since they sit in modules this work does not own.

- A hint ladder. Items carry at most one hint today and none carries two, so `hint` needs to be ordered and the renderer needs to show one rung at a time. This is the largest content change in the document and the one that makes the child's surface worth having.
- More recognised mistakes. 24 of 132 items recognise none. Model written `when` rules are provable content, because the verifier already rejects a rule that also fires on the correct answer, so this is the first generation flow to build.
- Sentence frames per skill, so generated practice has authored words to use.
- An ordering of items within a skill, so that "easier first" has something better than catalogue order to choose by. Items already carry `stars` for puzzles, which may be enough.
- Provenance in the pack: who authored an item, a lesson or an activity, and family scoping so a family's own content is theirs.
- An `evidence` feature. [structure.md](structure.md) leaves it open whether evidence is its own folder; [parents.md](parents.md) argues for it on the strength of the roll-ups, and the AI log is more rows in the same store.
- Three guards: `check:prompt` for the field list, `check:voice` for child facing strings, and an extension of `check:privacy` to say that tier two may talk to our own API and nothing else.
- The answer model, which [product.md](product.md) already names as the next core work, and which [activities.md](activities.md) reaches again from a third direction. Generated practice is limited to numeric and picked answers until it exists.
- For games: the whole of the activity core in [activities.md](activities.md), and then three things this flow needs on top of it. The thresholds owned by the mechanic rather than by the file, so a generated activity cannot loosen them. A check that a generated activity's paper companion exists and shares a skill. And the prover callable per request with a seeded sample of versions, since a parent waiting for a game cannot wait for a full search.

Added 15 September 2026, from the list:

- `school/assistant/` at the root, which `boundaries.ts` already declares with reach to `pack`, `record/record`, `record/read` and `answer`: the envelope, the router, the gate's client, the log's rows, and the routes under `/api/assist/*` that only an adult session with the authoring capability reaches. `record/read` does not exist yet either.
- One assembler for every prose flow, with the grounding check as one function over P12, P13, P18, P20 and P21, and `check:prompt` over the assembler's field list.
- `check:copy` and `check:voice` at the root, since neither exists there today; the scratchpad's copy check does not cover the root's strings.
- The audit's hint warning, that a rung's filled-in text contains the answer, without which S1 has no gate for a rung that gives the answer away.
- A `draws` slot on a mechanic and `handles(position)` as declared data, which [games.md](games.md) and [engine.md](engine.md) ask for and without which a generated game cannot choose its board or be dragged.
- The records screen and the export, named as coming on the family page, which P20 and P21 write into.
- A per-track placement sheet, which is content and not code: a handful of proved items across the grade bands per track, for P22.
- The route for a tutor's reach on assistant requests, if decision 5 allows them, computed the way every other tutor request is.
- A stroke-replay for a shelf drawing, for K14, which is the ink module reading a stroke file in order and no new drawing.

## Order of work

1. The evidence store and the parent's view of it, with no AI in it at all, because every later step is judged by what shows up there. This is rank 1 in [parents.md](parents.md) and it is the same work, not a second store.
2. Hint ladders and feedback rules for the existing items, written by a model at author time, proved by the verifier and read by an author. This is content work with an AI flow behind it, and it is what makes anything on the child's surface useful.
3. Extra practice outside an item's declared ranges, verified: one call, a mechanical gate, the smallest valuable generation flow. The inside-the-range case is layer one and needs no model.
4. The plan from a goal, over the catalogue that exists, with the order check, once the plan is mutable.
5. Record drafting, with numeric grounding.
6. Custom lessons naming existing items, with the parent's read as the gate.
7. New items from existing parts and authored frames, family scoped.
8. Generated games, after the activity core and the first three mechanics exist. Editing a generated game comes with it, since it is the same flow, and the child's builder comes after that because it needs nothing new.
9. Only then, and only with evidence that the deterministic policy chooses badly, tier two behind a parent's switch.

Added 15 September 2026. The nine steps above stand, and the list sorts into two first releases, each with what it needs from the core.

The first release for parents has no model on any child's device and one model behind the parent's desk, and it ships in this order:

1. The evidence store and the parent's view of it (step 1, unchanged), with the records screen and the export, since P20 and P21 have nowhere to land without them.
2. The envelope, the router and the gate at the root under `school/assistant/`, with `check:prompt`, so that every later flow is one call through one path.
3. P12 and P13, explaining the evidence and the follow-up on the decision card, which are prose under the grounding check and need no gate on content.
4. P15, extra practice outside the ranges, the smallest generation flow.
5. P1 and P23, the plan from a goal and the calendar by asking, once the plan is mutable.
6. P6, explaining a method, which needs only the lesson.
7. P25, asking about the product.
8. P20 and P21, the records narrative and the export's cover.
9. P8, the unmatched answer, which needs provenance in the pack.
10. P14 and P27, the custom lesson and the question from a sentence, with the parent's read as the gate.
11. P18, the paragraph on the handover page.
12. P22's placement sheet, which is content, with the conversation after it.

P16, P17, P24 and P26 wait: games on the activity core, the world story on decision 1 being settled and the picture-story lesson format existing, tutors on decision 5, and settings by asking on somebody asking for it. From the core this release needs the evidence store, the mutable plan, provenance in the pack, the verifier as a service, the records screen, the grounding function, the three guards, and a per-family budget with a visible cap.

The first release for children has no model in it, and it is mostly content:

1. S1, the hint ladders and rules over the whole corpus, since the child's surface is only as good as the shelf it chooses from.
2. The four actions and the wrong-answer path at the root over the pack, which the root's lesson already half does.
3. K8, reading aloud with the device's voice over authored text.
4. K10, the extra set, with its cap wired.
5. K16's read-back and word list, and K14's stroke replay, neither of which is AI.
6. The `describe()` sentences for the map's places (K13, S13).

K11, the builder, waits on the activity core, and K18, speech, is not in it, for the reasons in "Speech, if we ever add it". From the core this release needs the ordered `hint` with one rung shown at a time, the hint warning in the verifier, `check:voice`, `narrate` wired to the device's voice, the extra draws in the pack read by the lesson, and nothing else, which is the sentence we should say to a family.

In the studio, S1, S2 and S4 come first, because they raise the corpus the two releases stand on, and S5, S6, S8 and S11 follow as jobs an author runs when a track or a world is being built. S3, S12, S15 and S16 are last, and S16 is behind a decision.

## Decisions for the owner

Added 15 September 2026. Each is a sentence to answer, with our recommendation after it. The open questions below stay open; these are the ones the list cannot proceed without.

1. Does a word a model drafted and a parent read and accepted count as a word a person wrote, for a child in that family? The custom lesson flow above already has the parent read the prose and accept it as family content, and [authoring.md](authoring.md) assumes the same for the sentence start, so this confirms a reading the document already made rather than changing a decision; the custom lesson (P14), the question from a sentence (P27) and the story for a world (P17) cannot exist otherwise. We recommend yes, with three conditions: the page and the grown-ups sheet say who made it, the content is scoped to the family and reaches the catalogue only through our review, and the parent's acceptance is the event that makes it content, so that property 15 is testable.
2. Where do the parent's flows run: a frontier provider through our own server, our own hosted model, or a local model for families who want nothing to leave? We recommend a frontier provider for every class 2 flow in the first release, under written terms of no retention and no training, named in the direct notice, with our own model deferred until a class 3 flow is worth building and a local model not supported, since a parent's laptop cannot run the gate anyway.
3. May a child's typed sentence, drawing or painting ever be read by a model? We recommend not by a provider's model in any flow, which the privacy classes make a rule, and not by our own model in either first release; the grown-up is the marker, and the P9 variant is revisited when we host a model and have measured how often a `look-for` reading agrees with a parent's.
4. Does the photographed sheet stay refused, or does a pre-filled mark column the parent confirms mark by mark become allowed on our own model? We recommend it stays refused for the first release, that the portfolio photograph is built without any reading, and that the pre-fill is measured against a hundred real sheets before it is argued about again.
5. May a tutor ask the explain flows (P12, P18) about their one child, charged to the family and logged with the tutor as actor, given that tutors cannot generate? We recommend yes for those two and nothing else, since a tutor who cannot ask why a mistake keeps happening is a tutor with the sheets and no help, and the reach is already computed per request.
6. Is a job that reads, per item, the unmatched numbers with counts across every family, and no family id, cross-family data in the sense "What the model sees" forbids? We recommend treating it as corpus data and allowing it, because nothing in it can identify a family or a child, and writing that reading into the rule so that it is not widened by analogy later.
7. Is the deterministic prose on the parent's pages kept deterministic, with the model answering follow-ups only? We recommend yes, and property 18 says it as a rule.
8. Is the per-family monthly budget a number in the subscription with a visible cap, or metered? We recommend included with a cap that refuses rather than degrades, and no number until a month of a real family's use has been measured; the cap is what makes cost runaway a refusal rather than a bill.
9. Is the placement at onboarding a printed sheet first and a conversation second? We recommend the sheet first, because it is content, it works on paper, and its marks are evidence in the same store as everything else.
10. Does the child-facing sign that a grown-up can see their pages come back, given that the parent's side now includes model-written explanations of a child's evidence? This is question 13 on the lawyer's list, and we recommend answering it before P12 ships, since an explanation of a child's mistakes is closer to the code's sense of monitoring than a chart is.
11. Is the difficulty measure a gate for a generated level or a label on it? We recommend a label, with an author's read as the gate, until the measure has been checked against enough authored items to be trusted.
12. Does `narrate` use the browser's own voice, or a voice from a service? We recommend the browser's voice for both first releases, because a service is a host, and the choice is [sound.md](sound.md)'s to make with the second-language strand.
13. Are prompts and responses for parent flows kept thirty days for debugging, as "Privacy, logging and the amended rule" says, or not kept at all once the gate has answered? We recommend thirty days for the flows that write content, so that a bad question can be traced to the request that made it, and no retention for P6, P25 and P26, which write nothing.

## Open questions

- Whether a parent will accept "there is no model on your child's device" as an answer, or whether the absence reads as a missing feature. This is a question for a family rather than for us.
- How often the deterministic policy picks the wrong material. Until we measure it, tier two has no case.
- Whether a family's own generated content should ever flow back into the catalogue, and what review that would need.
- Where the model runs for parent flows: a hosted provider by default, and whether a local model is worth supporting for families who want nothing to leave.
- How a record's requirements are represented, given that they differ by state and we have decided not to advise on them.
- What a generated game costs to prove while a parent waits, which depends on numbers [activities.md](activities.md) has not measured either. If a sample of versions is too slow, the flow becomes a request that finishes later rather than one a parent watches.
- Whether a parent's play through can ever be skipped, for instance on an edit that only changes which props appear. We think not, because the props are what a child reads, but it is the rule most likely to be argued with.
- Whether a child's builder needs its choices authored per activity, or whether the parameters and roles an activity already declares are the right rows without anyone choosing. The second is cheaper and may produce rows that make no sense to a child.

## Prototype

`scratchpad/assistant.html` runs both surfaces with a stubbed model and a real pipeline. The model's choices are scripted rather than inferred, and the page says so; everything the choices pass through is the real thing. The child's side resolves material out of the real workspace, points at anchors resolved from the real instantiated scene, and draws with the same renderer the lessons use. The parent's side runs generated notation through the same `Workspace` the tests use and shows the verifier's actual messages, including for a version it rejects and one it holds. `src/ai/` holds the pipeline as pure code with tests, and the page holds nothing that decides anything.

The game flows are specified here and not prototyped, because there is no activity node type, no mechanic and no prover yet: the first three items of the order of work in [activities.md](activities.md) come before anything in this document can call them. What the prototype does show that carries straight over is the shape those flows need, which is a model proposing a declaration, a real gate accepting or rejecting it with its own messages, a repair loop that feeds those messages back, and a verdict a parent reads before anything becomes content.
