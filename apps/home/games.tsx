import { createResource, onCleanup, Show, type JSX } from "solid-js";
import { Games as Library } from "../../engine/ui/games";
import { gameRecording } from "../../engine/ui/game-recording";
import * as api from "../../engine/ui/api";
import { useLook } from "../../engine/ui/page";
import { isParent } from "../../school/family/access";

export function Games(): JSX.Element {
    const look = useLook();
    const [who] = createResource(() => api.me({ ask: true }));
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
    return (
        <Library
            storageKey={`games.${props.family}.${props.user}.practice`}
            onPlaying={(playing) => look({ wide: true, place: "harbour", stage: playing })}
        />
    );
}
