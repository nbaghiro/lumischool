// The invented half of the seed: the family, its grown-ups, the days, the answers, the timings, the
// marks, the tablet and the one question a parent wrote. Everything around it comes from the corpus.
// The names match the household in .docs/data-model.md.

export interface AdultSpec {
    key: string;
    name: string;
    email: string;
}

export interface KidSpec {
    key: string;
    name: string;
    grade: number;
    /** Which subjects this kid works through, in the order the week visits them. */
    subjects: string[];
    /** How many lessons of theirs the seed records work for. */
    lessons: number;
    /** Out of ten answers, how many are right first time. Invented, and different per kid. */
    rightInTen: number;
    /** The parent who prints and, outside any tutor's window, marks this kid's sheets. */
    parent: string;
}

export interface TutorSpec {
    adult: string;
    kid: string;
    from_day: string;
    to_day: string;
    /** When they were removed, if they were. The row stays so their name stays in the history. */
    ended_at?: string;
}

/** A key the seed creates: a grown-up's session, or one kid's key in a children's view a parent opened. */
export interface KeySpec {
    key: string;
    kind: "session" | "shared-session" | "kid-session";
    name: string;
    adult?: string;
    kid?: string;
}

export const FAMILY = { key: "oakley", name: "Oakley", time_zone: "America/New_York" };

/**
 * Two parents on equal rights, the first of whom creates the family, and two tutors: Kate on Maya, and
 * Jo, who tutored Theo for the first fortnight and was then removed, so that a membership with
 * `ended_at` is in the fixture with marks of hers in the log.
 */
export const PARENTS: AdultSpec[] = [
    { key: "naib", name: "Naib", email: "naib@example.com" },
    { key: "sam", name: "Sam", email: "sam@example.com" },
];

export const TUTORS: (AdultSpec & TutorSpec)[] = [
    {
        key: "kate",
        name: "Kate",
        email: "kate@example.com",
        adult: "kate",
        kid: "maya",
        from_day: "2026-09-10",
        to_day: "2026-10-16",
    },
    {
        key: "jo",
        name: "Jo",
        email: "jo@example.com",
        adult: "jo",
        kid: "theo",
        from_day: "2026-08-31",
        to_day: "2026-09-30",
        ended_at: "2026-09-11T18:00:00.000Z",
    },
];

export const KIDS: KidSpec[] = [
    {
        key: "maya",
        name: "Maya",
        grade: 1,
        subjects: ["maths", "reading", "writing"],
        lessons: 9,
        rightInTen: 7,
        parent: "naib",
    },
    {
        key: "theo",
        name: "Theo",
        grade: 3,
        subjects: ["maths", "reading", "coding"],
        lessons: 9,
        rightInTen: 9,
        parent: "sam",
    },
];

/**
 * One children's view on the family's iPad, which Naib opened, with a key per child, and the grown-ups'
 * browsers. Jo's session was deleted when
 * she was removed, and her marks still carry its id, which is why `events.device` has no foreign key.
 */
export const KEYS: KeySpec[] = [
    {
        key: "view-maya",
        kind: "kid-session",
        name: "Safari on an iPad",
        kid: "maya",
        adult: "naib",
    },
    {
        key: "view-theo",
        kind: "kid-session",
        name: "Safari on an iPad",
        kid: "theo",
        adult: "naib",
    },
    { key: "naib-phone", kind: "session", name: "Naib's phone", adult: "naib" },
    { key: "sam-laptop", kind: "session", name: "Sam's laptop", adult: "sam" },
    { key: "kate-on-ipad", kind: "shared-session", name: "Safari on an iPad", adult: "kate" },
];

/** Writers with no key row: Jo's deleted session, and the verifier, which writes as the system. */
export const KEYLESS_WRITERS = { jo: "jo-browser", verifier: "verifier" };

/** The Monday the seeded school year starts on. Fixed, so the fixture is the same every time. */
export const START_DAY = "2026-08-31";

/** Every third sitting is on paper, marked five days later; each kid's last paper sheet stays unmarked. */
export const PAPER_EVERY = 3;
export const PRINTED_DAYS_BEFORE = 1;
export const MARKED_DAYS_AFTER = 5;

/**
 * The question a parent wrote: a real item's text with one range widened. Sam wrote it, so authoring
 * is exercised by the second parent rather than the first.
 */
export const AUTHORED = {
    by: "sam",
    from: "bonds.make-ten",
    name: "oakley.make-ten-to-twenty",
    change: { find: "1..9", replace: "1..19" },
    /** Invented: the verifier came back clean, and nobody has played it because it is not an activity. */
    verdict: { errors: 0, played: null, verifier: "verify@0.1.0" },
};
