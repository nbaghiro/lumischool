// Made by tools/scripts/mobile-art.ts (npm run mobile:art) from the web's sign-in pages. Do not edit by hand.

/** A picture the sign-in screens draw, and its size on the web's page in CSS pixels. */
export interface Art {
    source: number;
    width: number;
    height: number;
}

/** How far a drawing's picture reaches past the drawing's own box on each side, in CSS pixels. */
export const MARGIN = 6;

/** The width of the phone the pictures were made at, in CSS pixels. */
export const MADE_AT = 393;

/** The faces, by the family each style names. */
export const FACES = {
    "Andika-Regular": require<number>("./assets/fonts/Andika-Regular.ttf"),
    "Andika-Bold": require<number>("./assets/fonts/Andika-Bold.ttf"),
    "SplineSansMono-Medium": require<number>("./assets/fonts/SplineSansMono-Medium.ttf"),
    "SplineSansMono-Bold": require<number>("./assets/fonts/SplineSansMono-Bold.ttf"),
    "ShantellSans-Title": require<number>("./assets/fonts/ShantellSans-Title.ttf"),
    "ShantellSans-Hand": require<number>("./assets/fonts/ShantellSans-Hand.ttf"),
    "ShantellSans-Note": require<number>("./assets/fonts/ShantellSans-Note.ttf"),
    "ShantellSans-Name": require<number>("./assets/fonts/ShantellSans-Name.ttf"),
} satisfies Record<string, number>;

export const DRAWINGS = {
    mark: { source: require<number>("./assets/auth/mark.png"), width: 156, height: 56 },
    tape: { source: require<number>("./assets/auth/tape.png"), width: 104, height: 40 },
    "icon-home": { source: require<number>("./assets/auth/icon-home.png"), width: 36, height: 36 },
    "icon-lessons": {
        source: require<number>("./assets/auth/icon-lessons.png"),
        width: 36,
        height: 36,
    },
    "icon-map": { source: require<number>("./assets/auth/icon-map.png"), width: 36, height: 36 },
    "icon-calendar": {
        source: require<number>("./assets/auth/icon-calendar.png"),
        width: 36,
        height: 36,
    },
    "icon-games": {
        source: require<number>("./assets/auth/icon-games.png"),
        width: 36,
        height: 36,
    },
    "icon-paint": {
        source: require<number>("./assets/auth/icon-paint.png"),
        width: 36,
        height: 36,
    },
    "icon-journal": {
        source: require<number>("./assets/auth/icon-journal.png"),
        width: 36,
        height: 36,
    },
    "grownup-short": {
        source: require<number>("./assets/auth/grownup-short.png"),
        width: 76,
        height: 92,
    },
    "grownup-long": {
        source: require<number>("./assets/auth/grownup-long.png"),
        width: 76,
        height: 92,
    },
    "grownup-curly": {
        source: require<number>("./assets/auth/grownup-curly.png"),
        width: 76,
        height: 92,
    },
    "grownup-bun": {
        source: require<number>("./assets/auth/grownup-bun.png"),
        width: 76,
        height: 92,
    },
    "grownup-braids": {
        source: require<number>("./assets/auth/grownup-braids.png"),
        width: 76,
        height: 92,
    },
    "grownup-glasses": {
        source: require<number>("./assets/auth/grownup-glasses.png"),
        width: 76,
        height: 92,
    },
    "grownup-beard": {
        source: require<number>("./assets/auth/grownup-beard.png"),
        width: 76,
        height: 92,
    },
    "grownup-headscarf": {
        source: require<number>("./assets/auth/grownup-headscarf.png"),
        width: 76,
        height: 92,
    },
    "grownup-cap": {
        source: require<number>("./assets/auth/grownup-cap.png"),
        width: 76,
        height: 92,
    },
    "grownup-grey": {
        source: require<number>("./assets/auth/grownup-grey.png"),
        width: 76,
        height: 92,
    },
    plane: { source: require<number>("./assets/auth/plane.png"), width: 144, height: 100 },
    "stamp-sign-in": {
        source: require<number>("./assets/auth/stamp-sign-in.png"),
        width: 74,
        height: 90,
    },
    "stamp-start": {
        source: require<number>("./assets/auth/stamp-start.png"),
        width: 74,
        height: 90,
    },
    "stamp-kid": { source: require<number>("./assets/auth/stamp-kid.png"), width: 74, height: 90 },
    "stamp-code": {
        source: require<number>("./assets/auth/stamp-code.png"),
        width: 74,
        height: 90,
    },
    "stamp-cottage-0": {
        source: require<number>("./assets/auth/stamp-cottage-0.png"),
        width: 70,
        height: 84,
    },
    "stamp-cottage-1": {
        source: require<number>("./assets/auth/stamp-cottage-1.png"),
        width: 70,
        height: 84,
    },
    "stamp-cottage-2": {
        source: require<number>("./assets/auth/stamp-cottage-2.png"),
        width: 70,
        height: 84,
    },
    "stamp-cottage-3": {
        source: require<number>("./assets/auth/stamp-cottage-3.png"),
        width: 70,
        height: 84,
    },
    "stamp-tent-0": {
        source: require<number>("./assets/auth/stamp-tent-0.png"),
        width: 70,
        height: 84,
    },
    "stamp-tent-1": {
        source: require<number>("./assets/auth/stamp-tent-1.png"),
        width: 70,
        height: 84,
    },
    "stamp-tent-2": {
        source: require<number>("./assets/auth/stamp-tent-2.png"),
        width: 70,
        height: 84,
    },
    "stamp-tent-3": {
        source: require<number>("./assets/auth/stamp-tent-3.png"),
        width: 70,
        height: 84,
    },
} satisfies Record<string, Art>;

/** The map behind each step's card, from the top of the card's column to the foot of the strip under it. */
export const MAPS = {
    "sign-in": {
        source: require<number>("./assets/auth/map-sign-in.webp"),
        width: 393,
        height: 799,
    },
    start: { source: require<number>("./assets/auth/map-start.webp"), width: 393, height: 1075 },
    kid: { source: require<number>("./assets/auth/map-kid.webp"), width: 393, height: 965 },
    code: { source: require<number>("./assets/auth/map-code.webp"), width: 393, height: 961 },
    choose: { source: require<number>("./assets/auth/map-choose.webp"), width: 393, height: 833 },
    none: { source: require<number>("./assets/auth/map-none.webp"), width: 393, height: 956 },
    unlock: { source: require<number>("./assets/auth/map-unlock.webp"), width: 393, height: 745 },
} satisfies Record<string, Art>;

/** The brand's own pictures, which npm run brand:mobile makes: the logo and one square of the book. */
export const BRAND = {
    lockup: { source: require<number>("./assets/lockup.png"), width: 1200, height: 246 },
    paper: { source: require<number>("./assets/paper.png"), width: 60, height: 60 },
} satisfies Record<string, Art>;
