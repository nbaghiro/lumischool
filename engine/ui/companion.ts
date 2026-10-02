// The companion on a child's lesson (.docs/companion.md): a cartoon face on a live call, which speaks
// first about what the child tapped, hears them only while Talk is held, and points at the sheet
// through the question's own help. What it knows of a question comes from the server; this page
// sends only where the child is. The sheets register what they can do (`Desk`), the dock
// (companion-dock.tsx) draws the call, and both read the signals here.

import { createSignal } from "solid-js";
import type { DailyCall, DailyCallFactory } from "@daily-co/daily-js";
import type { Companion } from "../answer";
import type { Level } from "../pack";
import type { Doing } from "./kid";
import { obj, str, type Answer } from "./wire";
import { voice } from "./voice";

/**
 * An app's way to the server and to the call, handed in by the app that draws the dock, so a page
 * that only reads sheets (the site) carries neither. The child's app reaches its own routes for a
 * child and records the face they choose; a grown-up's reaches the family's and records nothing.
 */
export interface Reach {
    on(owner: string): Promise<Answer>;
    start(owner: string, body: unknown): Promise<Answer>;
    context(owner: string, where: Where & { earlier: readonly Line[] }): Promise<Answer>;
    end(owner: string, id: string): Promise<Answer>;
    gone(owner: string, id: string): void;
    record?(owner: string, doings: readonly Doing[]): Promise<unknown>;
    daily(): Promise<{ default: DailyCallFactory }>;
}

/** Where the child is, which the server turns into what the companion knows (server/companion.ts). */
export interface Where {
    lesson: string;
    level: Level;
    n: number | null;
    variant: string | null;
    hints: number;
    tries: number;
    said: string | null;
    worked: boolean;
}

/**
 * What a sheet lets the companion do on a question: say where it is, open its next hint, ring a part
 * of its picture and draw its worked example, each recorded as a press would be. A lesson with no
 * question to do now has a desk that only says where it is.
 */
export interface Desk {
    where(): Where;
    /** The hint opened, or null when there is none to open. */
    hint(): string | null;
    ring(part: string): boolean;
    /** What the worked example shows, in words without the question's own answer, or null for none. */
    worked(): string | null;
    /** A talk begun on it, recorded with the face. */
    talked(face: Companion): void;
}

/** What started a call: a button on the sheet, or the child changing to another face mid-talk. */
export type Tap = "explain" | "help" | "change";
/** What the companion hears first, so it speaks straight away about why it came. */
const FIRST: Record<Tap, string> = {
    explain: "[The child tapped: Explain this lesson]",
    help: "[The child tapped: Help with this one]",
    change: "[The child chose you to carry on. Say hello in one short sentence, then help with where they are now.]",
};

export type Phase =
    | { at: "off" }
    | { at: "choosing"; tap: Tap }
    | { at: "coming"; name: string }
    | { at: "here"; name: string }
    | { at: "failed"; line: string };

/** A minute with nobody speaking and nothing pressed ends the call, so a call left open costs nothing. */
const QUIET = 60_000;
/** How long a ring the companion drew stays on the picture, in ms. */
export const RING_FOR = 12_000;

let reach: Reach | null = null;
const [owner, setOwner] = createSignal<string | null>(null);
const [face, setFace] = createSignal<Companion | null>(null);
const [phase, setPhase] = createSignal<Phase>({ at: "off" });
const [caption, setCaption] = createSignal("");
const [speaking, setSpeaking] = createSignal(false);
const [listening, setListening] = createSignal(false);
const [video, setVideo] = createSignal<MediaStream | null>(null);
const [audio, setAudio] = createSignal<MediaStream | null>(null);

export { caption, face, listening, phase, speaking, video, audio };

/** Whether a sheet offers the companion: a page whose family's server has it. */
export const offered = (): boolean => owner() !== null;

/**
 * Who the companion is for once the server says the family has it: a child's id, or "" for a
 * grown-up trying it; and the face chosen last.
 */
export async function offer(who: string, chosen: Companion | null, by: Reach): Promise<void> {
    reach = by;
    setFace(chosen);
    const on = await by.on(who);
    setOwner(on.ok && obj(on.body) && on.body.on === true ? who : null);
}

/**
 * Where the dock is drawn: the open dialog the asking button was in, since a modal dialog leaves
 * everything outside it untouchable, or null for the page. The call ends when that dialog closes.
 */
const [host, setHost] = createSignal<Element | null>(null);
/** The button a call was asked from, which the dock first opens beside. */
const [anchor, setAnchor] = createSignal<Element | null>(null);
export { anchor, host };

/** The child left their page: nothing offers the companion until the next child's page does. */
export function withdraw(): void {
    void close();
    setOwner(null);
    said.length = 0;
}

/**
 * What the companion and the child said on this page, kept in memory only and never sent anywhere
 * but to the next call, so a call that starts again (after a quiet minute, at its time limit, or with
 * another face) carries on from it. It goes when the page or the child changes.
 */
const said: Line[] = [];
/** One thing said in a call, by whom. */
export interface Line {
    who: "companion" | "child";
    words: string;
}
/** How many lines of it the next call is given. */
const REMEMBERED = 20;

interface Live {
    call: DailyCall;
    id: string;
    kid: string;
    face: Companion;
    name: string;
    ready: boolean;
    queued: Record<string, unknown>[];
    first: string;
    /** What was said before this call, which every new context carries so the call keeps it. */
    earlier: readonly Line[];
}
let live: Live | null = null;
let topic: Desk | null = null;
let waiting: { tap: Tap; desk: Desk } | null = null;
let quiet = 0;
/**
 * The face of a call that ended without the child closing it: quiet for a minute, past its thirty
 * minutes, or gone on Tavus's side. The next tap brings the same face back without asking again.
 */
let dropped: { face: Companion; name: string } | null = null;

/** The call ended on its own: the dock goes, and the next tap calls the same face again. */
function drop(): void {
    const keep = live && { face: live.face, name: live.name };
    void close();
    dropped = keep;
}

const stir = (): void => {
    clearTimeout(quiet);
    if (live) quiet = window.setTimeout(drop, QUIET);
};

function send(eventType: string, properties: Record<string, unknown> = {}): void {
    if (!live) return;
    const message = {
        message_type: "conversation",
        event_type: eventType,
        conversation_id: live.id,
        properties,
    };
    if (live.ready) live.call.sendAppMessage(message, "*");
    else live.queued.push(message);
}

const respond = (text: string): void => send("conversation.respond", { text });

/** What the companion knows, again for where the child is now. */
async function retell(desk: Desk): Promise<void> {
    const kid = owner();
    if (kid === null || !live || !reach) return;
    const got = await reach.context(kid, { ...desk.where(), earlier: live.earlier });
    if (got.ok && obj(got.body) && str(got.body.context))
        send("conversation.overwrite_llm_context", { context: got.body.context });
}

/**
 * The child tapped Explain this lesson or Help with this one: the companion comes if it is not here,
 * after the child picks a face, and speaks about it at once.
 */
export function ask(tap: Tap, desk: Desk, from?: Element): void {
    if (owner() === null) return;
    topic = desk;
    if (!live) hostAt(from);
    voice().stop();
    if (live) {
        stir();
        // a new tap is a new turn: the companion stops what it was saying and answers this one
        if (speaking()) send("conversation.interrupt");
        void retell(desk).finally(() => respond(FIRST[tap]));
        return;
    }
    const again = dropped;
    const kid = owner();
    if (again && kid !== null) {
        dropped = null;
        desk.talked(again.face);
        void begin(kid, again.face, again.name, tap, desk);
        return;
    }
    waiting = { tap, desk };
    setPhase({ at: "choosing", tap });
}

let leaveWith: (() => void) | null = null;
function hostAt(from: Element | undefined): void {
    leaveWith?.();
    leaveWith = null;
    setAnchor(from ?? null);
    const dialog = from?.closest("dialog[open]") ?? null;
    setHost(dialog);
    if (!dialog) return;
    const shut = (): void => void close();
    dialog.addEventListener("close", shut);
    leaveWith = () => dialog.removeEventListener("close", shut);
}

/**
 * The child wants another face: this call ends and the chooser opens on the same question, and the
 * one they pick carries on from there. Another face is another call, so it counts against the day.
 */
export async function change(): Promise<void> {
    const desk = topic;
    if (!desk) return;
    await close();
    waiting = { tap: "change", desk };
    topic = desk;
    setPhase({ at: "choosing", tap: "change" });
}

/** The face the child picked, which starts the call. */
export function choose(chosen: Companion, name: string): void {
    const w = waiting;
    const kid = owner();
    waiting = null;
    if (!w || kid === null) return;
    if (chosen !== face()) {
        setFace(chosen);
        void reach?.record?.(kid, [
            { kind: "setting-changed", data: { key: "companion", of: null, value: chosen } },
        ]);
    }
    w.desk.talked(chosen);
    void begin(kid, chosen, name, w.tap, w.desk);
}

async function begin(kid: string, chosen: Companion, name: string, tap: Tap, desk: Desk) {
    setPhase({ at: "coming", name });
    setCaption("");
    const by = reach;
    if (!by) return;
    const earlier = said.slice(-REMEMBERED);
    const got = await by.start(kid, { face: chosen, where: desk.where(), earlier });
    if (!got.ok || !obj(got.body) || !str(got.body.url) || !str(got.body.id)) {
        const status = got.ok ? 0 : got.failure.status;
        setPhase({
            at: "failed",
            line:
                status === 429
                    ? "That is all the talking for today. Your grown-up can help."
                    : status === 402
                      ? `${name} has no more talking time just now. Your grown-up can add more.`
                      : `${name} cannot come just now. Try again in a little while.`,
        });
        return;
    }
    const { default: Daily } = await by.daily();
    const call = Daily.createCallObject({
        startVideoOff: true,
        startAudioOff: true,
        subscribeToTracksAutomatically: true,
    });
    const token = str(got.body.token) ? got.body.token : undefined;
    const here: Live = {
        call,
        id: got.body.id,
        kid,
        face: chosen,
        name,
        ready: false,
        queued: [],
        first: FIRST[tap],
        earlier,
    };
    live = here;
    call.on("track-started", (e) => {
        if (!e.participant || e.participant.local || live !== here) return;
        const stream = new MediaStream([e.track]);
        if (e.track.kind === "video") setVideo(stream);
        if (e.track.kind !== "audio") return;
        setAudio(stream);
        if (here.ready) return;
        // the companion speaks first, once it can be heard, about what the child tapped
        here.ready = true;
        for (const m of here.queued.splice(0)) call.sendAppMessage(m, "*");
        setPhase({ at: "here", name });
        respond(here.first);
        stir();
    });
    call.on("app-message", (e) => {
        if (live !== here) return;
        const data: unknown = e?.data;
        // Tavus ends a call at its time limit, or when it goes quiet on its side
        if (obj(data) && data.event_type === "system.shutdown") drop();
        else heard(data);
    });
    // the companion left the room: the call is over, whatever the page still shows
    call.on("participant-left", (e) => {
        if (live === here && e && !e.participant.local) drop();
    });
    call.on("left-meeting", () => {
        if (live === here) drop();
    });
    call.on("error", () => {
        if (live === here) drop();
    });
    try {
        // the room is private: only the token the server was given lets the page in
        await call.join({ url: got.body.url, userName: "child", ...(token ? { token } : {}) });
        call.setLocalAudio(false);
    } catch {
        if (live === here) void close(`${name} cannot come just now. Try again in a little while.`);
    }
}

/** A message from the call: what the companion says, when it speaks, and what it does on the sheet. */
function heard(data: unknown): void {
    if (!obj(data) || !str(data.event_type)) return;
    const p = obj(data.properties) ? data.properties : {};
    const theirs = p.role === "replica" || p.role === "pal";
    if (data.event_type === "conversation.utterance" && str(p.speech) && p.speech.trim()) {
        if (theirs) setCaption(p.speech);
        const line: Line = { who: theirs ? "companion" : "child", words: p.speech.trim() };
        const last = said.at(-1);
        // Tavus sends each of the companion's lines twice, as "pal" and as the older "replica"
        if ((theirs || p.role === "user") && !(last?.who === line.who && last.words === line.words))
            said.push(line);
        if (said.length > REMEMBERED * 2) said.splice(0, said.length - REMEMBERED);
    }
    if (data.event_type === "conversation.started_speaking" && theirs) {
        setSpeaking(true);
        stir();
    }
    if (data.event_type === "conversation.stopped_speaking" && theirs) {
        setSpeaking(false);
        stir();
    }
    if (data.event_type === "conversation.tool_call" && str(p.name) && str(p.tool_call_id))
        use(p.name, p.arguments, p.tool_call_id);
}

const argsOf = (raw: unknown): Record<string, unknown> => {
    if (obj(raw)) return raw;
    if (!str(raw) || !raw) return {};
    try {
        const parsed: unknown = JSON.parse(raw);
        return obj(parsed) ? parsed : {};
    } catch {
        return {};
    }
};

/** One of the companion's tools, done on the question it is talking about, and what came of it. */
function use(name: string, raw: unknown, id: string): void {
    const desk = topic;
    const args = argsOf(raw);
    let output = "There is no question open just now.";
    if (desk && name === "show_hint") {
        const h = desk.hint();
        output =
            h === null ? "There is no other hint to open just now." : `The hint now showing: ${h}`;
    } else if (desk && name === "ring_part") {
        const part = str(args.part) ? args.part : "";
        output = desk.ring(part) ? `${part} is ringed.` : `There is no part called ${part}.`;
    } else if (desk && name === "show_worked") {
        output = desk.worked() ?? "There is no worked example for this one.";
    }
    send("conversation.tool_result", { tool_call_id: id, output, status: "success" });
    if (desk) void retell(desk);
    stir();
}

/** The child checked an answer on a question the companion is talking about. */
export function checked(desk: Desk, right: boolean, said: string): void {
    if (!live || !topic || topic.where().lesson !== desk.where().lesson) return;
    topic = desk;
    const n = desk.where().n ?? 0;
    void retell(desk).then(() =>
        respond(
            right
                ? `[The child checked question ${n} and it was right.]`
                : `[The child checked question ${n}, and it is not right yet. The worksheet said: ${said}]`,
        ),
    );
    stir();
}

/** The sheet moved on to another question: the companion follows, if it is talking about this lesson. */
export function follow(desk: Desk): void {
    if (!live || !topic || topic.where().lesson !== desk.where().lesson || topic === desk) return;
    topic = desk;
    void retell(desk);
}

/** Talk held or let go: the microphone is on only while it is held. */
export function hold(on: boolean): void {
    if (!live?.ready) return;
    live.call.setLocalAudio(on);
    setListening(on);
    if (on) voice().stop();
    stir();
}

export function again(): void {
    respond("[The child tapped: Say that again]");
    stir();
}

/** Ends the call and its minutes, with a line for the child when it ended on its own. */
export async function close(line?: string): Promise<void> {
    clearTimeout(quiet);
    waiting = null;
    dropped = null;
    const was = live;
    live = null;
    topic = null;
    setVideo(null);
    setAudio(null);
    setCaption("");
    setSpeaking(false);
    setListening(false);
    setPhase(line ? { at: "failed", line } : { at: "off" });
    if (!was) return;
    try {
        await was.call.leave();
        await was.call.destroy();
    } catch {
        // a call already gone has nothing to leave
    }
    await reach?.end(was.kid, was.id);
}

/** The child left the page: the call ends without waiting, so its minutes stop. */
export function leaving(): void {
    if (live) reach?.gone(live.kid, live.id);
}
