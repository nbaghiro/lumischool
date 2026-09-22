// The names of the days, a time read into minutes and a span of minutes written as hours and
// minutes, which the calendar, the day strip, the schedule and the elapsed line share.

export const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Minutes past midnight, from "9:05" or "09:05". */
export const mins = (s: string): number => {
    const [h, m] = s.split(":");
    return (Number(h) || 0) * 60 + (Number(m) || 0);
};

/** How long, said the way a child says it: "45 min", "2 h", "1 h 20 min". */
export const spanText = (t: number): string => {
    const h = Math.floor(t / 60),
        m = t % 60;
    return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
};
