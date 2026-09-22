// The code a grown-up types (.docs/auth.md, flows 1 and 2): the eight digits we email, as a person
// types and reads them.

/** The digits of a typed or pasted sign-in code, at most eight, whatever came with them. */
export const digitsOf = (typed: string): string => typed.replace(/\D/g, "").slice(0, 8);

/** A code in its two fours, as the email shows it: `4820 7316`. */
export const inFours = (code: string, between: string): string =>
    code.length > 4 ? `${code.slice(0, 4)}${between}${code.slice(4)}` : code;

/**
 * The sign-in code in an email the console transport printed, for the local outbox's shortcut. It
 * reads `codeEmail` in server/email.ts, "Your code is 4820 7316.", and must change with it.
 */
export function codeIn(text: string): string | null {
    const m = /\bcode is (\d{4}) ?(\d{4})\b/.exec(text);
    return m ? `${m[1] ?? ""}${m[2] ?? ""}` : null;
}
