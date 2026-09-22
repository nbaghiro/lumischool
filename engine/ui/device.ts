// What the apps need to know about the browser they are in: whether it is a developer's own computer.

/** A page served from this computer, where the outbox may exist. The API still decides. */
export const onThisComputer = (hostname: string): boolean =>
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
