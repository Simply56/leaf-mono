import * as fs from "node:fs";
import * as path from "node:path";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import tinify from "tinify";
import type { Repository } from "typeorm";
import type { CreatePlantDto, UpdatePlantDto } from "./dto/plant.dto";
import { DEFAULT_PLANT_IMAGE_PATH, Plant } from "./entities/plant.entity";

@Injectable()
export class PlantsService {
    constructor(
        @InjectRepository(Plant)
        private readonly plantRepository: Repository<Plant>,
        config: ConfigService,
    ) {
        tinify.key = config.getOrThrow<string>("TINIFY_API_KEY");
    }

    async create(createPlantDto: CreatePlantDto): Promise<Plant> {
        const plant = this.plantRepository.create(createPlantDto);
        return await this.plantRepository.save(plant);
    }

    async findAll(): Promise<Plant[]> {
        return await this.plantRepository.find();
    }

    async findOne(id: number): Promise<Plant> {
        const plant = await this.plantRepository.findOne({ where: { id } });
        if (plant == null) {
            throw new NotFoundException(`Plant with ID ${id} not found`);
        }
        return plant;
    }

    async update(id: number, updatePlantDto: UpdatePlantDto): Promise<Plant> {
        const plant = await this.findOne(id);
        Object.assign(plant, updatePlantDto);
        return await this.plantRepository.save(plant);
    }

    async remove(id: number): Promise<void> {
        const plant = await this.findOne(id);
        this.removeImage(plant);
        await this.plantRepository.remove(plant);
    }

    async uploadImage(id: number, file: Express.Multer.File): Promise<Plant> {
        const plant = await this.findOne(id);
        this.removeImage(plant);

        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const filename = `plant_${id}_${timestamp}${extension}`;
        const filePath = path.join(process.cwd(), "static", filename);

        // Save raw file immediately
        await fs.promises.writeFile(filePath, file.buffer);

        // Update DB with raw path
        plant.imagePath = `/static/${filename}`;
        const savedPlant = await this.plantRepository.save(plant);

        // Kick off background compression (don’t await)
        void (async () => {
            try {
                const tempPath = `${filePath}.tmp`;
                await tinify
                    .fromFile(filePath)
                    .resize({ method: "cover", width: 500, height: 500 })
                    .toFile(tempPath);

                await fs.promises.rename(tempPath, filePath);
            } catch (err) {
                console.error("Tinify failed:", err);
                // Optionally keep raw image if compression fails
            }
        })();

        return savedPlant;
    }

    private removeImage(plant: Plant) {
        if (plant.imagePath === DEFAULT_PLANT_IMAGE_PATH) {
            return;
        }
        // Whatever the row says, only ever delete a file directly in static/.
        const staticDir = path.join(process.cwd(), "static");
        const filePath = path.resolve(
            staticDir,
            path.posix.relative("/static", plant.imagePath),
        );
        if (path.dirname(filePath) !== staticDir) {
            console.log(
                `Not deleting image outside static/: ${plant.imagePath}`,
            );
            return;
        }
        try {
            fs.unlinkSync(filePath);
            plant.imagePath = DEFAULT_PLANT_IMAGE_PATH;
        } catch (e: unknown) {
            if (e instanceof Error) {
                console.log(e);
            }
            console.log("Delete failed");
        }
    }
}
