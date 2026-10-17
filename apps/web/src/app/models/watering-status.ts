import type Plant from "./plantInfo.model";

/** A plant without its own interval counts as thirsty after this many days. */
export const DEFAULT_INTERVAL_DAYS = 10;

export type WateringTone = "ok" | "soon" | "due";

export interface WateringStatus {
    /** What the plant's row and page say, e.g. "Overdue by 2 days" or "Watered yesterday". */
    label: string;
    tone: WateringTone;
    /** Water left until the next watering, from 1 (just watered) to 0 (due); drawn as the ring. */
    level: number;
    /** Days until the next watering is due; -Infinity for a plant that was never watered. */
    dueIn: number;
    /** Calendar days since the last watering, or null if there was none. */
    daysSince: number | null;
    needsWater: boolean;
}

function startOfDay(date: Date): number {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    ).getTime();
}

/** Whole calendar days between two moments, in local time (a watering last night was "yesterday"). */
export function calendarDaysBetween(from: Date, to: Date): number {
    // Rounded: a day with a daylight saving switch is 23 or 25 hours long
    return Math.round((startOfDay(to) - startOfDay(from)) / 86_400_000);
}

function days(count: number): string {
    return count === 1 ? "1 day" : `${count} days`;
}

function wateredLabel(daysSince: number): string {
    if (daysSince === 0) return "Watered today";
    if (daysSince === 1) return "Watered yesterday";
    return `Watered ${days(daysSince)} ago`;
}

function dueLabel(dueIn: number): string {
    if (dueIn > 1) return `Due in ${days(dueIn)}`;
    if (dueIn === 1) return "Due tomorrow";
    if (dueIn === 0) return "Due today";
    return `Overdue by ${days(-dueIn)}`;
}

export function wateringStatus(
    plant: Pick<Plant, "lastWatered" | "wateringIntervalDays">,
    now: Date,
): WateringStatus {
    if (plant.lastWatered == null) {
        return {
            label: "Never watered",
            tone: "due",
            level: 0,
            dueIn: -Infinity,
            daysSince: null,
            needsWater: true,
        };
    }
    const interval = plant.wateringIntervalDays ?? DEFAULT_INTERVAL_DAYS;
    // A date in the future (a clock off by a few hours) counts as today
    const daysSince = Math.max(0, calendarDaysBetween(plant.lastWatered, now));
    const dueIn = interval - daysSince;
    // "Soon" is the last quarter of the interval, and at least the day before
    const soon = Math.max(1, Math.round(interval / 4));
    return {
        label:
            plant.wateringIntervalDays == null
                ? wateredLabel(daysSince)
                : dueLabel(dueIn),
        tone: dueIn <= 0 ? "due" : dueIn <= soon ? "soon" : "ok",
        level: Math.min(1, Math.max(0, dueIn / interval)),
        dueIn,
        daysSince,
        needsWater: dueIn <= 0,
    };
}

/** A date as `<input type="date">` takes it, in local time (toISOString would give the UTC date). */
export function toDateInputValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
