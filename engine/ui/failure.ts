// What went wrong, in words a parent reads once and understands. Every code the API answers with has
// its words here, so a new code is a type error until it has them.

import type { Failure } from "./wire";

const later = (seconds: number | undefined): string => {
    if (seconds === undefined || seconds <= 90) return "in a minute";
    if (seconds >= 3000) return "later";
    return `in ${Math.round(seconds / 60)} minutes`;
};

const SOMETHING = "Something went wrong on our side. Please try again in a moment.";

const WORDS: Record<Failure["error"], (f: Failure, local: boolean) => string> = {
    "wrong-code": (f) => {
        const left = f.attemptsLeft;
        const tries =
            left === undefined || left < 1
                ? ""
                : left === 1
                  ? " You have one more try with this code."
                  : ` You have ${left} more tries with this code.`;
        return `That code does not match. Check the email and try again.${tries}`;
    },
    "dead-code": () =>
        "That code has had five wrong tries, so it has stopped working. Ask for a new one.",
    expired: () => "That code has run out. A code works for ten minutes, so ask for a new one.",
    "rate-limited": (f) =>
        `Too many codes have been asked for just now. Please try again ${later(f.retryAfter)}.`,
    "no-pending": () =>
        "This page has lost track of the code it asked for, perhaps because it was opened in another window. Ask for a new one.",
    "bad-email": () => "That does not look like an email address. Check it and try again.",
    "not-found": () => "We could not find that. It may have run out.",
    "fresh-sign-in": () =>
        "This step needs a sign-in from the last ten minutes. Sign in again, then come back.",
    "no-consent": () =>
        "One of the children has no consent recorded, so their view cannot be opened.",
    "notice-changed": () =>
        "The notice changed while this page was open. Read the new one, then tick the box again.",
    "signed-out": () => "You are signed out. Sign in again to carry on.",
    "put-away": () =>
        "A children's view is open on this device. Hold Grown-ups there and type the family PIN to come back.",
    "not-allowed": () => "Only a parent in the family can do that.",
    offline: (_f, local) =>
        local
            ? "The lumischool server is not running on this computer. Start it with npm run dev at the top of the repository."
            : "We could not reach lumischool. Check your connection and try again.",
    origin: () => "This page is not allowed to do that from here. Open it from its own address.",
    "no-kid-session": () => "That children's view has already been closed.",
    "wrong-pin": () => "That PIN is not right.",
    "no-pin": () =>
        "The family PIN has stopped working after too many wrong tries. Set a new one on the family's page.",
    "bad-request": () => SOMETHING,
    "bad-envelope": () => SOMETHING,
    "too-large": () => SOMETHING,
    "not-json": () => SOMETHING,
    server: () => SOMETHING,
};

/** `local` is whether the page is on a developer's computer, where no server may mean none started. */
export const failureText = (f: Failure, local = false): string => WORDS[f.error](f, local);
