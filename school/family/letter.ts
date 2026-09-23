import type { Envelope } from "../../engine/answer";
import { addDays, dayIn, fold, mondayOf } from "../record/record";
import type { YearLesson } from "../year";
import { childRecord } from "./family";

export interface LetterSection {
    heading: string;
    text: string;
    lesson?: string;
}

export interface ChildLetter {
    id: string;
    name: string;
    sections: LetterSection[];
}

export interface WeeklyLetter {
    from: string;
    to: string;
    generated: string;
    children: ChildLetter[];
    useful: boolean;
}

export function weekEnding(now: string, zone: string): string {
    const today = dayIn(now, zone);
    return addDays(mondayOf(today), -1);
}

export function validWeek(day: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const date = new Date(`${day}T00:00:00Z`);
    return (
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === day &&
        date.getUTCDay() === 0
    );
}

export function weeklyLetter(o: {
    kids: readonly { id: string; name: string; grade: number }[];
    events: readonly Envelope[];
    lessons: readonly YearLesson[];
    zone: string;
    to: string;
    now: string;
}): WeeklyLetter {
    const from = addDays(o.to, -6);
    const events = o.events.filter((e) => e.at <= o.now);
    const byId = new Map(o.lessons.map((l) => [l.id, l]));
    const title = (id: string): string => byId.get(id)?.title ?? "A lesson";
    const f = fold(events, o.zone, (id) => byId.get(id)?.subject ?? "maths");
    let useful = false;
    const children = o.kids.map((kid): ChildLetter => {
        const sittings = f.sittings.filter(
            (s) => s.child === kid.id && s.on >= from && s.on <= o.to,
        );
        const attempts = f.attempts.filter(
            (a) => a.child === kid.id && a.on >= from && a.on <= o.to,
        );
        const titles = [...new Set(sittings.map((s) => title(s.lesson)))];
        const days = new Set(sittings.map((s) => s.on)).size;
        const sections: LetterSection[] = [
            {
                heading: "This week",
                text: titles.length
                    ? `${kid.name} worked on ${titles.slice(0, 4).join(", ")}${titles.length > 4 ? " and other lessons" : ""}, across ${days} ${days === 1 ? "day" : "days"}.`
                    : "No work was recorded for this week. Work done on paper or not yet synced may still be waiting to appear.",
            },
        ];
        const finished = sittings.filter((s) => s.finished).reverse();
        if (finished.length)
            sections.push({
                heading: "A moment to notice",
                text: `${kid.name} finished a sitting of ${title(finished[0]?.lesson ?? "")}. Open the sheet to see the work and any feedback.`,
                lesson: finished[0]?.lesson,
            });
        const recurring = new Map<string, { rule: string; lesson: string; days: Set<string> }>();
        for (const a of attempts) {
            if (!a.rule) continue;
            const key = `${a.lesson}:${a.rule}`;
            const r = recurring.get(key) ?? {
                rule: a.rule,
                lesson: a.lesson,
                days: new Set<string>(),
            };
            r.days.add(a.on);
            recurring.set(key, r);
        }
        const revisit = [...recurring.values()]
            .filter((r) => r.days.size >= 2)
            .sort((a, b) => b.days.size - a.days.size)[0];
        if (revisit)
            sections.push({
                heading: "Something to revisit",
                text: `In ${title(revisit.lesson)}, the lesson recorded this feedback on ${revisit.days.size} different days: “${revisit.rule}” Open the lesson to review it together.`,
                lesson: revisit.lesson,
            });
        const waiting = sittings.filter(
            (s) =>
                s.finished &&
                s.mode === "paper" &&
                !attempts.some((a) => a.lesson === s.lesson && a.on === s.on),
        );
        const latestAnswers = new Map<string, Extract<Envelope, { kind: "answered" }>>();
        const responded = new Set(
            events.flatMap((e) =>
                e.kid_id === kid.id && e.kind === "responded" && e.data.answer
                    ? [e.data.answer]
                    : [],
            ),
        );
        for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at) || a.seq - b.seq)) {
            if (e.kid_id !== kid.id || e.kind !== "answered") continue;
            latestAnswers.set(`${e.data.sitting}:${e.data.q.section}:${e.data.q.n}`, e);
        }
        const pieces = [...latestAnswers.values()].filter(
            (e) =>
                e.data.right === null &&
                !responded.has(e.id) &&
                dayIn(e.at, o.zone) >= from &&
                dayIn(e.at, o.zone) <= o.to,
        );
        const help = events.filter(
            (e) =>
                e.kid_id === kid.id &&
                e.kind === "help-asked" &&
                e.data.ask === "grown-up" &&
                dayIn(e.at, o.zone) >= from &&
                dayIn(e.at, o.zone) <= o.to,
        );
        if (waiting.length || pieces.length || help.length)
            sections.push({
                heading: "A little help from you",
                text: [
                    waiting.length
                        ? `${waiting.length} ${waiting.length === 1 ? "paper sitting has" : "paper sittings have"} no recorded marks yet.`
                        : "",
                    pieces.length
                        ? `${pieces.length} ${pieces.length === 1 ? "piece is" : "pieces are"} waiting for your response.`
                        : "",
                    help.length
                        ? `${kid.name} asked for a grown-up's help this week. You may already have looked at this together.`
                        : "",
                    "Open the calendar to review the work.",
                ]
                    .filter(Boolean)
                    .join(" "),
            });
        const history = events.filter((e) => dayIn(e.at, o.zone) <= o.to);
        const record = childRecord(history, kid, o.lessons, o.zone, o.to);
        const next = record.plan
            .flatMap((p) => p.days)
            .filter((d) => d.on > o.to && d.on <= addDays(o.to, 7) && d.lesson)
            .sort((a, b) => a.on.localeCompare(b.on));
        const seen = new Set<string>();
        const coming = next
            .flatMap((d) => {
                if (!d.lesson || seen.has(d.lesson)) return [];
                seen.add(d.lesson);
                return [
                    `${new Date(`${d.on}T12:00:00Z`).toLocaleDateString("en", { weekday: "long", timeZone: "UTC" })}: ${title(d.lesson)}`,
                ];
            })
            .slice(0, 3);
        if (coming.length)
            sections.push({
                heading: "Coming next",
                text: `${coming.join(". ")}. This follows the plan at the end of this reporting week.`,
            });
        useful ||= sittings.length > 0 || coming.length > 0 || pieces.length > 0 || help.length > 0;
        return { id: kid.id, name: kid.name, sections };
    });
    return { from, to: o.to, generated: o.now, children, useful };
}
