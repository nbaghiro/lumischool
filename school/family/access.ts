// Who may write and read each kind of event, and which kids a member reaches on a day, from
// .docs/auth.md ("What each caller may append, and read back"). Both tables are complete records over
// `EventKind`, so a new kind does not compile until someone has decided who may use it. The server
// enforces them and the parent's app reads them to decide what to show.

import type { EventKind, Envelope } from "../../engine/answer";
import type { Member } from "../../server/db/schema";

/** Who is asking: a child's key in a children's view, or a person by their membership. */
export type Caller = "kid" | "parent" | "tutor";

interface Access {
    /** Who may append it. None means only the server writes it. */
    write: readonly Caller[];
    /** Whether a child's view reads it back for that child, and whether a tutor reads it for theirs. */
    kid: boolean;
    tutor: boolean;
}

const WORK: Access = { write: ["kid"], kid: true, tutor: true };
const SITTING: Access = { write: ["kid", "parent", "tutor"], kid: true, tutor: true };
const PAPER: Access = { write: ["parent", "tutor"], kid: true, tutor: true };
const PARENT_ONLY: Access = { write: ["parent"], kid: false, tutor: false };
const SERVER: Access = { write: [], kid: false, tutor: false };

export const ACCESS: Record<EventKind, Access> = {
    "sitting-began": SITTING,
    "sitting-ended": SITTING,
    answered: WORK,
    "hint-opened": WORK,
    "help-asked": WORK,
    "round-played": WORK,
    "sheet-printed": PAPER,
    marked: PAPER,
    // a grown-up's response to a painting or a piece of writing is written as a mark from paper is
    responded: PAPER,
    "plan-changed": { write: ["parent"], kid: true, tutor: true },
    // the child's map is drawn in the worlds a parent chose; a tutor's pages draw no map
    "world-chosen": { write: ["parent"], kid: true, tutor: false },
    "content-authored": PARENT_ONLY,
    "content-verified": SERVER,
    "day-added": PARENT_ONLY,
    "signed-in": SERVER,
    "signed-out": SERVER,
    "session-changed": SERVER,
    "login-changed": SERVER,
    "member-added": SERVER,
    "member-changed": SERVER,
    "member-removed": SERVER,
    "consent-given": SERVER,
    "consent-withdrawn": SERVER,
    "kid-session-opened": SERVER,
    "kid-session-ended": SERVER,
    "pin-set": SERVER,
    "kid-deleted": SERVER,
    exported: SERVER,
};

/**
 * Why this caller may not append this event, or null when it may. The kind is the table's; the one
 * rule beyond it is that a child's view records only screen sittings, since a paper sitting is
 * recorded by the grown-up who sat with it.
 */
export function mayWrite(caller: Caller, e: Envelope): string | null {
    if (!ACCESS[e.kind].write.includes(caller)) return `a ${caller} may not write ${e.kind}`;
    if (caller === "kid" && e.kind === "sitting-began" && e.data.mode !== "screen")
        return "a child's view records screen sittings; a paper sitting is recorded by a grown-up";
    return null;
}

/** Whether this caller reads this kind back. A parent reads everything in their family. */
export const mayRead = (caller: Caller, kind: EventKind): boolean =>
    caller === "parent" || ACCESS[kind][caller];

/** A membership that grants something: not ended. */
const active = (m: Pick<Member, "ended_at">): boolean => m.ended_at === null;

/** Whether these rows make the person a parent of the family: an active row with no kid. */
export const isParent = (rows: Pick<Member, "kid_id" | "ended_at">[]): boolean =>
    rows.some((m) => active(m) && m.kid_id === null);

/**
 * The kids a person reaches on a day, from their own rows in one family: every kid for a parent, and
 * for a tutor the kids whose window holds the day, both ends inclusive. `onDay` is the day in the
 * family's time zone.
 */
export function reach(
    rows: Pick<Member, "kid_id" | "from_day" | "to_day" | "ended_at">[],
    onDay: string,
): "every kid" | string[] {
    if (isParent(rows)) return "every kid";
    const kids = rows.flatMap((m) =>
        active(m) &&
        m.kid_id !== null &&
        m.from_day !== null &&
        m.to_day !== null &&
        m.from_day <= onDay &&
        onDay <= m.to_day
            ? [m.kid_id]
            : [],
    );
    return [...new Set(kids)].sort();
}

/** Whether a person reaches one kid on a day. */
export function reaches(
    rows: Pick<Member, "kid_id" | "from_day" | "to_day" | "ended_at">[],
    kid: string,
    onDay: string,
): boolean {
    const r = reach(rows, onDay);
    return r === "every kid" || r.includes(kid);
}
