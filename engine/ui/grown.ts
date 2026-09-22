// What only a grown-up's page reads: one child as the server folds them for a parent
// (`GET /api/kids/:kid/record`, .docs/api.md). It is apps/home's alone, so the child's view and the
// site carry none of it; the rest of the grown-ups' client is api.ts.

import type { QuestionRef } from "../answer";
import type { GrownRecord } from "../../server/api";
import {
    call,
    day,
    list,
    num,
    obj,
    readChildRecord,
    readKid,
    str,
    strOrNull,
    strs,
    unreadable,
    type Failure,
} from "./wire";

type Sheet = GrownRecord["back"][number];

const ref = (v: unknown): QuestionRef | null =>
    obj(v) &&
    str(v.lesson) &&
    str(v.lessonHash) &&
    str(v.section) &&
    Number.isInteger(v.n) &&
    num(v.n) &&
    str(v.item) &&
    str(v.itemHash) &&
    str(v.variant) &&
    str(v.ask) &&
    strs(v.skills)
        ? {
              lesson: v.lesson,
              lessonHash: v.lessonHash,
              section: v.section,
              n: v.n,
              item: v.item,
              itemHash: v.itemHash,
              variant: v.variant,
              ask: v.ask,
              skills: v.skills,
          }
        : null;

function readSheet(v: unknown): Sheet | null {
    if (!obj(v)) return null;
    const mistakes = list(v.mistakes, (m) =>
        obj(m) && str(m.rule) && num(m.times) ? { rule: m.rule, times: m.times } : null,
    );
    const questions = list(v.questions, ref);
    return str(v.child) &&
        str(v.lesson) &&
        str(v.subject) &&
        day(v.on) &&
        (v.mode === "screen" || v.mode === "paper") &&
        num(v.minutes) &&
        typeof v.finished === "boolean" &&
        typeof v.withGrownUp === "boolean" &&
        num(v.asked) &&
        num(v.right) &&
        typeof v.marked === "boolean" &&
        strOrNull(v.sheet) &&
        mistakes &&
        questions
        ? {
              child: v.child,
              lesson: v.lesson,
              subject: v.subject,
              on: v.on,
              mode: v.mode,
              minutes: v.minutes,
              finished: v.finished,
              withGrownUp: v.withGrownUp,
              asked: v.asked,
              right: v.right,
              mistakes,
              marked: v.marked,
              sheet: v.sheet,
              questions,
          }
        : null;
}

/** One child as a parent's page reads them: the child's record, the sheets that came back, and the one thing to look at. */
export function readGrown(v: unknown): GrownRecord | null {
    if (!obj(v)) return null;
    const kid = readKid(v.kid);
    const record = readChildRecord(v);
    const back = list(v.back, readSheet);
    const l = v.look;
    const look =
        l === null
            ? null
            : obj(l) && str(l.rule) && str(l.lesson) && num(l.times) && num(l.days)
              ? { rule: l.rule, lesson: l.lesson, times: l.times, days: l.days }
              : undefined;
    return kid && str(v.pack) && record && day(v.from) && back && look !== undefined
        ? { kid, pack: v.pack, ...record, from: v.from, back, look }
        : null;
}

/** One child as a parent's page reads them, folded on the server. */
export async function grownRecord(kid: string): Promise<GrownRecord | Failure> {
    const a = await call("GET", `/api/kids/${encodeURIComponent(kid)}/record`);
    if (!a.ok) return a.failure;
    return readGrown(a.body) ?? unreadable(a.status);
}
