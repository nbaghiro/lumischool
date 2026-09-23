// What a parent is told about a child's data, where the app shows it. The notice a parent consents to
// when adding a kid is a lawyer's to write against COPPA 312.4(c) (.docs/auth.md, "What the parent
// consents to"); until then this is a draft that says what the design has to say, in its words.

/**
 * The notice's version. The server refuses consent to any other, so this and `CONSENT_NOTICE` in
 * server/db/events.ts move together, which a server test holds.
 */
export const NOTICE_VERSION = "2026-09-weekly";

/** The notice, a paragraph a line, shown beside the add-a-kid form. */
export const NOTICE: readonly string[] = [
    "When a parent opens a children's view for this child, it records their answers, the drawings and marks a question asks for, the hints they open, the games they play, and how long each question took on screen.",
    "It sends those to us. We never send your child's name or work to a model provider. If you explicitly enable detailed weekly emails, we send your child's name and learning summary through Resend to your email provider. You can choose a private link instead, or stop weekly emails at any time.",
    "We keep them while your family's account is open, and delete them after it closes. The period is still to be set; this notice is a draft.",
    "You can see all of it, export it, withdraw your consent and delete your child's record at any time.",
];

/** What the add-a-kid form asks for, and nothing more: no surname, birth date, school, photo or gender. */
export const KID_FIELDS = {
    name: "What your family calls them. A nickname is fine.",
    grade: "The grade their year is drawn for.",
} as const;

/** The grades there are lessons for. */
export const GRADES: readonly number[] = [1, 2, 3, 4];
