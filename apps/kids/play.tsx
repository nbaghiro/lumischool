// A child's games and painting, the bar's other two places beside the map (bar.tsx, main.tsx). Each is
// the grown-ups' own screen as a child meets it: the games library played and not recorded, since a
// game round is written by a grown-up's page only (school/family/access.ts), and the easel with the
// child's pictures kept on the device their view is open on (engine/ui/painting-device.ts).

import { Show, type JSX } from "solid-js";
import { Games } from "../../engine/ui/games";
import { useLook } from "../../engine/ui/page";
import { PaintingGallery } from "../../engine/ui/painting-gallery";
import { devicePaintingGateway } from "../../engine/ui/painting-device";
import type { Kid } from "../../server/db/schema";
import type { Place } from "./bar";

function KidGames(props: { kid: Kid; onMap: () => void }): JSX.Element {
    const look = useLook();
    // the logo is the way back to the map, as the grown-ups' goes back to their home
    const logo = { go: props.onMap };
    look({ logo, wide: true, place: "harbour" });
    return (
        <Games
            storageKey={`kids.${props.kid.id}.practice`}
            onPlaying={(playing) => look({ logo, wide: true, place: "harbour", stage: playing })}
        />
    );
}

function KidPainting(props: { kid: Kid; onMap: () => void }): JSX.Element {
    useLook()({
        logo: { go: props.onMap },
        wide: true,
        stage: true,
        stageBackdrop: true,
        place: "meadow",
    });
    return (
        <PaintingGallery
            gateway={devicePaintingGateway(props.kid.id)}
            storageKey={`kids.${props.kid.id}.painting`}
            identityKey={props.kid.id}
            children={[]}
        />
    );
}

export function KidPlace(props: { kid: Kid; place: Place; onMap: () => void }): JSX.Element {
    return (
        <Show
            when={props.place === "games"}
            fallback={<KidPainting kid={props.kid} onMap={props.onMap} />}
        >
            <KidGames kid={props.kid} onMap={props.onMap} />
        </Show>
    );
}
