import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Plant } from "./entities/plant.entity";
import { PlantsController } from "./plants.controller";
import { PlantsService } from "./plants.service";

@Module({
    imports: [TypeOrmModule.forFeature([Plant]), AuthModule],
    controllers: [PlantsController],
    providers: [PlantsService],
})
export class PlantsModule {}
