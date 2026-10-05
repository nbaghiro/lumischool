import { router } from "expo-router";
import { useSyncExternalStore } from "react";
import * as api from "./api";
import type { FamilyChoice, Start } from "./api";
import { credentials, keep, snapshotOf, subscribe, type Held } from "./store";

/** The app is in one mode at a time (.docs/mobile.md): nobody, a grown-up, or a children's view. */
export type Mode =
    | { kind: "loading" }
    | { kind: "signed-out" }
    | { kind: "parent" }
    | { kind: "child"; credential: string; kids: string[]; parent: boolean };

function modeOf(loaded: boolean, held: Held): Mode {
    if (!loaded) return { kind: "loading" };
    if (held.kid !== null) {
        return {
            kind: "child",
            credential: held.kid,
            kids: held.kids,
            parent: held.session !== null,
        };
    }
    return held.session === null ? { kind: "signed-out" } : { kind: "parent" };
}

export function useMode(): Mode {
    const { loaded, held } = useSyncExternalStore(subscribe, snapshotOf);
    return modeOf(loaded, held);
}

/** The sign-in in progress: the address, the challenge the code answers, and what came back. */
export interface Asked {
    email: string;
    challenge: string;
    start: Start | null;
    /** Whether the code was asked for on a device the family shares, so another is asked for the same way. */
    shared: boolean;
    families: FamilyChoice[];
}

let asked: Asked | null = null;

export const signInAsked = (): Asked | null => asked;

export function askedFor(next: Asked | null): void {
    asked = next;
}

export async function signedIn(s: api.SignedIn): Promise<void> {
    asked = null;
    await keep({ session: s.session, device: s.device, kid: null, kids: [] });
}

/** Completes a sign-in, a family chosen or started, and opens Today. */
export async function finishSignIn(s: api.SignedIn): Promise<void> {
    await signedIn(s);
    if (router.canDismiss()) router.dismissAll();
    router.replace("/");
}

export async function enterChild(credential: string, kids: string[]): Promise<void> {
    await keep({ kid: credential, kids });
}

/** Back from a children's view to the grown-up, or to the welcome when no grown-up is held. */
export async function leftChild(s: api.SignedIn | null): Promise<void> {
    await keep(
        s === null
            ? { kid: null, kids: [] }
            : { session: s.session, device: s.device, kid: null, kids: [] },
    );
}

/** Forgets the grown-up's session and any children's view; the device key stays, as a browser's does. */
export async function forget(): Promise<void> {
    asked = null;
    await keep({ session: null, kid: null, kids: [] });
}

export async function signOut(): Promise<void> {
    if (credentials().session !== null) await api.signOut();
    await forget();
}

/**
 * Handles a refusal that is about the session rather than the request: a put-away session asks for
 * the PIN, an action that needs a fresh sign-in sends a new code, and a session that ended signs out.
 * Returns whether it did.
 */
export function settled(p: api.Problem): boolean {
    switch (p.error) {
        case "signed-out":
            void forget();
            return true;
        case "put-away":
            router.push("/unlock");
            return true;
        case "fresh-sign-in":
            router.push({ pathname: "/sign-in", params: { fresh: "1" } });
            return true;
        default:
            return false;
    }
}

const later = (seconds: number | undefined): string => {
    if (seconds === undefined || seconds <= 90) return "in a minute";
    if (seconds >= 3000) return "later";
    return `in ${Math.round(seconds / 60)} minutes`;
};

const SOMETHING = "Something went wrong on our side. Please try again in a moment.";

/** What a person reads for each refusal, in the web's words (engine/ui/failure.ts). */
const WORDS: Record<api.Problem["error"], (p: api.Problem) => string> = {
    "wrong-code": (p) => {
        const left = p.attemptsLeft;
        const tries =
            left === undefined || left < 1
                ? ""
                : left === 1
                  ? " You have one more try with this code."
                  : ` You have ${left} more tries with this code.`;
        return `That code does not match. Check the email and try again.${tries}`;
    },
    "dead-code": () =>
        "That code has had five wrong tries, so it has stopped working. Ask for a new one.",
    expired: () => "That code has run out. A code works for ten minutes, so ask for a new one.",
    "rate-limited": (p) => `Too many tries just now. Please try again ${later(p.retryAfter)}.`,
    "no-pending": () => "This sign-in has lost track of the code it asked for. Ask for a new one.",
    "delivery-failed": () => "We could not send your email. Please try again.",
    "bad-email": () => "That does not look like an email address. Check it and try again.",
    "not-found": () => "We could not find that. It may have run out.",
    "fresh-sign-in": () =>
        "This step needs a sign-in from the last ten minutes. Sign in again, then come back.",
    "no-consent": () =>
        "One of the children has no consent recorded, so their view cannot be opened.",
    "notice-changed": () =>
        "The notice changed while this page was open. Read the new one, then tick the box again.",
    "signed-out": () => "You are signed out. Sign in again to carry on.",
    "put-away": () =>
        "Parent access is locked on this device. Unlock it with the parent PIN or sign in by email.",
    "not-allowed": () => "Only a parent in the family can do that.",
    offline: () => "We could not reach lumischool. Check your connection and try again.",
    origin: () => "This page is not allowed to do that from here. Open it from its own address.",
    "no-kid-session": () => "That children's view has already been closed.",
    "wrong-pin": () => "That PIN is not right.",
    "no-pin": () =>
        "The parent PIN has stopped working after too many wrong tries. Set a new one on the family's page.",
    "bad-request": (p) => p.problem ?? SOMETHING,
    "bad-envelope": () => SOMETHING,
    "too-large": () => SOMETHING,
    "not-json": () => SOMETHING,
    server: () => SOMETHING,
    unreadable: () => SOMETHING,
};

/** What a person reads for a refusal. */
export const said = (p: api.Problem): string => WORDS[p.error](p);
