/** A grade as a family reads it: the year before the first is kindergarten, not grade 0. */
export const gradeName = (grade: number): string =>
    grade === 0 ? "Kindergarten" : `Grade ${grade}`;
