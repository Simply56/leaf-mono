import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ApiKey } from "./components/api-key/api-key";
import { Icon } from "./components/icon/icon";
import { AuthService } from "./services/auth-service";
import { PlantsService } from "./services/plants-service";
import { ToastService } from "./services/toast-service";

@Component({
    selector: "app-root",
    imports: [RouterOutlet, ApiKey, Icon],
    templateUrl: "./app.html",
    styleUrl: "./app.css",
})
export class App {
    protected auth = inject(AuthService);
    protected plants = inject(PlantsService);
    protected toasts = inject(ToastService);
}
