// What we send, and how: the console transport, which prints each email in the server's terminal and
// keeps the last few for the local outbox, and the Resend transport that production sends through
// (.docs/auth.md, "Email"). No email ever names a child or carries their work.

import type { Sent } from "./api";

export type Email = Omit<Sent, "at">;

export type Transport = (email: Email) => Promise<void>;

const sent: Sent[] = [];
const KEPT = 20;

/**
 * Prints the email, framed so the code is easy to find among the server's other lines, and keeps the
 * last twenty in memory for the local outbox, since a code printed by a server in the background is
 * otherwise out of reach.
 */
export const consoleTransport: Transport = async (email) => {
    const rule = "-".repeat(72);
    process.stdout.write(
        `${rule}\nemail to ${email.to}: ${email.subject}\n\n${email.text}\n${rule}\n`,
    );
    sent.unshift({ ...email, at: new Date().toISOString() });
    sent.length = Math.min(sent.length, KEPT);
};

/** What the console transport printed, newest first. The route that reads it is local only. */
export const outbox = (): readonly Sent[] => sent;

/**
 * Sends through Resend's API: text only, since the code email has no HTML today. Throws on anything
 * but 2xx, with Resend's own account of what went wrong, so configFrom's refusal to start without a
 * key is the only silent failure mode this transport has.
 */
export function resendTransport(key: string, from: string): Transport {
    return async (email) => {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                authorization: `Bearer ${key}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({ from, to: email.to, subject: email.subject, text: email.text }),
        });
        if (!response.ok)
            throw new Error(`Resend answered ${response.status}: ${await response.text()}`);
    };
}

/** The code a person types to sign in. Ten minutes is the key's own rule in server/db/keys.ts. */
export function codeEmail(to: string, code: string): Email {
    const spaced = `${code.slice(0, 4)} ${code.slice(4)}`;
    return {
        to,
        subject: `Your lumischool code is ${spaced}`,
        text: [
            `Your code is ${spaced}.`,
            "",
            "Type it on the page where you asked for it. It works for ten minutes, once.",
            "",
            "If you did not ask to sign in to lumischool, you can ignore this email. Nobody can sign in",
            "without the code.",
        ].join("\n"),
    };
}
