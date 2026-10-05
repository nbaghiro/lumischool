// A grown-up's own stamp, for the grown-ups' bar and account page, apart from kids.tsx so a child's
// page never carries the grown-ups' portraits.
import type { JSX } from "solid-js";
import { portraitFor, type GrownupKind } from "../parts/apps/grownup";
import type { Me } from "../../server/api";
import { Drawing } from "./art";
import "./kids.css";
import { Stamp } from "./postcard";

/** The portrait on a grown-up's stamp (engine/parts/apps/grownup.ts). */
export const portraitOf = (me: Pick<Me, "user">): GrownupKind => {
    const s = me.user.settings;
    return portraitFor(
        me.user.id,
        typeof s === "object" && s !== null && "picture" in s ? s.picture : null,
    );
};

/**
 * A grown-up as a child is drawn, with a difference: their head and shoulders on a square stamp with
 * a quiet ground, larger than a child's tall one, so the two kinds sit together and read apart.
 */
export function GrownStamp(props: { me: Pick<Me, "user"> }): JSX.Element {
    return (
        <span class="kid-portrait gb-me-stamp" aria-hidden="true">
            <Stamp
                class="kid-stamp-paper"
                picture="none"
                value=""
                ground="sky"
                quiet
                shape="square"
                seed={877}
            />
            <Drawing
                class="kid-stamp-pic"
                id="grownup"
                params={{ kind: portraitOf(props.me) }}
                seed={878}
            />
        </span>
    );
}
