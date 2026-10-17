import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'valueToColor',
})
export class ValueToColorPipe implements PipeTransform {
    transform(value: number, maxValue: number = 10): string {
        const ratio = Math.min(value / maxValue, 1);
        const hue = Math.trunc(120 - 120 * ratio); // 120 = green, 0 = red;
        return `hsl(${hue}, 100%, var(--status-lightness))`;
    }
}
