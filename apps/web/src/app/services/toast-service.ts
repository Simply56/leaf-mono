import { Injectable, signal } from "@angular/core";

export interface Toast {
    message: string;
    action?: { label: string; run: () => void };
}

const VISIBLE_MS = 5000;

/** One short confirmation at a time, shown by the root App template. */
@Injectable({
    providedIn: "root",
})
export class ToastService {
    readonly toast = signal<Toast | null>(null);
    private timer: ReturnType<typeof setTimeout> | undefined;

    show(message: string, action?: Toast["action"]): void {
        clearTimeout(this.timer);
        this.toast.set({ message, action });
        this.timer = setTimeout(() => this.toast.set(null), VISIBLE_MS);
    }

    dismiss(): void {
        clearTimeout(this.timer);
        this.toast.set(null);
    }

    runAction(): void {
        const action = this.toast()?.action;
        this.dismiss();
        action?.run();
    }
}
