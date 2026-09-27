export const TEACHING_VERSION = 1;
export type TeachingPhase = "notice" | "model" | "together" | "independent" | "recap";
export type TeachingAction = "continue" | "answer" | "another" | "show" | "return" | "handoff";
export type TeachingStatus = "presenting" | "requesting" | "paused" | "ended";
export interface TeachingPreferences {
    entry: "worksheet" | "guided";
    adaptive: boolean;
    guide: "world" | "bird" | "snail" | "none";
    delivery: "concise" | "steps";
    audio: "off" | "device" | "gemini";
    pace: "normal" | "slow";
}
export const DEFAULT_TEACHING: TeachingPreferences = {
    entry: "worksheet",
    adaptive: false,
    guide: "world",
    delivery: "concise",
    audio: "off",
    pace: "normal",
};
export const teachingObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
export function teachingPreferences(v: unknown): TeachingPreferences {
    const p = teachingObject(v) ? v : {};
    return {
        entry: p.entry === "guided" ? "guided" : "worksheet",
        adaptive: p.adaptive === true,
        guide: p.guide === "bird" || p.guide === "snail" || p.guide === "none" ? p.guide : "world",
        delivery: p.delivery === "steps" ? "steps" : "concise",
        audio: p.audio === "device" || p.audio === "gemini" ? p.audio : "off",
        pace: p.pace === "slow" ? "slow" : "normal",
    };
}
export type TeachingVisual =
    | { kind: "counters"; first: number; extra: number; numberLine: boolean }
    | { kind: "passage"; text: string; focus: string }
    | { kind: "chain"; names: string[]; highlight: number };
export interface TeachingFrame {
    id: string;
    phase: TeachingPhase;
    caption: string;
    visual: TeachingVisual;
    question: { prompt: string; choices: string[]; correct: string } | null;
    next: string | null;
    alternative: string | null;
    bridge: string | null;
    facts: string[];
}
export interface TeachingMaterial {
    schema: 1;
    id: string;
    version: string;
    title: string;
    skill: string;
    lessonIds: string[];
    first: string;
    frames: TeachingFrame[];
}
/** A move the tutor may make on one question: say and ring, check a quantity, or hand back. */
export type MoveKind = "show" | "ask" | "step-back" | "hand-back";
export interface TutorMove {
    kind: MoveKind;
    say: string;
    /** What the board rings while the line is read, or null. */
    ring: string | null;
    /** A check the move asks, whose answer is computed in school/adaptive.ts and never by the model. */
    check: { quantityId: string; prompt: string; choices: number[]; correct: number } | null;
    origin: "gemini" | "authored";
    /** Why a proposal was repaired, for the transcript and the parent's record. */
    repaired: string | null;
}

/** One help on one question: the moves made, what the child answered to each, and whether it is over. */
export interface AdaptiveHelp {
    lessonId: string;
    questionN: number;
    variant: string;
    revision: number;
    status: "presenting" | "requesting" | "paused" | "ended";
    move: TutorMove;
    /** Every move so far as short words, which the envelope carries so the tutor does not repeat itself. */
    made: string[];
    /** What the child answered to the tutor's own checks, newest last. */
    checks: { quantityId: string; answer: number; correct: boolean }[];
    wrong: number;
}

export const moveWords = (move: TutorMove): string =>
    `${move.origin === "authored" ? "authored" : move.kind}: ${move.say}`;

export function startHelp(o: {
    lessonId: string;
    questionN: number;
    variant: string;
    move: TutorMove;
}): AdaptiveHelp {
    return {
        lessonId: o.lessonId,
        questionN: o.questionN,
        variant: o.variant,
        revision: 0,
        status: "presenting",
        move: o.move,
        made: [moveWords(o.move)],
        checks: [],
        wrong: 0,
    };
}

/** The help after a child answers the tutor's own check, or asks for the next move. */
export function nextHelp(help: AdaptiveHelp, answer: number | null, move: TutorMove): AdaptiveHelp {
    const check = help.move.check;
    const correct = answer !== null && check !== null && check.correct === answer;
    const wrong = help.wrong + (answer !== null && !correct ? 1 : 0);
    const ended = move.kind === "hand-back" || wrong >= 4 || help.made.length >= 12;
    return {
        ...help,
        revision: help.revision + 1,
        status: ended ? "ended" : "presenting",
        move,
        made: [...help.made, moveWords(move)].slice(-12),
        checks:
            answer !== null && check !== null
                ? [...help.checks, { quantityId: check.quantityId, answer, correct }].slice(-12)
                : help.checks,
        wrong,
    };
}

export function validHelp(v: unknown): v is AdaptiveHelp {
    if (!teachingObject(v) || !teachingObject(v.move) || !Array.isArray(v.made)) return false;
    return (
        typeof v.lessonId === "string" &&
        Number.isSafeInteger(v.questionN) &&
        typeof v.variant === "string" &&
        Number.isSafeInteger(v.revision) &&
        typeof v.revision === "number" &&
        v.revision >= 0 &&
        ["presenting", "requesting", "paused", "ended"].includes(String(v.status)) &&
        typeof v.move.say === "string" &&
        Array.isArray(v.checks) &&
        Number.isSafeInteger(v.wrong)
    );
}

export interface TeachingStep {
    frameId: string;
    caption: string;
    spokenText: string;
    origin: "authored" | "gemini";
    reason: string | null;
}
export interface TeachingState {
    materialId: string;
    materialVersion: string;
    revision: number;
    status: TeachingStatus;
    expanded: boolean;
    step: TeachingStep;
    mistakes: number;
    assisted: boolean;
    history: { frameId: string; answer: string | null; correct: boolean | null }[];
}
export interface TeachingCommand {
    operationId: string;
    expectedRevision: number;
    action: TeachingAction;
    answer?: string;
}
export function frameOf(material: TeachingMaterial, id: string): TeachingFrame {
    const frame = material.frames.find((f) => f.id === id);
    if (!frame) throw new Error("Unknown teaching frame");
    return frame;
}
/** The straight way through: the first frame and what follows it, which the step marker counts. */
export function teachingSpine(material: TeachingMaterial): string[] {
    const spine: string[] = [];
    const seen = new Set<string>();
    let at: TeachingFrame | undefined = material.frames.find((f) => f.id === material.first);
    while (at && !seen.has(at.id)) {
        seen.add(at.id);
        spine.push(at.id);
        const next: string | null = at.next;
        at = next === null ? undefined : material.frames.find((f) => f.id === next);
    }
    return spine;
}
/** Where a frame stands on that way: a side path counts as the step it leads back to. */
export function teachingPlace(
    material: TeachingMaterial,
    frameId: string,
): { at: number; of: number } {
    const spine = teachingSpine(material);
    const seen = new Set<string>();
    let id: string | null = frameId;
    while (id !== null && !seen.has(id)) {
        const at = spine.indexOf(id);
        if (at >= 0) return { at: at + 1, of: spine.length };
        seen.add(id);
        id = material.frames.find((f) => f.id === id)?.next ?? null;
    }
    return { at: 1, of: spine.length };
}
/** What the board draws now, from a prepared frame or from a tutor's move: the renderer knows no more. */
export type TeachingSight =
    | { kind: "prepared"; visual: TeachingVisual }
    | { kind: "question"; sceneId: string; ring: readonly string[] };
export interface TeachingView {
    title: string;
    /** Where this moment stands on a prepared way through, or null where the tutor chooses as it goes. */
    place: { at: number; of: number } | null;
    sight: TeachingSight;
    /** The one instruction, which becomes the question once the doing is done. */
    caption: string;
    spoken: string;
    check: { prompt: string; choices: string[] } | null;
    /** The phase a prepared frame is in, which decides whether its equation shows. */
    phase: TeachingPhase | null;
    origin: "authored" | "gemini";
}
export function viewOfFrame(material: TeachingMaterial, state: TeachingState): TeachingView {
    const frame = frameOf(material, state.step.frameId);
    return {
        title: material.title,
        place: teachingPlace(material, frame.id),
        sight: { kind: "prepared", visual: frame.visual },
        caption: state.step.caption,
        spoken: state.step.spokenText,
        check: frame.question
            ? { prompt: frame.question.prompt, choices: frame.question.choices }
            : null,
        phase: frame.phase,
        origin: state.step.origin,
    };
}
export function authoredStep(frame: TeachingFrame, reason: string | null = null): TeachingStep {
    return {
        frameId: frame.id,
        caption: frame.caption,
        spokenText: frame.caption,
        origin: "authored",
        reason,
    };
}
export function startTeaching(material: TeachingMaterial): TeachingState {
    return {
        materialId: material.id,
        materialVersion: material.version,
        revision: 0,
        status: "presenting",
        expanded: true,
        step: authoredStep(frameOf(material, material.first)),
        mistakes: 0,
        assisted: false,
        history: [],
    };
}
export type TeachingEvent =
    | { kind: "request" }
    | { kind: "accept"; expectedRevision: number; state: TeachingState }
    | { kind: "pause" | "resume" | "end" }
    | { kind: "expand"; expanded: boolean };
export function reduceTeaching(state: TeachingState, event: TeachingEvent): TeachingState {
    if (event.kind === "expand") return { ...state, expanded: event.expanded };
    if (event.kind === "end") return { ...state, status: "ended" };
    if (state.status === "ended") return state;
    if (event.kind === "pause") return { ...state, status: "paused" };
    if (event.kind === "resume") return { ...state, status: "presenting" };
    if (event.kind === "request")
        return state.status === "paused" ? state : { ...state, status: "requesting" };
    if (event.kind !== "accept") return state;
    if (
        state.status !== "requesting" ||
        state.revision !== event.expectedRevision ||
        event.state.materialId !== state.materialId ||
        event.state.materialVersion !== state.materialVersion ||
        event.state.revision !== state.revision + 1
    )
        return state;
    return { ...event.state, expanded: state.expanded };
}
export function validTeachingState(v: unknown): v is TeachingState {
    if (!teachingObject(v) || !teachingObject(v.step) || !Array.isArray(v.history)) return false;
    return (
        typeof v.materialId === "string" &&
        typeof v.materialVersion === "string" &&
        Number.isSafeInteger(v.revision) &&
        typeof v.revision === "number" &&
        v.revision >= 0 &&
        ["presenting", "requesting", "paused", "ended"].includes(String(v.status)) &&
        typeof v.expanded === "boolean" &&
        typeof v.assisted === "boolean" &&
        Number.isSafeInteger(v.mistakes) &&
        typeof v.mistakes === "number" &&
        v.mistakes >= 0 &&
        typeof v.step.frameId === "string" &&
        typeof v.step.caption === "string" &&
        typeof v.step.spokenText === "string" &&
        (v.step.origin === "authored" || v.step.origin === "gemini") &&
        (v.step.reason === null || typeof v.step.reason === "string") &&
        v.history.length <= 24 &&
        v.history.every(
            (h: unknown) =>
                teachingObject(h) &&
                typeof h.frameId === "string" &&
                (h.answer === null || typeof h.answer === "string") &&
                (h.correct === null || typeof h.correct === "boolean"),
        )
    );
}
export function validTeachingCommand(v: unknown): v is TeachingCommand {
    return (
        teachingObject(v) &&
        typeof v.operationId === "string" &&
        /^[0-9a-f-]{36}$/i.test(v.operationId) &&
        Number.isSafeInteger(v.expectedRevision) &&
        typeof v.expectedRevision === "number" &&
        v.expectedRevision >= 0 &&
        ["continue", "answer", "another", "show", "return", "handoff"].includes(String(v.action)) &&
        (v.answer === undefined || (typeof v.answer === "string" && v.answer.length <= 120))
    );
}
function visual(v: unknown): v is TeachingVisual {
    if (!teachingObject(v)) return false;
    if (v.kind === "counters")
        return (
            typeof v.first === "number" &&
            Number.isInteger(v.first) &&
            v.first >= 0 &&
            v.first <= 10 &&
            typeof v.extra === "number" &&
            Number.isInteger(v.extra) &&
            v.extra >= 0 &&
            v.extra <= 10 &&
            typeof v.numberLine === "boolean"
        );
    if (v.kind === "passage")
        return (
            typeof v.text === "string" &&
            typeof v.focus === "string" &&
            (!v.focus || v.text.includes(v.focus))
        );
    return (
        v.kind === "chain" &&
        Array.isArray(v.names) &&
        v.names.length === 3 &&
        v.names.every((x: unknown) => typeof x === "string") &&
        typeof v.highlight === "number"
    );
}
function frame(v: unknown): v is TeachingFrame {
    return (
        teachingObject(v) &&
        typeof v.id === "string" &&
        typeof v.caption === "string" &&
        ["notice", "model", "together", "independent", "recap"].includes(String(v.phase)) &&
        visual(v.visual) &&
        [v.next, v.alternative, v.bridge].every((x) => x === null || typeof x === "string") &&
        Array.isArray(v.facts) &&
        v.facts.length > 0 &&
        v.facts.every((x: unknown) => typeof x === "string") &&
        (v.question === null ||
            (teachingObject(v.question) &&
                typeof v.question.prompt === "string" &&
                Array.isArray(v.question.choices) &&
                v.question.choices.every((x: unknown) => typeof x === "string") &&
                typeof v.question.correct === "string" &&
                v.question.choices.includes(v.question.correct)))
    );
}
export function readTeachingMaterial(v: unknown): TeachingMaterial | null {
    if (!(
        teachingObject(v) &&
        v.schema === 1 &&
        typeof v.id === "string" &&
        typeof v.version === "string" &&
        typeof v.title === "string" &&
        typeof v.skill === "string" &&
        typeof v.first === "string" &&
        Array.isArray(v.lessonIds) &&
        v.lessonIds.every((x: unknown) => typeof x === "string") &&
        Array.isArray(v.frames) &&
        v.frames.length > 0 &&
        v.frames.every(frame)
    ))
        return null;
    const frames = v.frames;
    const ids = new Set(frames.map((f) => f.id));
    if (
        ids.size !== frames.length ||
        !ids.has(v.first) ||
        frames.some((f) => [f.next, f.alternative, f.bridge].some((x) => x !== null && !ids.has(x)))
    )
        return null;
    for (const first of frames) {
        const seen = new Set<string>();
        let at: TeachingFrame | undefined = first;
        while (at) {
            if (seen.has(at.id)) return null;
            seen.add(at.id);
            const next: string | null = at.next;
            at = next === null ? undefined : frames.find((f) => f.id === next);
        }
    }
    return {
        schema: 1,
        id: v.id,
        version: v.version,
        title: v.title,
        skill: v.skill,
        first: v.first,
        lessonIds: v.lessonIds,
        frames,
    };
}
