import { createEffect, createSignal, onCleanup, type JSX } from "solid-js";
import {
    reduceTeaching,
    startTeaching,
    viewOfFrame,
    teachingObject,
    validTeachingState,
    type TeachingAction,
    type TeachingCommand,
    type TeachingMaterial,
    type TeachingPreferences,
    type TeachingState,
} from "../teaching";
import { TeachingBoard } from "./teaching";
import { teachingAudio } from "./teaching-audio";
import type { Answer } from "./wire";
export interface TeachingGateway {
    start(id: string, material: string, preferences: TeachingPreferences): Promise<Answer>;
    load(id: string): Promise<Answer>;
    turn(id: string, command: TeachingCommand): Promise<Answer>;
    audio(id: string, revision: number, signal: AbortSignal): Promise<Blob | null>;
}
/** Route-free controller: the app supplies access, identity and school policy. */
export function TeachingSession(props: {
    material: TeachingMaterial;
    preferences: TeachingPreferences;
    gateway: TeachingGateway;
    identity: string;
    compact?: boolean;
    /** False where a dialog frames the board and provides the only way out. */
    wayOut?: boolean;
    next: (
        material: TeachingMaterial,
        state: TeachingState,
        command: TeachingCommand,
    ) => TeachingState;
    onClose: () => void;
}): JSX.Element {
    const preferences = { ...props.preferences };
    const fresh = () => ({ ...startTeaching(props.material), expanded: !props.compact });
    const [state, setState] = createSignal(fresh());
    const [session, setSession] = createSignal<string | null>(null);
    const [busy, setBusy] = createSignal(false);
    const [message, setMessage] = createSignal("");
    const audio = teachingAudio();
    let ticket = 0;
    let ready = false;
    let alive = true;
    const storageKey = `lumischool.teaching.${props.identity}.${props.material.id}`;
    const save = () => {
        if (!ready || !alive || state().status === "requesting") return;
        try {
            sessionStorage.setItem(storageKey, JSON.stringify({ id: session(), state: state() }));
        } catch {
            /* optional recovery */
        }
    };
    createEffect(() => {
        void state().revision;
        void state().status;
        audio.stop();
        save();
    });
    const initialise = async () => {
        const current = ++ticket;
        setBusy(true);
        let previous: unknown = null;
        try {
            previous = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
        } catch {
            /* start fresh */
        }
        if (
            teachingObject(previous) &&
            validTeachingState(previous.state) &&
            previous.state.status !== "ended" &&
            previous.state.materialVersion === props.material.version &&
            typeof previous.id === "string"
        ) {
            const loaded = await props.gateway.load(previous.id);
            if (current !== ticket) return;
            if (loaded.ok && teachingObject(loaded.body) && validTeachingState(loaded.body.state)) {
                setState({ ...loaded.body.state, expanded: !props.compact });
                setSession(previous.id);
                setBusy(false);
                return;
            }
        }
        const id = crypto.randomUUID();
        const response = await props.gateway.start(id, props.material.id, preferences);
        if (current !== ticket) return;
        if (
            response.ok &&
            teachingObject(response.body) &&
            validTeachingState(response.body.state)
        ) {
            setSession(id);
            setState({ ...response.body.state, expanded: !props.compact });
        } else setMessage("Using the prepared lesson. You can keep going.");
        setBusy(false);
    };
    void initialise().finally(() => {
        if (alive) {
            ready = true;
            save();
        }
    });
    const act = async (action: TeachingAction, answer?: string) => {
        if (action === "return") {
            ++ticket;
            audio.stop();
            save();
            props.onClose();
            return;
        }
        if (busy() || state().status === "ended") return;
        audio.stop();
        const before = state();
        const command: TeachingCommand = {
            operationId: crypto.randomUUID(),
            expectedRevision: before.revision,
            action,
            ...(answer === undefined ? {} : { answer }),
        };
        const id = session();
        if (!id) {
            setState(props.next(props.material, before, command));
            return;
        }
        const current = ++ticket;
        setBusy(true);
        setState(reduceTeaching(before, { kind: "request" }));
        let response = await props.gateway.turn(id, command);
        // Same operation id on a transient retry; never charge or record a second turn.
        if (!response.ok && response.failure.error === "offline")
            response = await props.gateway.turn(id, command);
        if (current !== ticket) return;
        if (
            response.ok &&
            teachingObject(response.body) &&
            validTeachingState(response.body.state)
        ) {
            const accepted = response.body.state;
            setState((s) =>
                reduceTeaching(s, {
                    kind: "accept",
                    expectedRevision: before.revision,
                    state: accepted,
                }),
            );
            setMessage("");
        } else {
            setSession(null);
            setState(props.next(props.material, before, command));
            setMessage("Using the prepared lesson. You can keep going.");
        }
        setBusy(false);
    };
    const hasAnother = (): boolean => {
        const frame = props.material.frames.find((f) => f.id === state().step.frameId);
        return !!(frame?.alternative ?? frame?.bridge);
    };
    const read = () =>
        void audio.read(
            state().step.spokenText,
            preferences.audio,
            preferences.pace === "slow",
            (signal) => {
                const id = session();
                return id
                    ? props.gateway.audio(id, state().revision, signal)
                    : Promise.resolve(null);
            },
        );
    const hidden = () => {
        if (document.hidden) {
            audio.stop();
            setState((s) => reduceTeaching(s, { kind: "pause" }));
        }
    };
    document.addEventListener("visibilitychange", hidden);
    onCleanup(() => {
        alive = false;
        ++ticket;
        audio.stop();
        document.removeEventListener("visibilitychange", hidden);
    });
    return (
        <TeachingBoard
            view={viewOfFrame(props.material, state())}
            another={hasAnother()}
            state={state()}
            preferences={preferences}
            wayOut={props.wayOut}
            busy={busy()}
            message={message()}
            onRead={read}
            onAction={(action, answer) => void act(action, answer)}
            onExpand={() =>
                setState((s) => reduceTeaching(s, { kind: "expand", expanded: !s.expanded }))
            }
            onPause={() => {
                audio.stop();
                setState((s) =>
                    reduceTeaching(s, { kind: s.status === "paused" ? "resume" : "pause" }),
                );
            }}
        />
    );
}
