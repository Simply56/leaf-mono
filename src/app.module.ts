import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { Plant } from "./plants/entities/plant.entity";
import { PlantsModule } from "./plants/plants.module";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
            type: "sqlite",
            database: process.env.DATABASE_PATH ?? "plants.db",
            entities: [Plant],
            synchronize: true, //TODO: Be careful with this in production
        }),
        PlantsModule,
        AuthModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
