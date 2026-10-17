import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'computeWateredDaysAgo',
})
export class ComputeWateredDaysAgoPipe implements PipeTransform {
    transform(lastWatered: Date): number {
        const difInMilis = Date.now() - lastWatered.getTime();
        const difInDays = difInMilis / (1000 * 60 * 60 * 24);

        return Math.trunc(difInDays);
    }
}
