import { Component, input } from "@angular/core";

export type IconName =
    | "camera"
    | "check"
    | "chevron-left"
    | "close"
    | "droplet"
    | "leaf"
    | "moon"
    | "pencil"
    | "plus"
    | "share"
    | "sun";

/** A 24×24 stroke icon in the current text color; always decorative, so label the control around it. */
@Component({
    selector: "app-icon",
    host: { class: "icon" },
    template: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            @switch (name()) {
                @case ("camera") {
                    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                    <circle cx="12" cy="13" r="3.5" />
                }
                @case ("check") {
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                }
                @case ("chevron-left") {
                    <path d="M15 5l-7 7 7 7" />
                }
                @case ("close") {
                    <path d="M6 6l12 12M18 6L6 18" />
                }
                @case ("droplet") {
                    <path
                        d="M12 3.5s-6 6.4-6 10.5a6 6 0 0 0 12 0c0-4.1-6-10.5-6-10.5z"
                    />
                }
                @case ("leaf") {
                    <path d="M5 19C5 10.5 10 5 19.5 5 19.5 14 14 19 5 19z" />
                    <path d="M5 19l8-8" />
                }
                @case ("moon") {
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                }
                @case ("pencil") {
                    <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
                }
                @case ("plus") {
                    <path d="M12 5v14M5 12h14" />
                }
                @case ("share") {
                    <path
                        d="M12 3v12M8 7l4-4 4 4M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"
                    />
                }
                @case ("sun") {
                    <circle cx="12" cy="12" r="4" />
                    <path
                        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                    />
                }
            }
        </svg>
    `,
})
export class Icon {
    name = input.required<IconName>();
}
