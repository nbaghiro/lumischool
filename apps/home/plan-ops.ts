// What both calendars need to read a day and write a change: the slots of one child's day, the words
// a subject is drawn in, and the drafts a placement appends. Nothing here draws.

import type { Draft, PlanOp, SessionOp } from "../../engine/answer";
import * as api from "../../engine/ui/api";
import type { CalCell } from "../../school/family/calendar";
import { sessionKey } from "../../school/family/family";
import { subjectFacts } from "../../school/tracks";
import type { Kid } from "../../server/db/schema";
import type { Loaded } from "./log";

/** One lesson on one day for one child, with the op that would move it. */
export interface Slot {
    kid: Kid;
    cell: CalCell;
    op: SessionOp;
}

/** Work already begun stays in the record, so only a planned session can be moved or removed. */
export const editable = (c: CalCell): boolean => !["done", "late", "part"].includes(c.state);

export const minutes = (subject: string): number =>
    subject === "maths" ? 25 : subject === "art" ? 30 : 20;

export const label = (track: string): string => subjectFacts(track).title;

export const marker = (track: string): string => `var(--${subjectFacts(track).marker})`;

export const draft = (kid: string, op: PlanOp): Draft => ({
    id: api.newId(),
    kid_id: kid,
    kind: "plan-changed",
    at: api.nowAt(),
    data: { op },
});

export function slots(l: Loaded, kid: Kid, day: string): Slot[] {
    const counts = new Map<string, number>();
    return (l.cal.kids.get(kid.id)?.cells.get(day) ?? [])
        .flatMap((cell): Slot[] => {
            if (!cell.lesson) return [];
            const slot = counts.get(cell.track) ?? 0;
            if (!cell.session) counts.set(cell.track, slot + 1);
            const id = sessionKey(cell.track, cell, slot);
            return [
                {
                    kid,
                    cell,
                    op: {
                        op: "session",
                        id,
                        track: cell.track,
                        source: cell.session ? (cell.source ?? null) : id,
                        onDay: cell.on,
                        lesson: cell.lesson,
                        kind: cell.kind === "off" ? "lesson" : cell.kind,
                        minutes: cell.plannedMinutes ?? minutes(cell.track),
                        order: cell.order ?? slot,
                        note: cell.session ? (cell.note ?? "") : "",
                        removed: false,
                    },
                },
            ];
        })
        .sort((a, b) => a.op.order - b.op.order);
}
