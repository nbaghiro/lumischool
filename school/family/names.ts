// What a family, a grade, a day and a length of time are called on a page. It is its own module
// because the child's app names a family too, and the plan and the record in family.ts are a second
// concept that the child's screens would otherwise carry (tools/__tests__/first-view.test.ts).

import { weekdayOf } from "../record/record";

/**
 * A family's name as a heading says it, or with `inSentence` as the middle of a sentence says it. The
 * start page asks for the family's name, and people type "Okafor", "the Okafors" or "Okafor family",
 * so each reads as itself: the Okafor family, the Okafors.
 */
export function familyName(name: string, inSentence = false): string {
    const n = name.trim().replace(/\s+/g, " ");
    const the = inSentence ? "the" : "The";
    if (/^the /i.test(n)) return `${the} ${n.slice(4)}`;
    if (/ family$/i.test(n)) return `${the} ${n}`;
    return `${the} ${n} family`;
}

/** A grade as a parent reads it. Grade 0 is the year before grade 1. */
export const gradeName = (grade: number): string =>
    grade === 0 ? "Kindergarten" : `Grade ${grade}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Mon 5 Oct", for a cell with room for a date and not for a sentence. */
export const shortDate = (iso: string): string => {
    const [, m, d] = iso.split("-");
    return `${weekdayOf(iso).slice(0, 3)} ${Number(d)} ${MONTHS[Number(m) - 1] ?? ""}`;
};

/** "5 Oct 2026". */
export const longDate = (iso: string): string => {
    const [y, m, d] = iso.split("-");
    return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ""} ${y ?? ""}`;
};

/** Minutes as a family reads them: "1 h 25 min". */
export const spanText = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
};
