import { Component, inject, Input, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import Plant from "../../models/plantInfo.model";
import type { WateringStatus } from "../../models/watering-status";
import { PlantsService } from "../../services/plants-service";
import { Icon } from "../icon/icon";

/** One row of the home list: tap the row to open the plant, tap Water to log a watering now. */
@Component({
    selector: "app-plant-quick-info",
    imports: [Icon, RouterLink],
    templateUrl: "./plant-quick-info.html",
})
export class PlantQuickInfo {
    service = inject(PlantsService);
    @Input({ required: true }) plant!: Plant;
    @Input({ required: true }) status!: WateringStatus;
    pending = signal(false);

    async water() {
        this.pending.set(true);
        await this.service.waterPlant(this.plant, new Date());
        this.pending.set(false);
    }
}
