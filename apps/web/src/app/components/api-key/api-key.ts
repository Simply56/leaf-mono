import { Component, inject } from "@angular/core";
import { AuthService } from "../../services/auth-service";
import { Icon } from "../icon/icon";

@Component({
    selector: "app-api-key",
    imports: [Icon],
    templateUrl: "./api-key.html",
})
export class ApiKey {
    protected auth = inject(AuthService);

    save(key: string) {
        this.auth.set(key);
    }
}
