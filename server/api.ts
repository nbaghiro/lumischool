// The shapes the API sends and receives, declared once for the server and the pages (.docs/api.md).
// Types only, importing only types, so a page's type checker can read it without the server, and
// tools/scripts/check-db.ts lets an app import it as a type and nothing else from server/.

import type { Envelope } from "../engine/answer";
import type { PackIndex } from "../engine/pack";
import type { ChildRecord } from "../school/family/family";
import type { ChildWeek } from "../school/family/sheets";
import type { Family, Key, Kid, Member, User } from "./db/schema";

export type Person = Pick<User, "id" | "email" | "name" | "settings">;

export interface KidLogins {
    pinSet: boolean;
    kids: { id: string; name: string; username: string | null; enabled: boolean }[];
}

/** A family a person may choose, as `my_families` lists it. */
export interface FamilyChoice {
    family_id: string;
    name: string;
    kid_id: string | null;
}

export interface Me {
    user: Person;
    family: Family;
    /** The caller's own active rows in this family: one for a parent, one per kid for a tutor. */
    members: Member[];
    families: FamilyChoice[];
    /** `id` is the stamp on everything this browser writes. */
    session: Pick<Key, "id" | "kind" | "created_at">;
}

export interface FamilyView {
    family: Family;
    kids: Kid[];
    /** Ended memberships included, so a removed member's name still resolves through `users`. */
    members: Member[];
    users: Person[];
    /** Whether the family has a PIN to leave a children's view with; never the PIN itself. */
    pin: boolean;
}

/** The children a browser's children's view is for, and whether the family has a PIN to leave it. */
export interface KidView {
    family: Pick<Family, "name" | "time_zone">;
    kids: Kid[];
    /** The family's other children with an active consent, whom a grown-up may add to this view with the PIN. */
    others: Pick<Kid, "id" | "name">[];
    pin: boolean;
}

/** One child's record as their view reads it: the kinds a child reads back. */
export interface KidState {
    kid: Kid;
    events: Envelope[];
    /** The tutors whose window is open today. */
    tutors: { name: string | null; to_day: string }[];
}

/** One child's record as the server folds it from their log (school/family/family.ts), and the pack it was folded against. */
export interface KidRecord extends ChildRecord {
    kid: Kid;
    /** The pack's digest, which names the lesson files the view fetches. */
    pack: string;
}

/**
 * One child as a grown-up's page reads them, folded on the server: their record as their view reads it,
 * and beside it the sheets that came back and the one thing to look at (school/family/sheets.ts).
 */
export interface GrownRecord extends ChildRecord, ChildWeek {
    kid: Kid;
    /** The pack's digest the record was folded against. */
    pack: string;
}

/** The pack a view or a grown-up's page reads lessons from: its digest, and the index of every lesson. */
export interface PackView {
    pack: string;
    index: PackIndex;
}

/** A children's view open on one browser, as the family's page lists it. */
export type KidSessionView = Pick<Key, "name" | "created_at" | "seen_at"> & {
    view: string;
    /** The parent who opened it. */
    user_id: string;
    kids: string[];
};

export interface KidSessions {
    views: KidSessionView[];
    /** Whether the family has a PIN to leave a children's view with. */
    pin: boolean;
}

/** One of the person's own sessions in this family, as the account page lists it: never its hash. */
export type SessionView = Pick<Key, "id" | "name" | "created_at" | "seen_at"> & {
    kind: "session" | "shared-session";
    /** The one this browser holds. */
    own: boolean;
    /** Put away while a children's view is open on its browser (.docs/auth.md, flow 5). */
    putAway: boolean;
    /** Given back or made by the family's PIN, so never a fresh sign-in. */
    byPin: boolean;
};

export interface Sessions {
    sessions: SessionView[];
}

/** An email the console transport printed, as the local outbox lists it. */
export interface Sent {
    to: string;
    subject: string;
    text: string;
    at: string;
}

/** The local outbox: what the console transport printed, newest first. Local only. */
export interface Outbox {
    emails: Sent[];
}

export type Verified = { me: Me } | { choose: FamilyChoice[] } | { start: true };

export interface Start {
    /** The person's own name. */
    name: string;
    /** The family's name. */
    family: string;
    timeZone: string;
}

export type ErrorCode =
    | "bad-request"
    | "bad-email"
    | "no-pending"
    | "wrong-code"
    | "bad-envelope"
    | "signed-out"
    /** The browser's session is put away while a children's view is open on it (.docs/auth.md, flow 5). */
    | "put-away"
    | "no-kid-session"
    | "origin"
    | "not-allowed"
    | "fresh-sign-in"
    | "not-found"
    | "no-consent"
    | "notice-changed"
    | "expired"
    | "dead-code"
    | "wrong-pin"
    | "no-pin"
    | "too-large"
    | "not-json"
    | "rate-limited"
    | "server";

export interface Problem {
    error: ErrorCode;
    problem?: string;
    at?: number;
    attemptsLeft?: number;
    retryAfter?: number;
    limit?: string;
    kid?: string;
    /** The notice's current version, when a parent consented to an older one. */
    notice?: string;
}
