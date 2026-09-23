import {
    invitationMail,
    membershipMail,
    NOTICE_MAIL,
    noticeMail,
    signInMail,
    weeklyMail,
} from "./mail-design";
import type { Sent } from "./api";
import type { WeeklyLetter } from "../school/family/letter";

export function mailPreviews(origin: string): Sent[] {
    const letter: WeeklyLetter = {
        from: "2026-09-14",
        to: "2026-09-20",
        generated: "2026-09-21T12:00:00Z",
        useful: true,
        children: [
            {
                id: "fictional",
                name: "Mira",
                sections: [
                    {
                        heading: "This week",
                        text: "Mira explored number bonds, character descriptions and repeating patterns across four days.",
                    },
                    {
                        heading: "A moment to notice",
                        text: "Mira finished a sitting of Number bonds to ten. Open the sheet to see the work and feedback.",
                    },
                    {
                        heading: "Something to revisit",
                        text: "On two days, the lesson recorded this feedback: “Count each step after the starting square.” Open the lesson to review it together.",
                    },
                    {
                        heading: "A little help from you",
                        text: "One paper sitting has no recorded marks yet.",
                    },
                    {
                        heading: "Coming next",
                        text: "Monday: Sharing into equal groups. Wednesday: Describing a character.",
                    },
                ],
            },
        ],
    };
    const stop = `${origin}/letters`;
    const quiet: WeeklyLetter = {
        ...letter,
        useful: false,
        children: [
            {
                id: "quiet",
                name: "Mira",
                sections: [
                    {
                        heading: "This week",
                        text: "No work was recorded for this week. Work done on paper or not yet synced may still be waiting to appear.",
                    },
                ],
            },
        ],
    };
    const many: WeeklyLetter = {
        ...letter,
        children: [
            ...letter.children,
            {
                id: "second",
                name: "Rowan",
                sections: [
                    {
                        heading: "This week",
                        text: "Rowan worked on animal habitats and writing a letter.",
                    },
                    {
                        heading: "A little help from you",
                        text: "One paper sitting has no recorded marks yet.",
                    },
                ],
            },
        ],
    };
    return [
        signInMail("1234 5678", origin),
        ...Object.keys(NOTICE_MAIL)
            .filter((k): k is keyof typeof NOTICE_MAIL => Object.hasOwn(NOTICE_MAIL, k))
            .map((k) =>
                k === "invitation"
                    ? invitationMail(origin, "fictional-invitation", "The Oakleys", "Sam")
                    : k === "joined" || k === "removed"
                      ? membershipMail(origin, "The Oakleys", "Alex", k === "joined")
                      : noticeMail(k, origin),
            ),
        weeklyMail(letter, origin, true, stop),
        weeklyMail(many, origin, true, stop),
        weeklyMail(quiet, origin, true, stop),
        weeklyMail(letter, origin, false, stop),
    ].map((m) => ({ ...m, to: "fictional-parent@example.com", at: letter.generated }));
}
