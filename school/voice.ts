// The rules on what the world's guide may say (.docs/ai.md, "The guide"), as a check over a line:
// no first person about itself, no name of its own beyond "the firefly", no relational vocabulary,
// no exclamation mark and no em-dash. A question's own words are held to the marks only, since a
// lesson about the word I or the exclamation mark names them. tools/scripts/check-voice.ts runs it
// over every line the guide can say, and each app's own lines are held to it in their tests.

/** Why a line is refused. */
export type Breach = "first-person" | "a-name" | "relational" | "exclamation" | "em-dash";

/** The guides' names, which the guide never uses as its own (engine/parts/guide/*). */
const NAMES = ["Firefly", "Glow", "Hand", "Pencil stub", "Paper bird", "Snail", "Dot"];

const SENTENCE_START = String.raw`(?:^|[.?!]\s+)`;
/** The guide speaking as itself: a first person pronoun opening a sentence, or one of the phrases about its own mind. */
const FIRST = new RegExp(
    String.raw`${SENTENCE_START}(?:I|I'm|I've|Me|My|Mine)\b|\bI (?:am|think|like|love|want|feel|know|remember|hope|wish)\b`,
);
const NAME = new RegExp(String.raw`\b[Tt]he (?:${NAMES.join("|")})\b(?! (?:is|says|points))`);
const RELATIONAL =
    /\b(?:my friend|your friend|love you|miss you|missed you|proud of you|well done you|best friend)\b/i;
/** An exclamation ending a word, rather than one named on its own, as a lesson on the marks does. */
const EXCLAIM = /\w!/;
const DASH = /—/;

/** The rules a line breaks; `words` says whether it is the guide's own words, held to every rule, or a question's, held to the marks. */
export function breachesOf(line: string, o: { words: boolean }): Breach[] {
    const out: Breach[] = [];
    if (EXCLAIM.test(line)) out.push("exclamation");
    if (DASH.test(line)) out.push("em-dash");
    if (!o.words) return out;
    if (FIRST.test(line)) out.push("first-person");
    if (NAME.test(line)) out.push("a-name");
    if (RELATIONAL.test(line)) out.push("relational");
    return out;
}
