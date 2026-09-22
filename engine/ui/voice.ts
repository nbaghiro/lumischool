// The device's own voice, reading a line aloud: a wrapper over the browser's speech synthesis, which
// runs on the device and sends nothing (.docs/ai.md, decision 12). It takes a string and knows
// nothing about content; what may be handed to it is the caller's rule, held by the property test
// over the corpus in school/__tests__/lessons.test.ts. It speaks only after the person has touched
// the page, never on load, and hushes when the page is hidden, as the sound engine does.

/** What the browser's synthesiser offers, narrowed to what is used, so a test can hand in a fake. */
export interface Synth<U extends Utter = Utter> {
    speak(u: U): void;
    cancel(): void;
}

/** One line to read: the browser's utterance, or a test's record of one. */
export interface Utter {
    text: string;
    rate: number;
    onend: ((ev: never) => unknown) | null;
    onerror: ((ev: never) => unknown) | null;
}

export interface Voice {
    /** Whether this device can read aloud at all. */
    available(): boolean;
    /** Reads a line, ending any line still being read. False when it may not: no voice, or nothing touched yet. */
    speak(text: string): boolean;
    stop(): void;
    speaking(): boolean;
    /** Hears when reading starts and stops. */
    onChange(cb: (speaking: boolean) => void): () => void;
    /** The page was touched, after which reading is allowed. */
    touched(): void;
}

/** A little under the platform's pace, so a child can follow. */
export const RATE = 0.9;

export function makeVoice<U extends Utter>(o: {
    synth: () => Synth<U> | null;
    utter: (text: string) => U;
}): Voice {
    let touched = false;
    let speaking = false;
    const heard = new Set<(speaking: boolean) => void>();
    const set = (now: boolean): void => {
        if (now === speaking) return;
        speaking = now;
        for (const cb of heard) cb(now);
    };
    const stop = (): void => {
        o.synth()?.cancel();
        set(false);
    };
    return {
        available: () => o.synth() !== null,
        speak: (text) => {
            const s = o.synth();
            if (!s || !touched || !text.trim()) return false;
            s.cancel();
            const u = o.utter(text);
            u.rate = RATE;
            u.onend = () => set(false);
            u.onerror = () => set(false);
            set(true);
            s.speak(u);
            return true;
        },
        stop,
        speaking: () => speaking,
        onChange: (cb) => {
            heard.add(cb);
            return () => heard.delete(cb);
        },
        touched: () => {
            touched = true;
        },
    };
}

/** The page's voice: the browser's synthesiser, touched by the first press, hushed when the page is hidden. */
export function pageVoice(): Voice {
    const synth = (): SpeechSynthesis | null =>
        typeof speechSynthesis === "object" && typeof SpeechSynthesisUtterance === "function"
            ? speechSynthesis
            : null;
    const v = makeVoice<SpeechSynthesisUtterance>({
        synth,
        utter: (text) => new SpeechSynthesisUtterance(text),
    });
    const once = (): void => {
        v.touched();
        removeEventListener("pointerdown", once, true);
        removeEventListener("keydown", once, true);
    };
    addEventListener("pointerdown", once, true);
    addEventListener("keydown", once, true);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) v.stop();
    });
    return v;
}

let shared: Voice | null = null;
/** The one voice a page reads with, made on first use so nothing runs on load. */
export const voice = (): Voice => (shared ??= pageVoice());
