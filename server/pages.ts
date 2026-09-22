// Which app answers a page on the one origin (.docs/local.md, "The apps"). The dev server's middleware
// reads it now and the Node server will once it serves the builds, so the two cannot disagree.

/** The apps built today, each one page that shows the screen its path names. */
export type App = "home" | "kids" | "site";

/**
 * The cookies a browser holds (.docs/auth.md): a grown-up's session and the code it waits on, or a
 * children's view. The prefix is used only over HTTPS.
 */
export const COOKIES = {
    secure: { session: "__Host-ls_session", pending: "__Host-ls_pending", kids: "__Host-ls_kids" },
    plain: { session: "ls_session", pending: "ls_pending", kids: "ls_kids" },
} as const;

/** A request answered with an app's page, rather than by the API or with a file. */
export function isPage(req: { method: string; accept: string; path: string }): boolean {
    return (
        req.method === "GET" &&
        req.accept.includes("text/html") &&
        !req.path.startsWith("/api/") &&
        !/\.\w+$/.test(req.path)
    );
}

const carries = (cookie: string, name: string): boolean =>
    cookie.split(";").some((part) => part.split("=")[0]?.trim() === name);

/**
 * Whether a `Cookie` header carries a session under the one name the API reads in this mode: with the
 * prefix when `secure`, since over HTTPS a cookie without it could have been planted by a subdomain.
 * The API still decides whether it is a live one.
 */
export function hasSession(cookie: string, secure: boolean): boolean {
    return carries(cookie, (secure ? COOKIES.secure : COOKIES.plain).session);
}

/** Whether a `Cookie` header carries a children's view, under the name the API reads in this mode. */
export function hasKidSession(cookie: string, secure: boolean): boolean {
    return carries(cookie, (secure ? COOKIES.secure : COOKIES.plain).kids);
}

/**
 * The app a page path belongs to (.docs/auth.md, "Hosts"): the children's view under `/kids`, the site
 * at `/home` for everyone, and the grown-ups' app everywhere else. `/` is the children's view for a
 * browser that holds one, whose session, if it holds one too, is put away for that view; the
 * grown-ups' app for a browser with a session and no view; and the site for anyone else. Both are
 * only whether a cookie is there, so the API clears a cookie it refuses, and the next page a stale
 * cookie asked for lands on the site.
 */
export function pageFor(path: string, held: { session: boolean; kids: boolean }): App {
    if (path === "/kids" || path.startsWith("/kids/")) return "kids";
    if (path === "/home" || path === "/home/") return "site";
    if (path === "/") return held.kids ? "kids" : held.session ? "home" : "site";
    return "home";
}
