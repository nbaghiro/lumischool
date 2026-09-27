import {
    authoredStep,
    frameOf,
    teachingObject,
    type TeachingCommand,
    type TeachingMaterial,
    type TeachingState,
    type TeachingStep,
} from "../engine/teaching";

export function nextTeaching(
    material: TeachingMaterial,
    state: TeachingState,
    command: TeachingCommand,
): TeachingState {
    if (state.status === "ended" || command.expectedRevision !== state.revision)
        throw new Error("Teaching revision changed");
    const frame = frameOf(material, state.step.frameId);
    let target = frame.id;
    let mistakes = state.mistakes;
    let assisted = state.assisted;
    let correct: boolean | null = null;
    let ended = false;
    if (command.action === "answer") {
        if (!frame.question || !command.answer || !frame.question.choices.includes(command.answer))
            throw new Error("Choose an available answer");
        correct = command.answer === frame.question.correct;
        if (correct) {
            target = frame.next ?? frame.id;
            mistakes = 0;
            ended = !frame.next;
        } else {
            mistakes += 1;
            assisted = true;
            target = mistakes >= 2 && frame.bridge ? frame.bridge : (frame.alternative ?? frame.id);
        }
    } else if (command.action === "continue") {
        if (frame.question) throw new Error("Complete this step first");
        target = frame.next ?? frame.id;
        ended = !frame.next;
    } else if (command.action === "show" || command.action === "another") {
        target = frame.alternative ?? frame.bridge ?? frame.id;
        assisted = true;
    } else ended = true;
    if (
        mistakes >= 4 ||
        state.history.filter((h) => h.correct === false).length + (correct === false ? 1 : 0) >= 4
    )
        ended = true;
    const chosen = frameOf(material, target);
    return {
        ...state,
        revision: state.revision + 1,
        mistakes,
        assisted,
        status: ended ? "ended" : "presenting",
        step: authoredStep(chosen),
        history: [
            ...state.history,
            { frameId: frame.id, answer: command.answer ?? null, correct },
        ].slice(-24),
    };
}
export interface TutorProposal {
    frameId: string;
    caption: string;
    spokenText: string;
    factIds: string[];
}
export function acceptTutorProposal(
    value: unknown,
    material: TeachingMaterial,
    allowed: readonly string[],
    maxWords = 40,
): TeachingStep | null {
    if (
        !teachingObject(value) ||
        typeof value.frameId !== "string" ||
        !allowed.includes(value.frameId) ||
        typeof value.caption !== "string" ||
        typeof value.spokenText !== "string" ||
        !Array.isArray(value.factIds)
    )
        return null;
    const frame = material.frames.find((f) => f.id === value.frameId);
    if (!frame) return null;
    const allowedFacts = new Set(frame.facts.map((_, i) => `${frame.id}.${i}`));
    if (
        value.factIds.length === 0 ||
        !value.factIds.every((id: unknown) => typeof id === "string" && allowedFacts.has(id))
    )
        return null;
    const facts = `${frame.facts.join(" ")} ${frame.caption} ${frame.question?.prompt ?? ""}`;
    const numbers = new Set(facts.match(/\b\d+\b/g) ?? []);
    for (const text of [value.caption, value.spokenText]) {
        if (
            !text.trim() ||
            text.length > 700 ||
            text.trim().split(/\s+/).length > maxWords ||
            /[<>]|https?:|www\.|\b(system prompt|ignore instructions)\b/i.test(text)
        )
            return null;
        if ((text.match(/\b\d+\b/g) ?? []).some((n) => !numbers.has(n))) return null;
    }
    return {
        frameId: value.frameId,
        caption: value.caption,
        spokenText: value.spokenText,
        origin: "gemini",
        reason: null,
    };
}
export function teachingCandidates(material: TeachingMaterial, next: TeachingState): string[] {
    const frame = frameOf(material, next.step.frameId);
    // Only interchangeable representations are candidates; the model cannot skip a check.
    return [
        frame.id,
        ...material.frames
            .filter(
                (f) =>
                    frame.alternative === f.id &&
                    f.phase === frame.phase &&
                    f.question?.correct === frame.question?.correct &&
                    f.next === frame.next,
            )
            .map((f) => f.id),
    ];
}
