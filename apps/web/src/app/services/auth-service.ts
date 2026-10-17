import { Injectable, signal } from "@angular/core";

const STORAGE_KEY = "apiKey";

/**
 * The API key, from localStorage or, on first visit, `?apiKey=` in the page
 * URL. Without one the App shows the key form instead of the plants; a key
 * the API refuses is forgotten so the form can ask again.
 */
@Injectable({
    providedIn: "root",
})
export class AuthService {
    readonly key = signal<string | null>(this.readInitialKey());
    /** The last key was refused by the API (401). */
    readonly rejected = signal(false);

    set(key: string): void {
        const trimmed = key.trim();
        if (trimmed === "") return;
        this.store(trimmed);
        this.rejected.set(false);
        this.key.set(trimmed);
    }

    reject(): void {
        this.store(null);
        this.rejected.set(true);
        this.key.set(null);
    }

    private readInitialKey(): string | null {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) return stored;
        } catch {
            // storage unavailable (private mode etc.) — fall back to the URL
        }
        const fromUrl = new URLSearchParams(window.location.search)
            .get(STORAGE_KEY)
            ?.trim();
        if (!fromUrl) return null;
        this.store(fromUrl);
        return fromUrl;
    }

    private store(key: string | null): void {
        try {
            if (key == null) localStorage.removeItem(STORAGE_KEY);
            else localStorage.setItem(STORAGE_KEY, key);
        } catch {
            // storage unavailable — the key still works for this session
        }
    }
}
