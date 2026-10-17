import { Component, inject } from '@angular/core';
import { CreatePlant } from '../create-plant/create-plant';
import { PlantQuickInfo } from '../plant-quick-info/plant-quick-info';

import { PlantsService } from '../../services/plants-service';

@Component({
    selector: 'app-plants-overview',
    imports: [CreatePlant, PlantQuickInfo],
    templateUrl: './plants-overview.html',
})
export class PlantsOverview {
    service = inject(PlantsService);
}
