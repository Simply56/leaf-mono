import {
    computed,
    inject,
    Injectable,
    linkedSignal,
    signal,
} from '@angular/core';
import Plant from '../models/plantInfo.model';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
import { AuthService } from './auth-service';

@Injectable({
    providedIn: 'root',
})
export class PlantsService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private keyResolved = signal(false);

    // No request is made until the API key is known; retries live in retryInterceptor
    private plantsResource = httpResource<Plant[]>(
        () => (this.keyResolved() ? this.buildUrl('/plants') : undefined),
        {
            parse: (raw) =>
                (raw as Plant[]).map((p) => {
                    p.imagePath = environment.url + p.imagePath;
                    if (p.lastWatered != undefined) {
                        p.lastWatered = new Date(p.lastWatered);
                    }
                    return p;
                }),
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

    loading = computed(
        () => !this.keyResolved() || this.plantsResource.isLoading(),
    );

    // Follows the load status, but can also be set by a failed mutation or cleared by the user
    error = linkedSignal<string, string | null>({
        source: this.plantsResource.status,
        computation: (status) =>
            status === 'error'
                ? 'Could not load plants. Check your connection and reload the page.'
                : null,
    });

    private buildUrl(endpoint: string): string {
        return `${environment.url}${endpoint}?apiKey=${environment.apiKey}`;
    }

    constructor() {
        this.auth.getApiKey().then((key) => {
            if (key) {
                environment.apiKey = key;
            }
            this.keyResolved.set(true);
        });
    }

    addPlant(name: string) {
        if (name === '') return;
        this.mutate(
            this.http.post(this.buildUrl('/plants'), { name: name }),
            'Could not add the plant.',
        );
    }

    renamePlant(newName: string, plantId: number) {
        this.mutate(
            this.http.patch(this.buildUrl(`/plants/${plantId}`), {
                name: newName,
            }),
            'Could not rename the plant.',
        );
    }

    waterPlant(plantId: number, ISODate: string) {
        this.mutate(
            this.http.patch(this.buildUrl(`/plants/${plantId}`), {
                lastWatered: ISODate,
            }),
            'Could not log the watering.',
        );
    }

    deletePlant(plantId: number) {
        this.mutate(
            this.http.delete(this.buildUrl(`/plants/${plantId}`)),
            'Could not delete the plant.',
        );
    }

    updatePlantImage(plantId: number, image: File) {
        const formData = new FormData();
        formData.append('image', image);
        this.mutate(
            this.http.post<Plant>(
                this.buildUrl(`/plants/${plantId}/image`),
                formData,
            ),
            'Could not upload the image.',
        );
    }

    private mutate(request: Observable<unknown>, failureMessage: string) {
        request.subscribe({
            next: () => this.plantsResource.reload(),
            error: (err) => {
                console.error(failureMessage, err);
                this.error.set(failureMessage);
            },
        });
    }
}
