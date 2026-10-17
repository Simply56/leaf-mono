import {
    Component,
    computed,
    DestroyRef,
    inject,
    input,
    signal,
} from "@angular/core";
import Plant from "../../models/plantInfo.model";
import { PlantsService } from "../../services/plants-service";
import { shrinkImage } from "../../utils/shrink-image";
import { Icon } from "../icon/icon";

/** The plant page's photo, with a button to replace it. */
@Component({
    selector: "app-plant-image",
    imports: [Icon],
    templateUrl: "./plant-image.html",
})
export class PlantImage {
    service = inject(PlantsService);
    plant = input.required<Plant>();
    uploading = signal(false);

    // The chosen photo, shown at once and until the reloaded plant points at the uploaded file
    private preview = signal<{ url: string; replaces: string } | null>(null);
    displaySrc = computed(() => {
        const preview = this.preview();
        const current = this.plant().imagePath;
        return preview?.replaces === current ? preview.url : current;
    });

    constructor() {
        inject(DestroyRef).onDestroy(() => this.clearPreview());
    }

    async onFileChosen(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = ""; // choosing the same file again must fire change again
        if (file == null) return;

        this.uploading.set(true);
        const image = await shrinkImage(file);
        this.clearPreview();
        this.preview.set({
            url: URL.createObjectURL(image),
            replaces: this.plant().imagePath,
        });
        const ok = await this.service.updatePlantImage(this.plant().id, image);
        this.uploading.set(false);
        if (!ok) this.clearPreview();
    }

    private clearPreview() {
        const preview = this.preview();
        if (preview != null) URL.revokeObjectURL(preview.url);
        this.preview.set(null);
    }
}
