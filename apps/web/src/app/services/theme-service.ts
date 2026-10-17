import { computed, Injectable, signal } from '@angular/core';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private override = signal<Theme | null>(this.readStoredTheme());
    private systemDark = signal(false);

    isDark = computed(() => {
        const override = this.override();
        return override ? override === 'dark' : this.systemDark();
    });

    constructor() {
        const query = window.matchMedia('(prefers-color-scheme: dark)');
        this.systemDark.set(query.matches);
        query.addEventListener('change', (e) => this.systemDark.set(e.matches));
    }

    toggle(): void {
        const theme: Theme = this.isDark() ? 'light' : 'dark';
        this.override.set(theme);
        document.documentElement.dataset['theme'] = theme;
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // storage unavailable (private mode etc.) — theme still applies for this session
        }
    }

    private readStoredTheme(): Theme | null {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored === 'light' || stored === 'dark' ? stored : null;
        } catch {
            return null;
        }
    }
}
