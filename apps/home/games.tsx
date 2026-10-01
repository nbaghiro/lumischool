import { onCleanup, Show, type JSX } from "solid-js";
import { Games as Library } from "../../engine/ui/games";
import { gameRecording } from "../../engine/ui/game-recording";
import { createHeld } from "../../engine/ui/held";
import { useReady } from "../../engine/ui/router";
import * as shared from "./shared";
import { useLook } from "../../engine/ui/page";
import { isParent } from "../../school/family/access";
import { settingIn } from "../../engine/answer";
import * as api from "../../engine/ui/api";

export function Games(): JSX.Element {
    const look = useLook();
    const [who] = createHeld(() => shared.me.read(), [shared.me]);
    useReady(() => who.latest !== undefined);
    return (
        <Show
            when={who()}
            fallback={
                <Library
                    onPlaying={(playing) => look({ wide: true, place: "harbour", stage: playing })}
                />
            }
        >
            {(value) => {
                const parent = value();
                if ("error" in parent || !isParent(parent.members))
                    return (
                        <Library
                            onPlaying={(playing) =>
                                look({ wide: true, place: "harbour", stage: playing })
                            }
                        />
                    );
                return <ParentGames family={parent.family.id} user={parent.user.id} />;
            }}
        </Show>
    );
}

/** Parent play stays unassigned; already-owned offline attempts can still finish syncing. */
function ParentGames(props: { family: string; user: string }): JSX.Element {
    const look = useLook();
    const recording = gameRecording(props.family, props.user, () => {});
    onCleanup(() => recording.dispose());
    const [settings] = createHeld(
        () => shared.events(undefined, { kinds: ["setting-changed"] }).read(),
        [],
    );
    // the family's own levels, from the log; a failed read leaves this device's
    const practice = (): Record<string, number> | undefined => {
        const got = settings();
        if (!got || "error" in got) return undefined;
        const levels: Record<string, number> = {};
        for (const e of got.list)
            if (e.kind === "setting-changed" && e.kid_id === null && e.data.key === "practice") {
                const level = settingIn(got.list, "practice", null, e.data.of);
                if (e.data.of !== null && typeof level === "number") levels[e.data.of] = level;
            }
        return levels;
    };
    const keep = (game: string, level: number): void => {
        void api.append([
            {
                id: api.newId(),
                kid_id: null,
                kind: "setting-changed",
                at: api.nowAt(),
                data: { key: "practice", of: game, value: level },
            },
        ]);
    };
    return (
        <Library
            storageKey={`games.${props.family}.${props.user}.practice`}
            practice={practice}
            onPractice={keep}
            onPlaying={(playing) => look({ wide: true, place: "harbour", stage: playing })}
        />
    );
}
