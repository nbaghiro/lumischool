/**
 * Where a universal link or app link lands in the app: the web paths the stores' association files
 * name (.docs/mobile.md, "The server's part") map onto the app's own routes.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
    let url: URL;
    try {
        url = new URL(path, "https://lumischool.ai");
    } catch {
        return "/";
    }
    const p = url.pathname;
    if (p === "/sign-in") return "/sign-in";
    if (p === "/map") return "/map";
    if (p === "/explore" || p.startsWith("/explore/")) {
        return `/lessons?to=${encodeURIComponent(p + url.search)}`;
    }
    if (p === "/join" || p.startsWith("/join/")) {
        return `/page?to=${encodeURIComponent(p + url.search)}`;
    }
    return "/";
}
