import { formatDate } from "@angular/common";
import {
    computed,
    effect,
    inject,
    Injectable,
    linkedSignal,
    signal,
    untracked,
} from "@angular/core";
import Plant from "../models/plantInfo.model";
import { calendarDaysBetween } from "../models/watering-status";
import {
    HttpClient,
    HttpErrorResponse,
    httpResource,
} from "@angular/common/http";
import {
    type CreatePlantRequest,
    PlantListSchema,
    type UpdatePlantRequest,
} from "@leaf/shared";
import { Observable } from "rxjs";
import { environment } from "../environments/environments";
import { AuthService } from "./auth-service";
import { ToastService } from "./toast-service";

function isUnauthorized(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 401;
}

@Injectable({
    providedIn: "root",
})
export class PlantsService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private toast = inject(ToastService);

    // No request is made until there is an API key; retries live in retryInterceptor
    private plantsResource = httpResource<Plant[]>(
        () => {
            const key = this.auth.key();
            return key == null ? undefined : this.buildUrl("/plants", key);
        },
        {
            // A response that does not match the shared schema fails the load
            // (and shows the error banner) instead of reaching the templates.
            parse: (raw) => {
                const result = PlantListSchema.safeParse(raw);
                if (!result.success) {
                    console.error(
                        "GET /plants returned an unexpected body:",
                        result.error.issues,
                    );
                    throw result.error;
                }
                return result.data.map((plant) => ({
                    ...plant,
                    imagePath: environment.url + plant.imagePath,
                    lastWatered:
                        plant.lastWatered === null
                            ? null
                            : new Date(plant.lastWatered),
                }));
            },
        },
    );

    // Keeps the last loaded list on screen while reloading and after a failed reload
    plants = linkedSignal<Plant[] | undefined, Plant[]>({
        source: () =>
            this.plantsResource.hasValue()
                ? this.plantsResource.value()
                : undefined,
        computation: (loaded, previous) => loaded ?? previous?.value ?? [],
    });

    /** True until the first load has succeeded or failed, and during every reload. */
    loading = computed(
        () =>
            this.auth.key() != null &&
            (this.plantsResource.isLoading() ||
                this.plantsResource.status() === "idle"),
    );

    /** A list has arrived at least once, so an empty list really means "no plants". */
    loaded = computed(
        () => this.plantsResource.hasValue() || this.plants().length > 0,
    );

    /**
     * When "now" is for the watering statuses. An installed app can sit in
     * the background for days, so this (and the list) is refreshed whenever
     * the app comes back to the foreground.
     */
    now = signal(new Date());

    // Follows the load status, but can also be set by a failed mutation or cleared by the user
    error = linkedSignal<string, string | null>({
        source: this.plantsResource.status,
        computation: (status) =>
            status === "error" && !isUnauthorized(this.plantsResource.error())
                ? "Could not load your plants. Check your connection and try again."
                : null,
    });

    constructor() {
        // A refused key sends the user back to the key form
        effect(() => {
            if (isUnauthorized(this.plantsResource.error())) {
                untracked(() => this.auth.reject());
            }
        });
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState !== "visible") return;
            this.now.set(new Date());
            if (this.auth.key() != null) this.plantsResource.reload();
        });
    }

    reload() {
        this.error.set(null);
        this.plantsResource.reload();
    }

    private buildUrl(endpoint: string, key = this.auth.key()): string {
        return `${environment.url}${endpoint}?apiKey=${encodeURIComponent(key ?? "")}`;
    }

    addPlant(name: string): Promise<boolean> {
        return this.mutate(
            this.http.post(this.buildUrl("/plants"), {
                name: name,
            } satisfies CreatePlantRequest),
            "Could not add the plant.",
        );
    }

    renamePlant(newName: string, plantId: number): Promise<boolean> {
        return this.mutate(
            this.http.patch(this.buildUrl(`/plants/${plantId}`), {
                name: newName,
            } satisfies UpdatePlantRequest),
            "Could not rename the plant.",
        );
    }

    /** Logs a watering and offers to undo it, restoring the previous date. */
    async waterPlant(plant: Plant, when: Date): Promise<boolean> {
        const ok = await this.setLastWatered(
            plant.id,
            when,
            "Could not log the watering.",
        );
        if (ok) {
            const previous = plant.lastWatered;
            const day =
                calendarDaysBetween(when, new Date()) === 0
                    ? "today"
                    : `on ${formatDate(when, "d MMMM", "en-US")}`;
            this.toast.show(`Watered ${plant.name} ${day}`, {
                label: "Undo",
                run: () =>
                    this.setLastWatered(
                        plant.id,
                        previous,
                        "Could not undo the watering.",
                    ),
            });
        }
        return ok;
    }

    private setLastWatered(
        plantId: number,
        when: Date | null,
        failureMessage: string,
    ): Promise<boolean> {
        return this.mutate(
            this.http.patch(this.buildUrl(`/plants/${plantId}`), {
                lastWatered: when?.toISOString() ?? null,
            } satisfies UpdatePlantRequest),
            failureMessage,
        );
    }

    setWateringInterval(
        plantId: number,
        days: number | null,
    ): Promise<boolean> {
        return this.mutate(
            this.http.patch(this.buildUrl(`/plants/${plantId}`), {
                wateringIntervalDays: days,
            } satisfies UpdatePlantRequest),
            "Could not save the watering interval.",
        );
    }

    deletePlant(plantId: number): Promise<boolean> {
        return this.mutate(
            this.http.delete(this.buildUrl(`/plants/${plantId}`)),
            "Could not delete the plant.",
        );
    }

    updatePlantImage(plantId: number, image: File): Promise<boolean> {
        const formData = new FormData();
        formData.append("image", image);
        return this.mutate(
            this.http.post(this.buildUrl(`/plants/${plantId}/image`), formData),
            "Could not upload the photo.",
        );
    }

    /** Resolves to whether the request succeeded; on success the list reloads. */
    private mutate(
        request: Observable<unknown>,
        failureMessage: string,
    ): Promise<boolean> {
        return new Promise((resolve) => {
            request.subscribe({
                next: () => {
                    this.plantsResource.reload();
                    resolve(true);
                },
                error: (err) => {
                    console.error(failureMessage, err);
                    if (isUnauthorized(err)) {
                        this.auth.reject();
                    } else {
                        this.error.set(failureMessage);
                    }
                    resolve(false);
                },
            });
        });
    }
}
