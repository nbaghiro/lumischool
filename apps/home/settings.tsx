// The settings a grown-up picks that decide which lessons a child is shown: a child's language, on
// their card, and the family's national history unit, on the account page. Each is a
// `setting-changed` event, and the latest wins (engine/answer.ts, `settingIn`).

import { createSignal, Show, type JSX } from "solid-js";
import {
    LANGUAGES,
    NATIONS,
    settingIn,
    type Envelope,
    type SettingChange,
} from "../../engine/answer";
import * as api from "../../engine/ui/api";
import { onThisComputer } from "../../engine/ui/device";
import { failureText } from "../../engine/ui/failure";
import { SelectField } from "../../engine/ui/fields";
import { createHeld } from "../../engine/ui/held";
import { Say } from "../../engine/ui/say";
import { LANGUAGE_NAMES, NATION_NAMES } from "../../school/family/names";
import type { Kid } from "../../server/db/schema";
import * as shared from "./shared";

const local = onThisComputer(location.hostname);

/** The option that clears a setting; a select's value is a string, so none is the empty one. */
const NONE = "";

function Picker(props: {
    label: string;
    hint: string;
    name: string;
    /** The value the log holds, undefined while it is read. */
    value: () => string | null | undefined;
    options: readonly { value: string; label: string }[];
    none: string;
    kid: string | null;
    change: (value: string) => SettingChange | null;
    said: (label: string | null) => string;
}): JSX.Element {
    const [said, setSaid] = createSignal<{ text: string; ok: boolean } | null>(null);
    const pick = async (value: string): Promise<void> => {
        const data = props.change(value);
        if (!data) return;
        setSaid(null);
        const r = await api.append([
            { id: api.newId(), kid_id: props.kid, kind: "setting-changed", at: api.nowAt(), data },
        ]);
        if ("error" in r) {
            setSaid({ text: failureText(r, local), ok: false });
            return;
        }
        const chosen = props.options.find((o) => o.value === value)?.label ?? null;
        setSaid({ text: props.said(chosen), ok: true });
    };
    return (
        <Show when={props.value() !== undefined}>
            <SelectField
                label={props.label}
                hint={props.hint}
                name={props.name}
                value={props.value() ?? NONE}
                options={[{ value: NONE, label: props.none }, ...props.options]}
                onChange={(v) => void pick(v)}
            />
            <Show when={said()}>
                {(s) => <Say text={s().text} tone={s().ok ? "success" : "error"} />}
            </Show>
        </Show>
    );
}

const languageOf = (v: string) => LANGUAGES.find((l) => l === v) ?? null;
const nationOf = (v: string) => NATIONS.find((n) => n === v) ?? null;

/** The setting's value as the family's log holds it, or undefined while it is read. */
function settingRead(kid: string | undefined) {
    const [events] = createHeld(
        () => shared.events(kid, { kinds: ["setting-changed"] }).read(),
        [],
    );
    return (): readonly Envelope[] | undefined => {
        const got = events();
        return got && !("error" in got) ? got.list : undefined;
    };
}

/** The language a child learns in the ferry town, which a grown-up picks for them. */
export function LanguagePicker(props: { kid: Kid }): JSX.Element {
    const log = settingRead(props.kid.id);
    return (
        <Picker
            label="Second language"
            hint="The ferry town teaches the one chosen here. Nothing is offered there until one is."
            name={`language-${props.kid.id}`}
            value={() => {
                const l = log();
                return l ? (settingIn(l, "language", props.kid.id) ?? null) : undefined;
            }}
            options={LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))}
            none="Not chosen yet"
            kid={props.kid.id}
            change={(v) =>
                v === NONE || languageOf(v)
                    ? { key: "language", of: null, value: languageOf(v) }
                    : null
            }
            said={(label) =>
                label === null || label === "Not chosen yet"
                    ? `${props.kid.name} has no second language for now.`
                    : `${props.kid.name} learns ${label} from today.`
            }
        />
    );
}

/** The country whose national history unit the family's children read each year. */
export function NationPicker(): JSX.Element {
    const log = settingRead(undefined);
    return (
        <Picker
            label="National history unit"
            hint="One history lesson a year is about a country. The rest of history is the same for every family."
            name="nation"
            value={() => {
                const l = log();
                return l ? (settingIn(l, "nation", null) ?? null) : undefined;
            }}
            options={NATIONS.map((n) => ({ value: n, label: NATION_NAMES[n] }))}
            none="None for now"
            kid={null}
            change={(v) =>
                v === NONE || nationOf(v) ? { key: "nation", of: null, value: nationOf(v) } : null
            }
            said={(label) =>
                label === null || label === "None for now"
                    ? "The children read the shared history only."
                    : `The children's national unit is about ${label.replace(/^The /, "the ")}.`
            }
        />
    );
}
