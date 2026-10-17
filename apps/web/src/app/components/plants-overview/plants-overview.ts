import { Component, computed, inject } from "@angular/core";
import { wateringStatus } from "../../models/watering-status";
import { InstallService } from "../../services/install-service";
import { PlantsService } from "../../services/plants-service";
import { ThemeService } from "../../services/theme-service";
import { CreatePlant } from "../create-plant/create-plant";
import { Icon } from "../icon/icon";
import { PlantQuickInfo } from "../plant-quick-info/plant-quick-info";

@Component({
    selector: "app-plants-overview",
    imports: [CreatePlant, Icon, PlantQuickInfo],
    templateUrl: "./plants-overview.html",
})
export class PlantsOverview {
    service = inject(PlantsService);
    theme = inject(ThemeService);
    installer = inject(InstallService);

    // Thirstiest first: never watered, then most overdue, then soonest due
    entries = computed(() => {
        const now = this.service.now();
        return this.service
            .plants()
            .map((plant) => ({ plant, status: wateringStatus(plant, now) }))
            .sort(
                (a, b) =>
                    a.status.dueIn - b.status.dueIn ||
                    a.plant.name.localeCompare(b.plant.name),
            );
    });

    headline = computed(() => {
        const thirsty = this.entries()
            .filter((entry) => entry.status.needsWater)
            .map((entry) => entry.plant.name);
        if (thirsty.length === 0) return "Every plant is watered";
        if (thirsty.length === 1) return `${thirsty[0]} needs water`;
        // Two names only while they fit on about two lines
        if (thirsty.length === 2 && thirsty.join("").length <= 24) {
            return `${thirsty[0]} and ${thirsty[1]} need water`;
        }
        return `${thirsty.length} plants need water`;
    });
}
