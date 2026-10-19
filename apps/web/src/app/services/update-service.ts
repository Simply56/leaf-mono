import { inject, Injectable, signal } from "@angular/core";
import { SwUpdate } from "@angular/service-worker";

/**
 * Offers a reload once the service worker has downloaded a new deployment.
 * Until then an open (or installed) app keeps running the version it started with.
 */
@Injectable({
    providedIn: "root",
})
export class UpdateService {
    private updates = inject(SwUpdate);

    /** A new version is downloaded and a reload would start it. */
    readonly available = signal(false);

    constructor() {
        // Disabled outside production builds
        if (!this.updates.isEnabled) return;
        this.updates.versionUpdates.subscribe((event) => {
            if (event.type === "VERSION_READY") this.available.set(true);
        });
        // The cached files of the running version are gone, so lazy code can no longer load
        this.updates.unrecoverable.subscribe(() => location.reload());
        // The worker only checks on launch, and an installed app can sit in the background for days
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState !== "visible") return;
            this.updates.checkForUpdate().catch(() => {
                // offline or the check failed; the next one will try again
            });
        });
    }

    /** A new page load is served the latest version the worker has. */
    reload(): void {
        location.reload();
    }

    dismiss(): void {
        this.available.set(false);
    }
}
