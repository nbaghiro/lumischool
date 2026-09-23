import { Icon } from "./icon";
import { Select } from "./select";
import {
    createEffect,
    createSignal,
    createUniqueId,
    For,
    onCleanup,
    onMount,
    Show,
    untrack,
    type JSX,
} from "solid-js";
import { GAMES, gameById } from "../../school/games/catalogue";
import type { Game } from "../../school/games/game";
import type { Drawing } from "../parts/drawing";
import type { Cue } from "../motion/cues";
import { loadDrawings } from "./drawings";
import { render } from "./svg";
import { Field, Stage } from "./stage";
import { action } from "./game-action";
import { turn } from "./game-turn";
import type { Runtime, Shell } from "./game-host";
import "./games.css";

function Cover(props: { game: Game }): JSX.Element {
    let host: HTMLSpanElement | undefined;
    onMount(() => {
        let stopped = false;
        onCleanup(() => {
            stopped = true;
        });
        void loadDrawings([props.game.cover.art]).then((shelf) => {
            const drawing = shelf.drawing(props.game.cover.art);
            if (stopped || !drawing || !host) return;
            const defaults = typeof drawing.params === "object" ? drawing.params : {};
            const image = render(
                drawing,
                { ...defaults, ...props.game.cover.params },
                { seed: 2711 },
            );
            host.replaceChildren(image.svg);
        });
    });
    return (
        <span
            class="game-cover"
            ref={(el) => {
                host = el;
            }}
            aria-hidden="true"
        />
    );
}

export function Games(props: { onPlaying?: (playing: boolean) => void }): JSX.Element {
    const challengeId = createUniqueId();
    const params = new URLSearchParams(location.search);
    const [chosen, choose] = createSignal<Game | undefined>(gameById(params.get("g")));
    const [level, setLevel] = createSignal(
        Math.min(
            chosen() ? (chosen()?.levels.length ?? 1) - 1 : 0,
            Math.max(0, Math.floor(Number(params.get("v")))) || 0,
        ),
    );
    const [run, setRun] = createSignal(0);
    const [paused, pause] = createSignal(Boolean(chosen()));
    const [begun, begin] = createSignal(false);
    let menu: HTMLDialogElement | undefined;
    const [sound, setSound] = createSignal(false);
    const [quiet, setQuiet] = createSignal(false);
    const [text, setText] = createSignal(false);
    const [failure, fail] = createSignal("");
    let room: HTMLElement | undefined;
    let libraryScroll = 0;
    let lastGame = "";
    let host: HTMLDivElement | undefined;
    let runtime: Runtime | undefined;
    let audio: AudioContext | undefined;
    const hear = (cue: Cue): void => {
        if (!sound() || !audio || paused()) return;
        const hz: Record<Cue, number> = {
            lift: 330,
            place: 440,
            back: 294,
            nope: 220,
            bump: 160,
            crash: 110,
            level: 660,
            ring: 880,
            splash: 260,
            win: 784,
        };
        const oscillator = audio.createOscillator(),
            gain = audio.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = hz[cue];
        gain.gain.setValueAtTime(0.06, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.16);
        oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
        };
    };
    const select = (g: Game | undefined, v = 0): void => {
        const previous = chosen();
        if (!previous && g) libraryScroll = scrollY;
        if (previous) lastGame = previous.id;
        choose(g);
        setLevel(v);
        pause(Boolean(g));
        begin(false);
        fail("");
        const url = new URL(location.href);
        url.search = g ? new URLSearchParams({ g: g.id, v: String(v) }).toString() : "";
        if (previous?.id === g?.id) history.replaceState(null, "", url);
        else history.pushState(null, "", url);
        if (!g)
            queueMicrotask(() => {
                room?.querySelector<HTMLElement>(`[data-game-id="${lastGame}"]`)?.focus({
                    preventScroll: true,
                });
                scrollTo(0, libraryScroll);
            });
    };
    createEffect(() => props.onPlaying?.(Boolean(chosen())));
    createEffect(() => {
        if (paused() && chosen()) menu?.showModal();
        else menu?.close();
    });
    const resume = (): void => {
        begin(true);
        pause(false);
        (
            host?.querySelector<HTMLElement>(".sheet:not([hidden])") ??
            host?.querySelector<HTMLElement>(".board")
        )?.focus({
            preventScroll: true,
        });
    };
    onCleanup(() => {
        props.onPlaying?.(false);
        if (audio) void audio.close();
    });
    onMount(() => {
        const fitPage = (): void => {
            if (room)
                room.style.setProperty(
                    "--game-page-top",
                    `${Math.max(0, room.getBoundingClientRect().top + scrollY)}px`,
                );
        };
        const layout = new ResizeObserver(fitPage);
        if (room) layout.observe(room);
        const bar = room?.closest(".page")?.querySelector(".page-top");
        if (bar) layout.observe(bar);
        onCleanup(() => layout.disconnect());
        const media = matchMedia("(prefers-reduced-motion: reduce)");
        setQuiet(media.matches);
        const motion = () => setQuiet(media.matches);
        const blur = () => {
            runtime?.release?.();
            pause(true);
        };
        const back = () => {
            const query = new URLSearchParams(location.search);
            const game = gameById(query.get("g"));
            choose(game);
            setLevel(
                Math.min(
                    game ? game.levels.length - 1 : 0,
                    Math.max(0, Math.floor(Number(query.get("v"))) || 0),
                ),
            );
            pause(Boolean(game));
            begin(false);
        };
        window.addEventListener("popstate", back);
        const visibility = () => {
            if (document.hidden) blur();
        };
        media.addEventListener("change", motion);
        window.addEventListener("blur", blur);
        document.addEventListener("visibilitychange", visibility);
        onCleanup(() => {
            window.removeEventListener("popstate", back);
            media.removeEventListener("change", motion);
            window.removeEventListener("blur", blur);
            document.removeEventListener("visibilitychange", visibility);
        });
    });
    createEffect(() => {
        paused();
        runtime?.release?.();
    });
    createEffect(() => {
        quiet();
        runtime?.redraw();
    });
    createEffect(() => {
        const game = chosen(),
            version = level();
        run();
        if (!game || !host) return;
        const root = host;
        return untrack(() => {
            let ended = false;
            const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
                const element = root.querySelector<T>(`[data-game="${id}"]`);
                if (!element) throw new Error(`Missing game control: ${id}`);
                return element;
            };
            class Art extends Map<string, Drawing<unknown>> {
                pending = new Set<string>();
                override get(ref: string): Drawing<unknown> | undefined {
                    const found = super.get(ref);
                    if (!found && !this.pending.has(ref)) {
                        this.pending.add(ref);
                        void loadDrawings([ref])
                            .then((shelf) => {
                                if (ended) return;
                                const drawing = shelf.drawing(ref);
                                if (drawing) {
                                    this.set(ref, drawing);
                                    stage.loaded(ref);
                                    runtime?.redraw();
                                }
                            })
                            .catch(() => {
                                if (!ended)
                                    fail("A drawing could not load. Please try Start again.");
                            });
                    }
                    return found;
                }
            }
            const art = new Art();
            const board = $("board");
            board.replaceChildren();
            const stage = new Stage({
                host: board,
                art,
                still: quiet,
                onFrame: (t) => runtime?.frame?.(t),
            });
            const field = new Field({ host: board, art, still: quiet });
            stage.sheet.hidden = true;
            field.el.hidden = true;
            const shell: Shell = {
                $,
                art,
                still: quiet,
                paused,
                hear,
                guide: () => {},
                rows: () => {},
                tuning: () => {},
                keys: (words) => {
                    $("keys").textContent = words;
                },
                room: () => ({
                    w: Math.max(240, board.clientWidth),
                    h: Math.max(180, board.clientHeight),
                    side: false,
                }),
            };
            try {
                const v = Math.min(version, game.levels.length - 1);
                runtime =
                    game.group === "action"
                        ? action(shell, field, game, v)
                        : turn(shell, stage, game, v, []);
            } catch (error) {
                fail(error instanceof Error ? error.message : "The game could not open.");
            }
            const keys = (e: KeyboardEvent) => {
                if (e.key === "Escape" && e.type === "keydown" && !paused()) {
                    e.preventDefault();
                    pause(true);
                    return;
                }
                if (
                    paused() ||
                    e.target instanceof HTMLSelectElement ||
                    e.target instanceof HTMLInputElement
                )
                    return;
                if (
                    !root.contains(document.activeElement) &&
                    document.activeElement !== document.body
                )
                    return;
                runtime?.key(e);
            };
            window.addEventListener("keydown", keys);
            window.addEventListener("keyup", keys);
            const resize = new ResizeObserver(() => runtime?.resize());
            resize.observe(board);
            onCleanup(() => {
                ended = true;
                runtime?.stop();
                runtime = undefined;
                stage.clear();
                field.clear();
                resize.disconnect();
                window.removeEventListener("keydown", keys);
                window.removeEventListener("keyup", keys);
            });
        });
    });
    return (
        <section
            ref={(el) => {
                room = el;
            }}
            class="game-room"
            classList={{ playing: Boolean(chosen()) }}
            aria-label="Games"
        >
            <Show
                when={chosen()}
                fallback={
                    <>
                        <header class="game-heading">
                            <p class="game-kicker">A little room to play</p>
                            <h1>Games</h1>
                            <p>Explore, experiment, and try another way. Pick something to play.</p>
                        </header>
                        <div class="game-library">
                            <For each={GAMES.filter((g) => g.listed !== false)}>
                                {(g) => (
                                    <button
                                        class="game-card"
                                        data-game-id={g.id}
                                        onClick={() => select(g)}
                                    >
                                        <Cover game={g} />
                                        <strong>{g.title}</strong>
                                        <span>
                                            {g.levels.length} levels ·{" "}
                                            {g.group === "action"
                                                ? "Move and explore"
                                                : "Think and tinker"}
                                        </span>
                                    </button>
                                )}
                            </For>
                        </div>
                    </>
                }
            >
                {(g) => (
                    <div
                        class="game-player"
                        classList={{ tabletop: g().group !== "action" }}
                        ref={(el) => {
                            host = el;
                        }}
                    >
                        <header class="game-toolbar">
                            <button
                                class="game-icon"
                                aria-label="All games"
                                title="All games"
                                onClick={() => select(undefined)}
                            >
                                <Icon name="back" />
                            </button>
                            <h1>{g().title}</h1>
                            <span class="game-challenge">{g().levels[level()]?.title}</span>
                            <button
                                class="game-icon"
                                aria-label="Pause &amp; help"
                                title="Pause &amp; help"
                                onClick={() => pause(true)}
                            >
                                <Icon name="pause" />
                            </button>
                        </header>
                        <p data-game="aside" aria-live="polite" />
                        <Show when={failure()}>
                            <p role="alert">{failure()}</p>
                        </Show>
                        <div class="game-stage-wrap">
                            <div class="arena" inert={paused()}>
                                <div
                                    data-game="board"
                                    class="board"
                                    role="application"
                                    tabIndex={-1}
                                    aria-label={`${g().title} play area`}
                                />
                            </div>
                        </div>
                        <div class="hands" inert={paused()}>
                            <div data-game="tray" class="tray" />
                            <div data-game="pad" class="pad" />
                            <div class="game-actions">
                                <button
                                    class="game-icon"
                                    data-game="undo"
                                    aria-label="Undo last move"
                                    title="Undo last move"
                                    onClick={() => runtime?.undo?.()}
                                >
                                    <Icon name="undo" />
                                </button>
                                <button
                                    data-game="another"
                                    hidden
                                    onClick={() =>
                                        level() + 1 < g().levels.length
                                            ? select(g(), level() + 1)
                                            : select(undefined)
                                    }
                                >
                                    {level() + 1 < g().levels.length
                                        ? "Another challenge"
                                        : "All games"}
                                </button>
                            </div>
                        </div>
                        <dialog
                            class="game-menu"
                            aria-label={`${g().title}: play and settings`}
                            ref={(el) => {
                                menu = el;
                                if (paused())
                                    queueMicrotask(() => {
                                        if (el.isConnected && !el.open) el.showModal();
                                    });
                            }}
                            onCancel={(e) => {
                                e.preventDefault();
                                resume();
                            }}
                        >
                            <header class="game-menu-heading">
                                <div class="game-stamp">
                                    <Cover game={g()} />
                                </div>
                                <div>
                                    <p class="game-kicker">
                                        {begun() ? "A little breather" : "A little room to play"}
                                    </p>
                                    <h2>{g().title}</h2>
                                </div>
                            </header>
                            <label class="game-level" for={challengeId}>
                                Choose a challenge
                                <Select
                                    id={challengeId}
                                    value={level()}
                                    onChange={(e) => select(g(), Number(e.currentTarget.value))}
                                >
                                    <For each={g().levels}>
                                        {(l, i) => (
                                            <option value={i()}>
                                                {i() + 1}. {l.title}
                                            </option>
                                        )}
                                    </For>
                                </Select>
                            </label>
                            <details class="game-help" open={!begun()}>
                                <summary>How to play</summary>
                                <p data-game="goal" class="game-goal" />
                                <p data-game="keys" class="game-keys" />
                            </details>
                            <details class="game-help">
                                <summary>Sound &amp; accessibility</summary>
                                <div class="game-options">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={sound()}
                                            onChange={(e) => {
                                                audio ??= new AudioContext();
                                                void audio.resume();
                                                setSound(e.currentTarget.checked);
                                            }}
                                        />
                                        Sound
                                    </label>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={quiet()}
                                            onChange={(e) => setQuiet(e.currentTarget.checked)}
                                        />
                                        Reduced motion
                                    </label>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={text()}
                                            onChange={(e) => setText(e.currentTarget.checked)}
                                        />
                                        Describe the scene
                                    </label>
                                </div>
                            </details>
                            <div class="game-actions game-menu-actions">
                                <button
                                    class="game-primary"
                                    aria-label={begun() ? "Continue playing" : "Play"}
                                    onClick={resume}
                                >
                                    <Icon name="play" /> {begun() ? "Continue" : "Play"}
                                </button>
                                <button
                                    class="game-icon"
                                    aria-label="Start again"
                                    title="Start again"
                                    data-game="again"
                                    onClick={() => {
                                        setRun(run() + 1);
                                        resume();
                                    }}
                                >
                                    <Icon name="restart" />
                                </button>
                                <button
                                    class="game-icon"
                                    aria-label="All games"
                                    title="All games"
                                    onClick={() => select(undefined)}
                                >
                                    <Icon name="back" />
                                </button>
                            </div>
                        </dialog>
                        <p data-game="reads" hidden={!text()} aria-live="polite" />
                        <div hidden>
                            <input data-game="spoken" type="checkbox" checked={text()} />
                            <input data-game="panels" type="checkbox" />
                            <section data-game="panel-2" />
                        </div>
                    </div>
                )}
            </Show>
        </section>
    );
}
