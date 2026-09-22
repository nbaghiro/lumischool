// A value in cents written the way a price is, and a written amount read back into cents. The tag,
// the receipt, the shelf and the change line write prices with them.

/** A value in cents, written the way a price is written. */
export const price = (cents: number): string =>
    cents >= 100 || cents % 100 === 0 ? `$${(cents / 100).toFixed(2)}` : `${cents}¢`;

/** Minutes and money count the same way: stop at the next round number, then take the whole ones. */
export const cents = (s: string): number => Math.round(Number(s) * 100);
