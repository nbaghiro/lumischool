import "./plan.css";
import {
    createMemo,
    createResource,
    createSignal,
    createUniqueId,
    For,
    Show,
    type JSX,
} from "solid-js";
import { onThisComputer } from "../../engine/ui/device";
import { failureText } from "../../engine/ui/failure";
import { TextButton } from "../../engine/ui/fields";
import { Button } from "../../engine/ui/form";
import { grownRecord } from "../../engine/ui/grown";
import { Say } from "../../engine/ui/say";
import { Near } from "../../engine/ui/viewport";
import type { Failure } from "../../engine/ui/wire";
import { gradeName } from "../../school/family/names";
import type { GrownRecord } from "../../server/api";
import type { Kid } from "../../server/db/schema";
import { Card, writing, type Write } from "./cards";
import { names, placeName } from "./grown";
import type { Loaded } from "./log";
import type { TermToChoose } from "./worlds";

const local = onThisComputer(location.hostname);

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
type Open = (card: JSX.Element | null) => void;
const WORLD_W = 160;
type WorldsModel = typeof import("./worlds");

/**
 * The terms with a world made for them and no work in them yet, in this grade and the next, one line
 * each with the choice on a card. A term with work in it keeps its world, since what the work made
 * is drawn there, and is not listed.
 */
export function Worlds(props: {
    loaded: Loaded;
    kid: Kid;
    onWrite: Write;
    onCard: Open;
}): JSX.Element {
    const [read, { refetch }] = createResource(
        () => [props.kid.id, props.loaded] as const,
        async ([id]) => {
            const [record, model] = await Promise.all([grownRecord(id), import("./worlds")]);
            return "error" in record ? record : { record, model };
        },
    );
    const got = (): { record: GrownRecord; model: WorldsModel } | null => {
        const r = read.latest;
        return r && !("error" in r) ? r : null;
    };
    const failed = (): Failure | null => {
        const r = read.latest;
        return r && "error" in r ? r : null;
    };
    const terms = createMemo((): TermToChoose[] => {
        const g = got();
        return g ? g.model.openChoices(props.kid, g.record) : [];
    });
    const byGrade = (grade: number): TermToChoose[] => terms().filter((t) => t.grade === grade);
    const nameOf = (t: TermToChoose, world: string): string =>
        placeName({ name: t.options.find((o) => o.id === world)?.name ?? world });
    const madeFor = (t: TermToChoose): string[] =>
        t.options.filter((o) => !o.own).map((o) => placeName(o));
    const line = (t: TermToChoose): string => {
        const made = madeFor(t);
        return `${gradeName(t.grade)}, term ${t.term} is in ${nameOf(t, t.now)}. ${capital(names(made))} ${made.length > 1 ? "were" : "was"} made for it.`;
    };
    const open = (t: TermToChoose): void => {
        const g = got();
        if (!g) return;
        props.onCard(
            <WorldCard
                kid={props.kid}
                term={t}
                record={g.record}
                model={g.model}
                onClose={() => props.onCard(null)}
                onWrite={props.onWrite}
            />,
        );
    };
    const id = createUniqueId();
    return (
        <>
            <Show when={failed()}>
                {(f) => (
                    <Say
                        text={`${props.kid.name}'s worlds did not load. ${failureText(f(), local)}`}
                        action={{ label: "Try again", run: () => void refetch() }}
                    />
                )}
            </Show>
            <For each={[props.kid.grade, props.kid.grade + 1]}>
                {(grade) => (
                    <Show when={byGrade(grade).length}>
                        <section class="gp-worlds" aria-labelledby={`${id}-${grade}`}>
                            <h3 id={`${id}-${grade}`} class="kicker">
                                {grade === props.kid.grade
                                    ? "This year's worlds"
                                    : "Next year's worlds"}
                            </h3>
                            <For each={byGrade(grade)}>
                                {(t) => (
                                    <p>
                                        <span>{line(t)}</span>
                                        <TextButton
                                            label={`Choose the world for ${gradeName(t.grade)}, term ${t.term}`}
                                            onClick={() => open(t)}
                                        >
                                            Choose
                                        </TextButton>
                                    </p>
                                )}
                            </For>
                        </section>
                    </Show>
                )}
            </For>
        </>
    );
}

/** The card a term's world is chosen on: the worlds as pictures, the one in force pressed, and Keep this. */
function WorldCard(props: {
    kid: Kid;
    term: TermToChoose;
    record: GrownRecord;
    model: WorldsModel;
    onClose: () => void;
    onWrite: Write;
}): JSX.Element {
    const t = props.term;
    const [picked, setPicked] = createSignal(t.now);
    const when = `${gradeName(t.grade)}, term ${t.term}`;
    const draw =
        (world: string) =>
        async (host: HTMLElement): Promise<void> => {
            const { paintWorld } = await import("./where");
            await paintWorld(props.model.worldAs(props.kid, props.record, world), host, WORLD_W);
        };
    const keep = (): void => {
        const draft = props.model.chooseWorlds(
            writing(),
            props.kid,
            props.record,
            new Map([[props.model.termKey(t), picked()]]),
        );
        if (!draft) {
            props.onClose();
            return;
        }
        const name = placeName({ name: t.options.find((o) => o.id === picked())?.name ?? "" });
        void props.onWrite(
            [draft],
            `${props.kid.name}'s ${when.toLowerCase()} is in ${name} from now on. A term already worked in stays as it was.`,
        );
    };
    return (
        <Card
            kicker={`${props.kid.name}'s worlds`}
            title={when}
            lead="The term's own world, or one made for it. Once work is done there, the term keeps its world."
            onClose={props.onClose}
        >
            <fieldset class="gp-world-picks">
                <legend class="sr">{when}</legend>
                <For each={t.options}>
                    {(o, i) => (
                        <button
                            type="button"
                            class="gp-world-pick"
                            aria-pressed={picked() === o.id}
                            data-focus={i() === 0 ? "" : undefined}
                            onClick={() => setPicked(o.id)}
                        >
                            <Near class="gp-world-pic" draw={draw(o.id)} />
                            <span class="gp-world-name">{o.name}</span>
                            <span class="gp-world-sub">
                                {o.own ? "The term's own" : "Made for this term"}
                            </span>
                        </button>
                    )}
                </For>
            </fieldset>
            <div class="acts">
                <Button onClick={keep}>Keep this</Button>
            </div>
        </Card>
    );
}
