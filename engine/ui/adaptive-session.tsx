import { createSignal, onCleanup, type JSX } from "solid-js";
import type { TeachingPreferences, TeachingState, TeachingView } from "../teaching";
import type { Scene } from "../scene";
import type { SceneDrawer } from "./scene";
import { TeachingBoard } from "./teaching";
import { teachingAudio } from "./teaching-audio";
import { obj, type Answer } from "./wire";

/** A help as the server keeps it: the move on screen, and how far the help has gone. */
export interface HelpShape {
    revision: number;
    status: "presenting" | "requesting" | "paused" | "ended";
    move: { say: string; ring: string | null; check: { prompt: string; choices: number[] } | null };
}
export interface HelpGateway {
    start(id: string, tries: readonly { answer: string; told: string | null }[]): Promise<Answer>;
    load(id: string): Promise<Answer>;
    turn(
        id: string,
        operationId: string,
        expectedRevision: number,
        answer: number | null,
        tries: readonly { answer: string; told: string | null }[],
    ): Promise<Answer>;
}
const helpShape = (v: unknown): v is HelpShape =>
    obj(v) && obj(v.move) && typeof v.move.say === "string" && Number.isSafeInteger(v.revision);
const helpOf = (body: unknown): HelpShape | null =>
    obj(body) && helpShape(body.help) ? body.help : null;

/**
 * The tutor on one question. The authored line is on screen before any call, and the move the tutor
 * chooses replaces it when it lands, so a slow answer never leaves a child waiting.
 */
export function AdaptiveSession(props: {
    title: string;
    scene: Scene;
    draw: SceneDrawer;
    preferences: TeachingPreferences;
    /** The line the question's own hints give, which stands until the tutor's move arrives. */
    authored: string;
    ringOf: (ref: string | null) => readonly string[];
    tries: readonly { answer: string; told: string | null }[];
    gateway: HelpGateway;
    wayOut?: boolean;
    onClose: () => void;
}): JSX.Element {
    const [help, setHelp] = createSignal<HelpShape>({
        revision: 0,
        status: "presenting",
        move: { say: props.authored, ring: null, check: null },
    });
    const [session, setSession] = createSignal<string | null>(null);
    const [busy, setBusy] = createSignal(false);
    const [message, setMessage] = createSignal("");
    const [paused, setPaused] = createSignal(false);
    const [expanded, setExpanded] = createSignal(true);
    const audio = teachingAudio();
    let ticket = 0;
    let alive = true;
    const open = async () => {
        const current = ++ticket;
        const id = crypto.randomUUID();
        setBusy(true);
        const response = await props.gateway.start(id, props.tries);
        if (current !== ticket || !alive) return;
        const next = response.ok ? helpOf(response.body) : null;
        if (next) {
            setSession(id);
            setHelp(next);
        }
        setBusy(false);
        void ask(null);
    };
    const ask = async (answer: number | null) => {
        const id = session();
        if (!id || busy() || help().status === "ended") return;
        const current = ++ticket;
        setBusy(true);
        audio.stop();
        const response = await props.gateway.turn(
            id,
            crypto.randomUUID(),
            help().revision,
            answer,
            props.tries,
        );
        if (current !== ticket || !alive) return;
        const next = response.ok ? helpOf(response.body) : null;
        if (next) {
            setHelp(next);
            setMessage("");
        } else setMessage("Here is the lesson's own hint for now.");
        setBusy(false);
    };
    void open();
    onCleanup(() => {
        alive = false;
        ++ticket;
        audio.stop();
    });
    const view = (): TeachingView => {
        const move = help().move;
        const ended = help().status === "ended";
        return {
            title: props.title,
            place: null,
            sight: { kind: "question", sceneId: "", ring: props.ringOf(move.ring) },
            caption: ended ? "Now try the question yourself." : move.say,
            spoken: move.say,
            check:
                move.check && !ended
                    ? { prompt: move.check.prompt, choices: move.check.choices.map(String) }
                    : null,
            phase: null,
            origin: "authored",
        };
    };
    const state = (): TeachingState => ({
        materialId: "question",
        materialVersion: "1",
        revision: help().revision,
        status: paused() ? "paused" : help().status,
        expanded: expanded(),
        step: { frameId: "move", caption: "", spokenText: "", origin: "authored", reason: null },
        mistakes: 0,
        assisted: true,
        history: [],
    });
    return (
        <TeachingBoard
            view={view()}
            question={{ scene: props.scene, draw: props.draw }}
            state={state()}
            preferences={props.preferences}
            wayOut={props.wayOut}
            another={help().status !== "ended"}
            busy={busy()}
            message={message()}
            onRead={() =>
                void audio.read(
                    view().spoken,
                    props.preferences.audio,
                    props.preferences.pace === "slow",
                    () => Promise.resolve(null),
                )
            }
            onAction={(action, answer) => {
                if (action === "return") {
                    audio.stop();
                    props.onClose();
                    return;
                }
                if (action === "answer") void ask(Number(answer));
                else if (action === "continue" || action === "another" || action === "show")
                    void ask(null);
                else if (action === "handoff") props.onClose();
            }}
            onExpand={() => setExpanded((e) => !e)}
            onPause={() => {
                audio.stop();
                setPaused((p) => !p);
            }}
        />
    );
}
