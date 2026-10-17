import { DatePipe } from '@angular/common';
import {
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    Signal,
    ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Plant from '../../models/plantInfo.model';
import { ComputeWateredDaysAgoPipe } from '../../pipes/compute-watered-days-ago-pipe';
import { ValueToColorPipe } from '../../pipes/value-to-color-pipe';
import { PlantsService } from '../../services/plants-service';
import { PlantImage } from '../plant-image/plant-image';

@Component({
    selector: 'app-plant-details',
    imports: [
        ComputeWateredDaysAgoPipe,
        ValueToColorPipe,
        DatePipe,
        RouterLink,
        PlantImage,
        FormsModule,
    ],
    templateUrl: './plant-details.html',
})
export class PlantDetails {
    fullUrl = window.location.href;
    router: Router = inject(Router);
    service: PlantsService = inject(PlantsService);
    route: ActivatedRoute = inject(ActivatedRoute);
    id = Number(this.route.snapshot.paramMap.get('id'));
    plant: Signal<Plant> = computed(
        () => this.service.plants().find((p) => p.id == this.id)!,
    );
    selectedDate: string;
    @ViewChild('plantNameHeading')
    plantNameHeading!: ElementRef<HTMLHeadingElement>;
    constructor() {
        effect(() => {
            if (!this.service.loading() && this.plant() == undefined) {
                this.router.navigate(['']);
            }
        });
        const today = new Date();
        this.selectedDate = today.toISOString().split('T')[0];
    }

    deletePlant() {
        if (
            this.plant() != null &&
            confirm('Are you sure you want to delete this plant?')
        ) {
            this.service.deletePlant(this.id);
            this.router.navigate(['']);
        }
    }

    waterPlant() {
        if (this.plant == undefined) {
            return;
        }
        this.service.waterPlant(this.id, this.selectedDate);
    }

    renamePlant(event: KeyboardEvent) {
        if (event.key !== 'Enter') {
            return;
        }
        event.preventDefault();

        if (this.plantNameHeading.nativeElement.textContent == null) {
            console.log('plantNameHeading is null');
            return;
        }
        if (this.plant == undefined) {
            console.log('Plant is undefined');
            return;
        }

        this.service.renamePlant(
            this.plantNameHeading.nativeElement.textContent,
            this.id,
        );
        this.plantNameHeading.nativeElement.blur();
    }
}
