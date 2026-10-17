import {
    Component,
    ElementRef,
    inject,
    signal,
    viewChild,
} from "@angular/core";
import { PlantsService } from "../../services/plants-service";
import { ToastService } from "../../services/toast-service";

@Component({
    selector: "app-create-plant",
    templateUrl: "./create-plant.html",
})
export class CreatePlant {
    service = inject(PlantsService);
    toast = inject(ToastService);
    dialog = viewChild.required<ElementRef<HTMLDialogElement>>("dialog");
    nameInput = viewChild.required<ElementRef<HTMLInputElement>>("nameInput");
    saving = signal(false);

    open() {
        this.nameInput().nativeElement.value = "";
        this.dialog().nativeElement.showModal();
        this.nameInput().nativeElement.focus();
    }

    close() {
        this.dialog().nativeElement.close();
    }

    async submit(name: string) {
        const trimmed = name.trim();
        if (trimmed === "") return;
        this.saving.set(true);
        const ok = await this.service.addPlant(trimmed);
        this.saving.set(false);
        if (ok) {
            this.close();
            this.toast.show(`Added ${trimmed}`);
        }
    }
}
