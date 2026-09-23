// The grown-ups' app's screens by path. Which app a path belongs to is server/pages.ts's to say; this
// says which of this app's screens the path shows, and where a sign-in may go on to.

export type Screen =
    | "open-child"
    | "family"
    | "sign-in"
    | "start"
    | "outbox"
    | "explore"
    | "lesson"
    | "map"
    | "calendar"
    | "plan"
    | "print"
    | "account"
    | "letters"
    | "games"
    | "missing";

const PATHS: Readonly<Record<string, Screen>> = {
    "/": "family",
    "/open-child": "open-child",
    "/sign-in": "sign-in",
    "/start": "start",
    "/outbox": "outbox",
    "/explore": "explore",
    "/map": "map",
    "/calendar": "calendar",
    "/plan": "plan",
    "/print": "print",
    "/account": "account",
    "/letters": "letters",
    "/games": "games",
};

/** A lesson in Explore: `/explore/` and the lesson's id. */
const LESSON = /^\/explore\/([^/]+)\/?$/;

/** The lesson a path in Explore names, or null. */
export function lessonIn(path: string): string | null {
    const id = LESSON.exec(path)?.[1];
    if (id === undefined) return null;
    try {
        return decodeURIComponent(id);
    } catch {
        return null;
    }
}

/**
 * The screen a path shows. A trailing slash names the same screen. The outbox is a screen only on a
 * developer's computer (`local`), and anywhere else there is no page at its path.
 */
export function screenOf(path: string, o: { local: boolean }): Screen {
    const p = path.length > 1 ? path.replace(/\/+$/, "") || "/" : path;
    const screen = PATHS[p] ?? (lessonIn(p) === null ? "missing" : "lesson");
    return screen === "outbox" && !o.local ? "missing" : screen;
}

/**
 * Where a sign-in goes on to, from `?next=`: a screen of this app with its query and fragment, and
 * never another site, another app, or a sign-in again.
 */
export function nextFrom(search: string, o: { local: boolean }): string {
    const next = new URLSearchParams(search).get("next") ?? "";
    if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
    const screen = screenOf(next.split(/[?#]/, 1)[0] ?? "", o);
    return screen === "missing" || screen === "sign-in" || screen === "start" ? "/" : next;
}

/** The sign-in page that comes back to `here`; `again` asks for a sign-in even with a session. */
/** Where a grown-up goes when the children's view is open on this browser: its Grown-ups tab has the way back. */
export const KIDS = "/kids";

export function signInFor(here: string, o: { again?: boolean } = {}): string {
    const q = new URLSearchParams();
    if (o.again) q.set("again", "1");
    if (here !== "/") q.set("next", here);
    const query = q.toString();
    return query ? `/sign-in?${query}` : "/sign-in";
}

/** The home with one child's card in view, as a child's stamp in the bar asks for it. */
export const kidHref = (kid: { id: string }): string => `/?kid=${encodeURIComponent(kid.id)}`;

/** Where a grown-up is on the map: the country, a world, a lesson in its world, or a lesson alone, whose world the map screen finds. */
export interface WhereOnMap {
    world: string | null;
    lesson: string | null;
}

/** What `/map?world=…&lesson=…` names. */
export function whereIn(search: string): WhereOnMap {
    const q = new URLSearchParams(search);
    return { world: q.get("world") || null, lesson: q.get("lesson") || null };
}

/** The address of a place on the map. */
export function mapHref(at: Partial<WhereOnMap> = {}): string {
    const q = new URLSearchParams();
    if (at.world) q.set("world", at.world);
    if (at.lesson) q.set("lesson", at.lesson);
    const query = q.toString();
    return query ? `/map?${query}` : "/map";
}
