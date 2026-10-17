import { Component, Input } from '@angular/core';
import { ValueToColorPipe } from '../../pipes/value-to-color-pipe';
import Plant from '../../models/plantInfo.model';
import { ComputeWateredDaysAgoPipe } from '../../pipes/compute-watered-days-ago-pipe';
import { RouterLink } from '@angular/router';
import { PlantImage } from '../plant-image/plant-image';

@Component({
    selector: 'app-plant-quick-info',
    imports: [
        ValueToColorPipe,
        ComputeWateredDaysAgoPipe,
        RouterLink,
        PlantImage,
    ],
    templateUrl: './plant-quick-info.html',
    styleUrl: './plant-quick-info.css',
})
export class PlantQuickInfo {
    @Input() plant!: Plant;
}
