import { Component, inject } from '@angular/core';
import { PlantsService } from '../../services/plants-service';

@Component({
    selector: 'app-create-plant',
    imports: [],
    templateUrl: './create-plant.html',
    styleUrl: './create-plant.css',
})
export class CreatePlant {
    service: PlantsService = inject(PlantsService);
}
