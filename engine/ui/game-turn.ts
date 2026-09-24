import type { Cue } from "../motion/cues";
import { followedBy } from "../motion/beat";
import { Hands, type Choice, type Handle, type Release, type Stop } from "../../school/games/hands";
import type { Target } from "../../school/games/pieces";
import type { Scene } from "../motion/scene";
import type { Stage } from "./stage";
import { alongPath, isCircle, type Pt } from "../motion/geometry";
import { SPRINGS } from "../motion/spring";
import { collapse, cuesBetween, done, valueAt, type Timeline } from "../motion/timeline";
import {
    line as traceLine,
    moves as traceMoves,
    note,
    summarise as summariseTrace,
    trace,
    type How,
    type Trace,
    type TraceEvent,
} from "../motion/trace";
import type { Session } from "../../school/games/hands";
import type { TurnGame } from "../../school/games/game";
import {
    begin,
    far,
    line as attemptLine,
    record,
    summarise as summariseAttempt,
    type Attempt,
} from "../../school/games/log";
import {
    distance,
    explore,
    nudge,
    prove,
    type Explored,
    type Proof,
} from "../../school/games/prove";
import type { Position, Round } from "../../school/games/games";
import { render } from "./svg";
import type { Runtime, Shell } from "./game-host";

/** Twenty seconds with no move is when the guide points at one. It points, it does not move. */
const NUDGE_MS = 20_000;

interface State {
    round: Round;
    ex: Explored;
    proof: Proof;
    session: Session<Position>;
    history: Position[];
    attempt: Attempt;
    trace: Trace;
    focus: number;
    /** 0 for no nudge yet, 1 for pointing, 2 for saying it in words. */
    nudges: number;
    win: { tl: Timeline; t0: number; fired: number } | null;
    aside: string;
    /** The scene last given to the stage, which the next move's beat starts from. */
    scene: Scene | null;
}

export function turn(
    shell: Shell,
    stage: Stage,
    game: TurnGame,
    level: number,
    replay: number[],
): Runtime {
    const { $, art } = shell;
    const minTarget = (): number => 44 / stage.sq;
    const ctx = { stage, minTarget };
    const selected = game.levels[level] ?? game.levels[0];
    if (!selected) throw new Error("This game has no levels.");
    const round = selected.round();
    const ex = explore(round);
    const state: State = {
        round,
        ex,
        proof: prove(round, ex),
        session: game.open(round, ctx),
        history: [round.start],
        attempt: begin(round, distance(ex, round.start)),
        trace: trace(),
        focus: 0,
        nudges: 0,
        win: null,
        aside: "",
        scene: null,
    };
    const intro = selected.intro ?? "";
    let timer = 0;
    let stopped = false;
    const here = (): Position => state.history[state.history.length - 1] ?? round.start;
    const outOfMoves = (): boolean => !here().won && here().moves.length === 0;

    const hands = new Hands<Position>(stage, {
        here,
        session: () => state.session,
        play: (moves, how, extra, prefer, hand) => play(moves, how, extra, prefer, hand),
        miss: (extra) => {
            note(state.trace, { t: stage.time, move: null, how: "drag", ...extra });
            draw();
        },
        hear: shell.hear,
        say: (text) => {
            state.aside = text;
            shell.feedback(text);
        },
        reach: () => ({ reach: Math.max(1, 22 / stage.sq), flickSeconds: 0.35, minSpeed: 14 }),
        floor: minTarget,
    });
    const unbind = stage.pointer({
        hit: (p) => hands.hit(p),
        on: (g, key) => {
            if (shell.paused()) return;
            hands.gesture(g, key);
            if (g.kind === "drag-start") shell.guide("point");
        },
        feel: { slop: 0.4, holdMs: 450, flickSpeed: 14, window: 100 },
    });

    /** How big a square is, from the room the arena has and the sheet's size in squares, so the board fits the window. */
    function sizeBoard(): void {
        const host = $("board");
        const room = shell.room();
        const w = Math.max(14, stage.bounds.w) + 2,
            h = Math.max(8, stage.bounds.h) + 2;
        if (!room.w) return;
        // As small as six pixels a square on a phone held upright, so a wide scene shrinks to fit rather
        // than running off the side; a handle is still grown to the 44 pixel floor when it is pressed.
        const sq = Math.max(6, Math.min(Math.floor(room.w / w), Math.floor(room.h / h)));
        host.style.setProperty("--sq", `${sq}px`);
        // On a phone the tray is under the board, and the room the page gives the board has a floor, so a
        // tall tray can still push the page past the window; the board gives up what it overflows by.
        if (!room.side) {
            const over = document.documentElement.scrollHeight - innerHeight;
            if (over > 0)
                host.style.setProperty("--sq", `${Math.max(6, sq - Math.ceil(over / h))}px`);
        }
    }

    /** Draws the position, with the scene a move already worked out when there is one, and leaves the board to a beat that is playing. */
    function draw(scene?: Scene): void {
        if (stopped) return;
        const pos = here();
        const s = state.session;
        const hadFocus = document.activeElement?.classList.contains("chip") ?? false;
        state.scene = scene ?? s.parts(pos);
        if (!stage.busy) stage.show(state.scene, { morph: s.morph, glide: s.glide });
        s.after?.(pos);
        const hint = state.nudges > 1 && !pos.won ? nudge(state.ex, pos) : null;
        $("goal").textContent = pos.won ? game.ends.won : state.round.goal;
        shell.feedback(
            pos.won
                ? game.ends.won
                : outOfMoves()
                  ? game.ends.stuck
                  : hint !== null
                    ? `Try this: ${pos.moves[hint]?.say.toLowerCase()}.`
                    : state.nudges
                      ? "Have a look at the one with the ring round it."
                      : state.aside || (state.history.length === 1 ? intro : ""),
            pos.won,
        );
        $("reads").textContent = pos.say;
        const back = $<HTMLButtonElement>("undo");
        back.hidden = false;
        back.disabled = state.history.length < 2 || !state.round.reversible;
        back.title = state.round.reversible
            ? "Undo last move"
            : "A number you have fed in cannot be unfed.";
        $("another").hidden = !pos.won;
        shell.keys(
            handy
                ? `${game.hint}. On the board, arrow keys choose a thing and Enter picks it up and puts it down; in the tray, arrow keys choose a move and Enter plays it. Backspace takes back.`
                : `${game.hint}. Arrow keys to choose, Enter to play, Backspace to take back`,
        );
        shell.guide(
            pos.won
                ? "cheer"
                : outOfMoves()
                  ? "retry"
                  : state.nudges
                    ? "point"
                    : hands.holding
                      ? "point"
                      : state.history.length > 1
                        ? "idle"
                        : "think",
        );
        drawTray();
        drawPanels();
        // After the tray, so a phone, where the tray is under the board, sizes the board to the room the tray leaves.
        sizeBoard();
        clearTimeout(timer);
        if (!pos.won && !outOfMoves() && state.nudges < 2)
            timer = window.setTimeout(() => {
                if (shell.paused()) return;
                state.nudges++;
                shell.observe?.("assist");
                draw();
            }, NUDGE_MS);
        if (hadFocus)
            $("tray").querySelector<HTMLElement>(`.chip[data-i="${state.focus}"]`)?.focus();
        if (document.activeElement === stage.sheet) showHand();
    }

    function frame(t: number): void {
        if (shell.paused()) return;
        state.session.frame?.(here());
        const w = state.win;
        if (!w) return;
        const u = t - w.t0;
        for (const c of cuesBetween(w.tl, w.fired, u)) shell.hear(c as Cue);
        w.fired = u;
        stage.sticker(starAt(), valueAt(w.tl, "star", u));
        if (done(w.tl, u)) state.win = null;
        else stage.wake();
    }

    /** Where the win's star goes: where the game says, over the balance's pivot, or near the top middle of the sheet. */
    const starAt = () =>
        state.session.star?.(here()) ??
        stage.anchor("balance", "pivot") ?? { x: Math.min(7, stage.bounds.w / 2), y: 1.6 };

    /** The win's star and its sounds, `after` seconds from now, once the move that won has been seen. */
    function startWin(after: number): void {
        const tl = game.win;
        if (!tl) return;
        state.win = shell.still()
            ? { tl: collapse(tl), t0: stage.time, fired: -1 }
            : { tl, t0: stage.time + after, fired: -1 };
        stage.wake();
    }

    function play(
        indices: number[],
        how: How,
        extra: Partial<TraceEvent> = {},
        prefer?: string,
        hand?: Release,
    ): void {
        if (shell.paused()) return;
        const from = here();
        const was = state.scene ?? state.session.parts(from);
        let pos = from;
        kb = kb && { ...kb, lifted: false };
        if (prefer) state.session.prefer?.(prefer);
        for (const i of indices) {
            const move = pos.moves[i];
            if (!move) break;
            const to = move.next();
            shell.observe?.("move", how === "key" ? "keyboard" : "pointer");
            state.history.push(to);
            state.attempt = record(state.attempt, {
                say: move.say,
                key: to.key,
                dist: far(distance(state.ex, to)),
                undo: false,
            });
            note(state.trace, { t: stage.time, how, move: i, ...extra });
            pos = to;
        }
        // The move is already made and the words already say so; the beat shows it happening, and ends on
        // the scene the new position draws.
        const s = state.session;
        const now = pos === from ? was : s.parts(pos);
        const seed = 7919 * state.history.length + level;
        const move =
            pos !== from && s.beat
                ? s.beat(from, pos, { was, now, hand: hand ?? null, seed })
                : null;
        if (move)
            stage.play(
                pos.won && s.finish ? followedBy(move, s.finish(pos, { scene: now, seed })) : move,
                now,
                shell.hear,
            );
        state.aside = "";
        state.nudges = 0;
        if (pos.won) {
            state.attempt.outcome = "won";
            shell.observe?.("won");
            startWin(move?.length ?? 0);
        } else if (!pos.moves.length) shell.hear("crash");
        else if (state.attempt.moves.length >= state.round.bounds.budget)
            state.attempt.outcome = "out of moves";
        state.focus = 0;
        draw(now);
    }

    function undo(): void {
        if (state.history.length < 2 || !state.round.reversible) return;
        stage.settle();
        const from = state.history.pop();
        const to = here();
        state.attempt = record(state.attempt, {
            say: `back from ${from?.key ?? ""}`,
            key: to.key,
            dist: far(distance(state.ex, to)),
            undo: true,
        });
        state.attempt.outcome = "playing";
        note(state.trace, { t: stage.time, how: "key", move: null, undo: true });
        state.win = null;
        state.nudges = 0;
        stage.sticker({ x: 0, y: 0 }, 0);
        state.aside = "";
        draw();
    }

    // ---------------------------------------------------------------- the tray, which is the keyboard path

    const isPad = (): boolean => {
        const moves = here().moves;
        return moves.length > 1 && moves.every((m) => m.chip.spot);
    };

    function chipButton(host: HTMLElement, i: number, hint: number | null): HTMLButtonElement {
        const m = here().moves[i];
        if (!m) throw new Error("Unknown move.");
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip paper";
        b.dataset.i = String(i);
        b.tabIndex = i === state.focus ? 0 : -1;
        b.setAttribute("aria-label", m.say);
        if (i === hint) b.classList.add("hinted");
        const slot = document.createElement("span");
        slot.className = "chip-art";
        b.appendChild(slot);
        if (m.chip.art && m.chip.text) {
            const t = document.createElement("span");
            t.className = "chip-text";
            t.textContent = m.chip.text;
            b.appendChild(t);
        }
        if (m.chip.note) {
            const n = document.createElement("span");
            n.className = "chip-note";
            n.textContent = m.chip.note;
            b.appendChild(n);
        }
        b.addEventListener("click", (event) => play([i], event.detail === 0 ? "key" : "tap"));
        // A chip in hand previews what it would do, the way a held handle does, so the keyboard path
        // gets the arc and the ghost too.
        b.addEventListener("focus", () => previewMove(i));
        b.addEventListener("blur", () => state.session.unpreview?.());
        host.appendChild(b);
        const drawing = m.chip.art ? art.get(m.chip.art) : null;
        if (drawing)
            slot.appendChild(
                render(drawing, (m.chip.params ?? {}) as never, { seed: 4127 + i * 13, host: b })
                    .svg,
            );
        else slot.textContent = m.chip.text ?? "";
        return b;
    }

    /** What a move would do, drawn, for a chip that has the focus. */
    function previewMove(i: number): void {
        const pos = here();
        const h = state.session.handles(pos).find((x) => x.mode === "aim");
        const target = h?.targets?.find((t) => t.carries.moves[0] === i) ?? null;
        if (h && target && state.session.preview) {
            const c =
                "r" in target.shape
                    ? { x: target.shape.cx, y: target.shape.cy }
                    : { x: target.shape.x, y: target.shape.y };
            state.session.preview(pos, h, { point: c, target, stop: null });
        }
    }

    function drawTray(): void {
        const tray = $("tray");
        tray.hidden = false;
        tray.replaceChildren();
        const pos = here();
        const moves = pos.moves;
        tray.classList.toggle("dense", moves.length > 10);
        const hint = state.nudges ? nudge(state.ex, pos) : null;
        if (!moves.length) {
            tray.classList.remove("pad");
            return;
        }
        state.focus = Math.min(state.focus, moves.length - 1);
        // A mechanic whose moves are a direction lays them out where they belong rather than in a row,
        // so going faster is above going slower and the arrow keys walk the pad.
        tray.classList.toggle("pad", isPad());
        if (isPad()) {
            const grid = group(tray, moves[0]?.chip.group ?? "Moves", "chips grid");
            const rows = [...new Set(moves.map((m) => m.chip.spot?.[0] ?? 0))].sort(
                (a, b) => a - b,
            );
            const cols = [...new Set(moves.map((m) => m.chip.spot?.[1] ?? 0))].sort(
                (a, b) => a - b,
            );
            moves.forEach((m, i) => {
                const b = chipButton(grid, i, hint);
                const [row, col] = m.chip.spot ?? [0, 0];
                b.style.gridRow = String(rows.indexOf(row) + 1);
                b.style.gridColumn = String(cols.indexOf(col) + 1);
            });
            return;
        }
        const groups: { name: string; items: number[] }[] = [];
        moves.forEach((m, i) => {
            const last = groups[groups.length - 1];
            if (last && last.name === m.chip.group) last.items.push(i);
            else groups.push({ name: m.chip.group, items: [i] });
        });
        for (const g of groups) {
            const row = group(tray, g.name, "chips");
            for (const i of g.items) chipButton(row, i, hint);
        }
    }

    function group(tray: HTMLElement, name: string, cls: string): HTMLElement {
        const box = document.createElement("div");
        box.className = "group";
        const h = document.createElement("h2");
        h.className = "label";
        h.textContent = name;
        const row = document.createElement("div");
        row.className = cls;
        row.setAttribute("role", "group");
        row.setAttribute("aria-label", name);
        box.append(h, row);
        tray.appendChild(box);
        return row;
    }

    /** Where an arrow key lands on a pad: the nearest move in that direction, looking past a gap. */
    function padStep(dr: number, dc: number): number {
        const moves = here().moves;
        const from = moves[state.focus]?.chip.spot;
        if (!from) return state.focus;
        for (let n = 1; n <= 4; n++) {
            const want = [from[0] + dr * n, from[1] + dc * n];
            const found = moves.findIndex(
                (m) => m.chip.spot?.[0] === want[0] && m.chip.spot?.[1] === want[1],
            );
            if (found >= 0) return found;
        }
        return state.focus;
    }

    // ---------------------------------------------------------------- the keyboard's hand on the board

    /** Which handle the keyboard's hand is on, whether it has picked it up, and which place it is over. */
    let kb: { at: number; lifted: boolean; target: number } | null = null;

    /**
     * The handles left to right by where each one lives, so the arrow keys go the way the board is laid out
     * and a handle carried over the board keeps its turn in the order while it is held.
     */
    function handlesInOrder(): Handle[] {
        return [...state.session.handles(here())].sort(
            (a, b) => a.home.x - b.home.x || a.home.y - b.home.y,
        );
    }

    /** The places a handle can go that play something, each with where the hand points and what it plays. */
    function spots(
        h: Handle,
    ): { id: string; at: Pt; choice: Choice; stop: Stop | null; target: Target<Choice> | null }[] {
        const path = h.path;
        if (h.mode === "path" && path) {
            return (h.stops ?? [])
                .filter((st) => st.choice.moves.length)
                .map((st, i) => ({
                    id: `stop:${i}`,
                    at: alongPath(path, st.s),
                    choice: st.choice,
                    stop: st,
                    target: null,
                }));
        }
        return (h.targets ?? [])
            .filter((t) => t.carries.moves.length)
            .map((t) => ({
                id: t.id,
                choice: t.carries,
                stop: null,
                target: t,
                at: isCircle(t.shape)
                    ? { x: t.shape.cx, y: t.shape.cy }
                    : { x: t.shape.x + t.shape.w / 2, y: t.shape.y + t.shape.h / 2 },
            }));
    }

    function showHand(): void {
        const hs = handlesInOrder();
        if (!kb || !hs.length || here().won) {
            stage.marks("hand", []);
            return;
        }
        kb.at = Math.min(kb.at, hs.length - 1);
        const h = hs[kb.at];
        if (!h) return;
        if (kb.lifted) {
            const spot = spots(h)[kb.target];
            stage.marks(
                "hand",
                spot ? [{ kind: "ring", x: spot.at.x, y: spot.at.y, r: 1.2, on: true }] : [],
            );
            return;
        }
        const r = stage.rect(h.key);
        stage.marks("hand", [
            r
                ? {
                      kind: "ring",
                      x: r.x + r.w / 2,
                      y: r.y + r.h / 2,
                      r: Math.max(r.w, r.h) / 2 + 0.4,
                  }
                : { kind: "ring", x: h.home.x, y: h.home.y, r: 1.5 },
        ]);
    }

    /** A picked-up handle held over the place the keyboard's hand has chosen, with what letting go there would do. */
    function hover(h: Handle): void {
        const spot = spots(h)[kb?.target ?? 0];
        const r = stage.rect(h.key);
        if (!spot) return;
        if (h.mode === "free" && r)
            stage.glide(
                h.key,
                { x: spot.at.x - r.w / 2, y: spot.at.y - r.h / 2 - 0.6 },
                SPRINGS.snap,
            );
        else if (h.mode === "path")
            stage.glide(
                h.key,
                { x: spot.at.x - (h.ref?.x ?? 0), y: spot.at.y - (h.ref?.y ?? 0) },
                SPRINGS.snap,
            );
        hands.showTargets(h, spot.target);
        state.session.preview?.(here(), h, {
            point: spot.at,
            target: spot.target,
            stop: spot.stop,
        });
    }

    function putDown(h: Handle): void {
        if (kb) kb.lifted = false;
        if (h.key && h.mode !== "aim") stage.lift(h.key, false);
        hands.showTargets(null, null);
        state.session.unpreview?.();
    }

    /** The board's keys: what the arrows, Enter, Space and Escape do while the board has the focus. */
    function boardKey(e: KeyboardEvent): boolean {
        const hs = handlesInOrder();
        if (!hs.length || here().won) return false;
        kb ??= { at: 0, lifted: false, target: 0 };
        const h = hs[Math.min(kb.at, hs.length - 1)];
        if (!h) return false;
        const step =
            e.key === "ArrowRight" || e.key === "ArrowDown"
                ? 1
                : e.key === "ArrowLeft" || e.key === "ArrowUp"
                  ? -1
                  : 0;
        if (step) {
            e.preventDefault();
            if (kb.lifted) {
                const n = spots(h).length;
                if (n) kb.target = (kb.target + step + n) % n;
                hover(h);
            } else kb.at = (kb.at + step + hs.length) % hs.length;
            showHand();
            return true;
        }
        if (e.key === "Escape" && kb.lifted) {
            e.preventDefault();
            putDown(h);
            if (h.key && h.mode !== "aim") stage.glide(h.key, h.home, SPRINGS.back);
            showHand();
            return true;
        }
        if (e.key !== "Enter" && e.key !== " ") return false;
        e.preventDefault();
        if (!kb.lifted) {
            if (h.tap?.moves.length) {
                play(h.tap.moves, "key", { piece: h.key }, h.key);
                return true;
            }
            if (!spots(h).length) {
                state.aside =
                    (h.targets ?? []).find((t) => t.carries.refuse)?.carries.refuse ??
                    "That one has nowhere to go just now.";
                shell.feedback(state.aside);
                shell.hear("nope");
                return true;
            }
            kb = { ...kb, lifted: true, target: 0 };
            if (h.key && h.mode !== "aim") stage.lift(h.key, true);
            shell.hear("lift");
            hover(h);
            showHand();
            return true;
        }
        const spot = spots(h)[kb.target];
        putDown(h);
        stage.marks("hand", []);
        if (!spot) return true;
        const hand: Release | undefined =
            h.key && h.mode !== "aim"
                ? {
                      key: h.key,
                      at: stage.at(h.key) ?? h.home,
                      v: { x: 0, y: 0 },
                      angle: stage.turned(h.key),
                  }
                : undefined;
        play(
            spot.choice.moves,
            "key",
            { piece: h.key, to: spot.id, landing: "on" },
            h.key || undefined,
            hand,
        );
        shell.hear("place");
        return true;
    }

    const onBoardFocus = (): void => showHand();
    const onBoardBlur = (): void => {
        const h = kb?.lifted ? handlesInOrder()[kb.at] : undefined;
        if (h) {
            putDown(h);
            if (h.key && h.mode !== "aim") stage.glide(h.key, h.home, SPRINGS.back);
        }
        stage.marks("hand", []);
    };

    function key(e: KeyboardEvent): void {
        if (shell.paused()) return;
        if (e.type !== "keydown" || e.target instanceof HTMLInputElement) return;
        if (document.activeElement === stage.sheet && e.key !== "Backspace" && boardKey(e)) return;
        const count = here().moves.length;
        if (e.key === "Backspace") {
            e.preventDefault();
            undo();
            return;
        }
        if (!count) return;
        const DIR: Record<string, [number, number]> = {
            ArrowUp: [-1, 0],
            ArrowDown: [1, 0],
            ArrowLeft: [0, -1],
            ArrowRight: [0, 1],
        };
        const focusChip = (): void => {
            drawTray();
            $("tray").querySelector<HTMLElement>(`.chip[data-i="${state.focus}"]`)?.focus();
        };
        const direction = DIR[e.key];
        if (isPad() && direction) {
            e.preventDefault();
            state.focus = padStep(...direction);
            focusChip();
            return;
        }
        const step =
            e.key === "ArrowRight" || e.key === "ArrowDown"
                ? 1
                : e.key === "ArrowLeft" || e.key === "ArrowUp"
                  ? -1
                  : 0;
        if (
            step &&
            (document.activeElement?.classList.contains("chip") ||
                document.activeElement === document.body)
        ) {
            e.preventDefault();
            state.focus = (state.focus + step + count) % count;
            focusChip();
            return;
        }
        if (
            (e.key === "Enter" || e.key === " ") &&
            document.activeElement?.classList.contains("chip")
        ) {
            e.preventDefault();
            play([Number((document.activeElement as HTMLElement).dataset.i)], "key");
            return;
        }
        // With only one thing to do and no chip in hand, Space or Enter does it: a throw of the dice.
        if (
            (e.key === "Enter" || e.key === " ") &&
            count === 1 &&
            (!document.activeElement || document.activeElement === document.body)
        ) {
            e.preventDefault();
            play([0], "key");
        }
    }

    // ---------------------------------------------------------------- the panels

    const movesWord = (n: number | null) =>
        n === null || n === Infinity ? "no win left" : `${n} move${n === 1 ? "" : "s"}`;

    function drawPanels(): void {
        const { proof: p, round: r } = state;
        const b = r.bounds;
        const rows: [string, string][] = [
            ["positions", `${p.positions} of at most ${b.positions}`],
            [
                "shortest win",
                `${movesWord(p.shortest)}, declared ${b.solution[0]} to ${b.solution[1]}`,
            ],
            ["ways to win", String(p.wins)],
            ["dead ends", p.deadEnds ? `${p.deadEnds}, and a move can be taken back` : "none"],
            ["ends without a win", `${p.stuck} position${p.stuck === 1 ? "" : "s"}`],
            ["most choices", `${p.branch}, declared at most ${b.branch}`],
        ];
        if (r.reversible) {
            rows.push([
                "aimless play",
                p.median === Infinity
                    ? `does not win half the time in ${b.budget} moves`
                    : `wins in ${p.median}, ${p.patience.toFixed(1)} times the shortest`,
            ]);
        } else {
            rows.push([
                "random play wins",
                `${(p.luck * 100).toFixed(1)}%, declared at most ${((b.luck ?? 0) * 100).toFixed(0)}%`,
            ]);
        }
        rows.push([
            "verdict",
            p.ok
                ? "keeps the promise"
                : `${p.problems.length} problem${p.problems.length === 1 ? "" : "s"}`,
        ]);
        shell.rows(
            1,
            "The proof",
            rows,
            [
                `This is school/games/prove.ts run over school/games/${r.kind}.ts. ${game.group === "hands" ? "A hand chooses among the moves the prover walked, so the proof is the same whichever way a move is made." : "Every move is a button, and the prover walked every one of them."}`,
                `On paper this skill is ${r.paper}. A game does not print, and the week's print pack carries the companion instead.`,
                ...p.problems,
            ],
            !p.ok,
        );

        const e = summariseAttempt(state.attempt);
        const s = summariseTrace(state.trace);
        const replay = traceMoves(state.trace);
        shell.rows(
            2,
            "What it records",
            [
                ["level", `${level + 1}, ${state.attempt.values}`],
                ["started", `${movesWord(state.attempt.from)} from a win`],
                ["moves", `${e.moves}${e.undos ? `, ${e.undos} taken back` : ""}`],
                ["now", movesWord(e.ended)],
                ["working", e.direction],
                [
                    "by hand, by key",
                    `${s.byHand}, ${s.byKey}${s.flicks ? `, ${s.flicks} flicked` : ""}`,
                ],
                [
                    "went home",
                    `${s.misses} drop${s.misses === 1 ? "" : "s"}${s.nearMisses ? `, ${s.nearMisses} only just landed` : ""}`,
                ],
                ["replay", replay.length ? replay.join(", ") : "nothing yet"],
            ],
            [attemptLine(e), traceLine(s)],
        );
        if (replay.length) {
            const a = document.createElement("a");
            a.className = "note";
            a.href = `/games?g=${game.id}&v=${level}&replay=${replay.join(",")}`;
            a.textContent = "The same moves again, which rebuild the same positions.";
            $("panel-2").appendChild(a);
        }

        const st = stage.stats;
        shell.rows(
            3,
            "Motion",
            [
                ["reduced motion", shell.still() ? "on: each move is drawn once, at rest" : "off"],
                ["renders", String(st.renders)],
                ["per render", st.renders ? `${(st.ms / st.renders).toFixed(2)} ms` : "not yet"],
                ["square", `${stage.sq} px; targets are at least 44 px`],
            ],
            [
                "A render is one drawing through the seeded pen. A morph draws a part again at each value on the way, so the count rises while a beam swings or a jug fills.",
            ],
        );

        const c = r.contract;
        const contract: [string, string][] = [["draws", c.draws.join(", ")]];
        for (const [name, slot] of Object.entries(c.slots))
            contract.push([
                name,
                `${slot.count[0]} to ${slot.count[1]} of ${slot.from.join(", ")}`,
            ]);
        for (const [name, set] of Object.entries(c.settings)) {
            contract.push([
                name,
                set.kind === "pick"
                    ? (set.values ?? []).join(" or ")
                    : set.range
                      ? `${set.kind}, ${set.range[0]} to ${set.range[1]}`
                      : set.kind,
            ]);
        }
        shell.rows(4, "What it can be filled with", contract, [
            "A slot only accepts drawings that are already on the shelf, so a written or generated level composes art that exists.",
        ]);
    }

    // A round can be named in the address and a move log replayed into it: because `apply` is pure
    // and the moves of a position are in a fixed order, the move numbers rebuild the same positions.
    for (const i of replay) {
        const move = here().moves[i];
        if (!move) break;
        const to = move.next();
        state.history.push(to);
        state.attempt = record(state.attempt, {
            say: move.say,
            key: to.key,
            dist: far(distance(state.ex, to)),
            undo: false,
        });
        note(state.trace, { t: 0, how: "key", move: i });
        if (to.won) state.attempt.outcome = "won";
    }

    stage.sheet.hidden = false;
    $("pad").hidden = true;
    const handy = state.session.handles(here()).length > 0;
    if (handy) {
        stage.sheet.tabIndex = 0;
        stage.sheet.setAttribute(
            "aria-label",
            "The board. Arrow keys choose a thing, and Enter picks it up and puts it down.",
        );
        stage.sheet.addEventListener("focus", onBoardFocus);
        stage.sheet.addEventListener("blur", onBoardBlur);
    }
    draw();

    return {
        frame,
        key,
        undo,
        redraw: draw,
        resize: () => {
            sizeBoard();
            draw();
        },
        stop() {
            stopped = true;
            clearTimeout(timer);
            unbind();
            stage.sheet.removeEventListener("focus", onBoardFocus);
            stage.sheet.removeEventListener("blur", onBoardBlur);
            stage.sheet.removeAttribute("tabindex");
            stage.sheet.removeAttribute("aria-label");
            if (state.attempt.outcome === "playing" && state.attempt.moves.length)
                state.attempt.outcome = "gave up";
            stage.clear();
            stage.sheet.hidden = true;
            $("tray").replaceChildren();
        },
    };
}
