import type { JSX } from "solid-js";
import { Games as Library } from "../../engine/ui/games";
import { useLook } from "../../engine/ui/page";

export function Games(): JSX.Element {
    const look = useLook();
    return (
        <Library onPlaying={(playing) => look({ wide: true, place: "harbour", stage: playing })} />
    );
}
