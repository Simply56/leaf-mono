import { Component, ElementRef, inject, Input, ViewChild } from '@angular/core';
import { PlantsService } from '../../services/plants-service';
import Plant from '../../models/plantInfo.model';

@Component({
    selector: 'app-plant-image',
    imports: [],
    templateUrl: './plant-image.html',
})
export class PlantImage {
    service: PlantsService = inject(PlantsService);
    @Input() plant!: Plant;
    @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;

    updateImage() {
        const imageToUpload = this.imageInput.nativeElement.files?.[0];
        if (imageToUpload == undefined) {
            console.log('Image is undefined');
            return;
        }
        this.service.updatePlantImage(this.plant.id, imageToUpload);
    }
}
