// Prose broken into rows of at most so many characters, which the instructions and the postcard set
// their text with.

/** Break text into lines of at most `max` characters, keeping words whole. */
export function rows(s: string, max: number): string[] {
    const out: string[] = [];
    let line = "";
    for (const w of s.split(/\s+/).filter(Boolean)) {
        if (line && `${line} ${w}`.length > max) {
            out.push(line);
            line = w;
        } else line = line ? `${line} ${w}` : w;
    }
    if (line) out.push(line);
    return out;
}
