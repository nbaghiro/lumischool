// The words on the guide's asks (tutor.tsx), in the imperative, apart from the card so the guard
// over the guide's voice (tools/scripts/check-voice.ts) can read them without a page.

/** What a child can ask the guide for. `read` is the speaker on a line; `next` is the map's only ask. */
export type GuideAsk = "read" | "show" | "where" | "easier" | "grown-up" | "next";

export const ASK_WORDS: Record<GuideAsk, string> = {
    read: "Read it",
    show: "Show me",
    where: "Where?",
    easier: "Easier first",
    "grown-up": "Ask a grown-up",
    next: "Where next?",
};
