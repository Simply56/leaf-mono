import { computed, Injectable, signal } from "@angular/core";

// Chromium-only event, missing from TypeScript's DOM typings
interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<unknown>;
}

const STORAGE_KEY = "installDismissed";

// iOS never fires beforeinstallprompt (in any browser, they are all WebKit); the only
// way to install there is the share sheet's "Add to Home Screen", so the banner explains it.
function needsManualInstall(): boolean {
    const ua = navigator.userAgent;
    const isIos =
        /iPad|iPhone|iPod/.test(ua) ||
        // iPadOS reports itself as a Mac, but no real Mac has a touch screen
        (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const isInstalled =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return isIos && !isInstalled;
}

@Injectable({
    providedIn: "root",
})
export class InstallService {
    private promptEvent = signal<BeforeInstallPromptEvent | null>(null);
    private dismissed = signal(this.readDismissed());
    private manualInstall = needsManualInstall();

    canInstall = computed(
        () => this.promptEvent() !== null && !this.dismissed(),
    );
    showManualSteps = computed(() => this.manualInstall && !this.dismissed());

    constructor() {
        // Fired only when the browser considers the app installable and it is not installed yet
        window.addEventListener("beforeinstallprompt", (event) => {
            event.preventDefault(); // suppress the browser's own install prompt in favor of the banner
            this.promptEvent.set(event as BeforeInstallPromptEvent);
        });
        window.addEventListener("appinstalled", () =>
            this.promptEvent.set(null),
        );
    }

    async install(): Promise<void> {
        const event = this.promptEvent();
        if (!event) return;
        // each event can only prompt once; the browser fires a new one if the user declines
        this.promptEvent.set(null);
        await event.prompt();
    }

    dismiss(): void {
        this.dismissed.set(true);
        try {
            localStorage.setItem(STORAGE_KEY, "true");
        } catch {
            // storage unavailable (private mode etc.) — banner still stays hidden for this session
        }
    }

    private readDismissed(): boolean {
        try {
            return localStorage.getItem(STORAGE_KEY) === "true";
        } catch {
            return false;
        }
    }
}
