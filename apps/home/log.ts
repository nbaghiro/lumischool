// The family's log as the grown-ups' screens read it: who is signed in, the family, the pack, the plan
// and what was worked, and the calendar folded from them (school/family/calendar.ts). The calendar and
// Change the plan read the same thing, so a change made on one is folded the same way on the other.

import type { Envelope } from "../../engine/answer";
import * as api from "../../engine/ui/api";
import { go } from "../../engine/ui/router";
import type { Failure } from "../../engine/ui/wire";
import { foldCalendar, type Calendar } from "../../school/family/calendar";
import { dayIn, fold, addDays, type Sitting } from "../../school/record/record";
import type { FamilyView, Me, PackView } from "../../server/api";
import { knowFamily } from "./bar";
import { signInFor } from "./routes";

export interface Loaded {
    me: Me;
    view: FamilyView;
    pack: PackView;
    events: Envelope[];
    sittings: Sitting[];
    cal: Calendar;
    /** The first day the printed sheets were read from; before it the calendar says nothing about printing. */
    printedSince: string;
}

/** How far back the sittings are read, and how far ahead the plan is laid out, in days. */
const BACK = 400;
const AHEAD = 400;

/**
 * How far back the printed sheets are read, in days. A `sheet-printed` event carries every question
 * of the sheet, so a year of them is most of a family's log by weight (680 kB of the demo family's
 * 1.1 MB), and the calendar reads them only to say that a sheet was printed. Three weeks covers the
 * weeks a grown-up is still printing and marking; before that the calendar says nothing about
 * printing rather than saying something wrong, and `printedSince` is what the views lean on.
 */
const PRINTED_BACK = 21;

/** What the calendar reads of a family's log: the plan, and what was worked and added. */
const WORK_KINDS = ["day-added", "sitting-began", "sitting-ended"] as const;

export async function readFamilyLog(): Promise<Loaded | Failure | null> {
    const [me, view, pack] = await Promise.all([
        api.me({ ask: true }),
        api.familyRows({ ask: true }),
        api.pack(),
    ]);
    if ("error" in me) {
        if (me.error === "signed-out")
            go(signInFor(`${location.pathname}${location.search}`), { replace: true });
        if (me.error === "put-away") location.replace("/sign-in?locked=1");
        return "error" in me ? me : null;
    }
    if ("error" in view) return view;
    if ("error" in pack) return pack;
    knowFamily(me, view);
    const today = dayIn(new Date().toISOString(), me.family.time_zone);
    const printedSince = addDays(today, -PRINTED_BACK);
    const [plan, work, printed] = await Promise.all([
        api.events(undefined, { kinds: ["plan-changed"] }),
        api.events(undefined, {
            kinds: [...WORK_KINDS],
            from: addDays(today, -BACK),
            to: addDays(today, 7),
        }),
        api.events(undefined, {
            kinds: ["sheet-printed"],
            from: printedSince,
            to: addDays(today, 7),
        }),
    ]);
    if (!plan || !work || !printed) return { error: "offline", status: 0 };
    const events = [...plan, ...work, ...printed];
    const subjectOf = new Map(pack.index.lessons.map((l) => [l.id, l.subject]));
    const folded = fold(
        [...work, ...printed],
        me.family.time_zone,
        (id) => subjectOf.get(id) ?? "maths",
    );
    return {
        me,
        view,
        pack,
        events,
        sittings: folded.sittings,
        printedSince,
        cal: foldCalendar({
            events,
            sittings: folded.sittings,
            kids: view.kids,
            lessons: pack.index.lessons,
            timeZone: me.family.time_zone,
            today,
            until: addDays(today, AHEAD),
        }),
    };
}
