import {
    type CanActivate,
    type ExecutionContext,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ApiKeyGuard implements CanActivate {
    private readonly validApiKey: string;

    constructor(config: ConfigService) {
        this.validApiKey = config.getOrThrow<string>("LEAF_API_KEY");
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context
            .switchToHttp()
            .getRequest<{ query: { apiKey?: string } }>();
        const apiKey = request.query.apiKey;

        if (!apiKey) {
            throw new UnauthorizedException(
                "API key is required. Add ?apiKey=your_key to the URL",
            );
        }

        if (apiKey !== this.validApiKey) {
            throw new UnauthorizedException("Invalid API key");
        }

        return true;
    }
}
