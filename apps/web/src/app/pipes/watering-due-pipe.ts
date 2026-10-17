import { Pipe, PipeTransform } from "@angular/core";
import { ComputeWateredDaysAgoPipe } from "./compute-watered-days-ago-pipe";

function days(count: number): string {
    return count === 1 ? "1 day" : `${count} days`;
}

/** When the next watering is due, or null for a plant without an interval or a date. */
@Pipe({
    name: "wateringDue",
})
export class WateringDuePipe implements PipeTransform {
    transform(
        lastWatered: Date | null,
        intervalDays: number | null,
    ): string | null {
        if (lastWatered == null || intervalDays == null) {
            return null;
        }
        const dueIn =
            intervalDays -
            new ComputeWateredDaysAgoPipe().transform(lastWatered);
        if (dueIn > 1) return `Due in ${days(dueIn)}`;
        if (dueIn === 1) return "Due tomorrow";
        if (dueIn === 0) return "Due today";
        return `Overdue by ${days(-dueIn)}`;
    }
}
