import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private readonly storageKey = 'apiKey';
    private apiKey: string | null = null;
    async getApiKey(): Promise<string | null> {
        if (this.apiKey != null) return this.apiKey;

        const storedKey = localStorage.getItem(this.storageKey);
        if (storedKey) return (this.apiKey = storedKey);

        let key: string | null = this.getApiKeyFromQuery();

        if (key) {
            localStorage.setItem(this.storageKey, key);
            this.apiKey = key;
            return key;
        }

        key = null;

        if (!key) {
            key = prompt('Please enter the key');
            if (key) localStorage.setItem(this.storageKey, key);
        }

        this.apiKey = key;
        return key;
    }

    private getApiKeyFromQuery(): string | null {
        if (typeof window === 'undefined') return null;

        const params = new URLSearchParams(window.location.search);
        const key = params.get(this.storageKey);
        return key ? key.trim() : null;
    }
}
