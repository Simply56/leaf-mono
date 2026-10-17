import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiSecurity } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { ApiKeyGuard } from "./auth/api-key.guard";

@Controller()
@UseGuards(ApiKeyGuard)
@ApiSecurity("apiKey")
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }
}
