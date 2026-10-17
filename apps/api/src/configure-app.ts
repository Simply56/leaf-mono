import { join } from "node:path";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

/**
 * Everything that is configured on the application instance itself (as
 * opposed to in the module graph). Shared by `main.ts` and the test suite so
 * that the tests run against the same setup as production.
 */
export function configureApp(app: NestExpressApplication): void {
    app.enableCors({
        origin: "*",
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Serve static files from the 'static' directory
    app.useStaticAssets(join(__dirname, "..", "static"), {
        prefix: "/static/",
    });

    const config = new DocumentBuilder()
        .setTitle("LEAF")
        .setDescription("API for watering plants")
        .build();

    const document = SwaggerModule.createDocument(app, config, {
        deepScanRoutes: true,
    });

    // Serve Swagger UI
    SwaggerModule.setup("api", app, document);
}
