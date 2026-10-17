import { DatePipe } from "@angular/common";
import {
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    linkedSignal,
    signal,
    viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import {
    DEFAULT_INTERVAL_DAYS,
    toDateInputValue,
    wateringStatus,
} from "../../models/watering-status";
import { PlantsService } from "../../services/plants-service";
import { ToastService } from "../../services/toast-service";
import { Icon } from "../icon/icon";
import { PlantImage } from "../plant-image/plant-image";

@Component({
    selector: "app-plant-details",
    imports: [DatePipe, FormsModule, Icon, PlantImage, RouterLink],
    templateUrl: "./plant-details.html",
})
export class PlantDetails {
    router: Router = inject(Router);
    service: PlantsService = inject(PlantsService);
    toast = inject(ToastService);
    route: ActivatedRoute = inject(ActivatedRoute);
    id = Number(this.route.snapshot.paramMap.get("id"));
    plant = computed(() => this.service.plants().find((p) => p.id == this.id));
    status = computed(() => {
        const plant = this.plant();
        return plant && wateringStatus(plant, this.service.now());
    });
    readonly defaultInterval = DEFAULT_INTERVAL_DAYS;

    watering = signal(false);
    pickingDate = signal(false);
    // Recomputed with `now`, so a page left open overnight offers the right dates
    today = computed(() => toDateInputValue(this.service.now()));
    yesterday = computed(() => {
        const date = new Date(this.service.now());
        date.setDate(date.getDate() - 1);
        return toDateInputValue(date);
    });

    // Resets to the stored value whenever the plant reloads; the number input gives null when empty
    intervalDays = linkedSignal<number | null>(
        () => this.plant()?.wateringIntervalDays ?? null,
    );
    intervalValid = computed(() => {
        const days = this.intervalDays();
        return (
            days != null && Number.isInteger(days) && days >= 1 && days <= 365
        );
    });

    renameDialog = viewChild<ElementRef<HTMLDialogElement>>("renameDialog");
    renameInput = viewChild<ElementRef<HTMLInputElement>>("renameInput");
    deleteDialog = viewChild<ElementRef<HTMLDialogElement>>("deleteDialog");

    constructor() {
        effect(() => {
            if (!this.service.loading() && this.plant() == undefined) {
                this.router.navigate([""]);
            }
        });
    }

    /** `day` is a date input's value (YYYY-MM-DD), or null for right now. */
    async water(day: string | null) {
        const plant = this.plant();
        if (plant == null) return;
        let when = new Date();
        if (day != null && day !== this.today()) {
            const [year, month, date] = day.split("-").map(Number);
            if (!year || !month || !date) return;
            // Midday, so the stored UTC time falls on the same calendar day in any nearby time zone
            when = new Date(year, month - 1, date, 12);
            if (when > new Date()) return;
        }
        this.watering.set(true);
        const ok = await this.service.waterPlant(plant, when);
        this.watering.set(false);
        if (ok) this.pickingDate.set(false);
    }

    async saveInterval() {
        if (!this.intervalValid()) return;
        if (
            await this.service.setWateringInterval(this.id, this.intervalDays())
        ) {
            this.toast.show(`Water every ${this.intervalDays()} days`);
        }
    }

    async clearInterval() {
        if (await this.service.setWateringInterval(this.id, null)) {
            this.toast.show("Interval cleared");
        }
    }

    openRename() {
        const input = this.renameInput()?.nativeElement;
        if (input == null) return;
        input.value = this.plant()?.name ?? "";
        this.renameDialog()?.nativeElement.showModal();
        input.select();
    }

    async rename(name: string) {
        const trimmed = name.trim();
        if (trimmed === "") return;
        if (trimmed !== this.plant()?.name) {
            if (!(await this.service.renamePlant(trimmed, this.id))) return;
        }
        this.renameDialog()?.nativeElement.close();
    }

    openDelete() {
        this.deleteDialog()?.nativeElement.showModal();
    }

    async delete() {
        const name = this.plant()?.name;
        this.deleteDialog()?.nativeElement.close();
        if (await this.service.deletePlant(this.id)) {
            this.toast.show(`Deleted ${name}`);
            this.router.navigate([""]);
        }
    }
}
