import { PRINT, TOKEN_NAMES, type Tokens } from "../paper";

/**
 * The palette as the page resolves it on `host`, since SVG presentation attributes cannot use
 * var(). A token the page does not set reads as its print value.
 */
export function readTokens(host: Element = document.documentElement): Tokens {
    const style = getComputedStyle(host);
    const tokens = { ...PRINT };
    for (const name of TOKEN_NAMES) {
        const value = style.getPropertyValue(`--${name}`).trim();
        if (value) tokens[name] = value;
    }
    return tokens;
}
