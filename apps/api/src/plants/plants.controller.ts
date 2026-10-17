import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
    type CreatePlantRequest,
    CreatePlantRequestSchema,
    type UpdatePlantRequest,
    UpdatePlantRequestSchema,
} from "@leaf/shared";
import {
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiTags,
} from "@nestjs/swagger";
import { ApiKeyGuard } from "../auth/api-key.guard";
import { ZodValidationPipe } from "../validation/zod-validation.pipe";
import type { Plant } from "./entities/plant.entity";
import { plantSchemas } from "./plants.openapi";
import { PlantsService } from "./plants.service";

@ApiTags("plants")
@Controller("plants")
@UseGuards(ApiKeyGuard)
export class PlantsController {
    constructor(private readonly plantsService: PlantsService) {}

    @Post()
    @ApiBody({ schema: plantSchemas.createBody })
    @ApiCreatedResponse({ schema: plantSchemas.plant })
    create(
        @Body(new ZodValidationPipe(CreatePlantRequestSchema))
        body: CreatePlantRequest,
    ): Promise<Plant> {
        return this.plantsService.create(body);
    }

    @Get()
    @ApiOkResponse({ schema: plantSchemas.plantList })
    findAll(): Promise<Plant[]> {
        return this.plantsService.findAll();
    }

    @Get(":id")
    @ApiOkResponse({ schema: plantSchemas.plant })
    findOne(@Param("id", ParseIntPipe) id: number): Promise<Plant> {
        return this.plantsService.findOne(id);
    }

    @Patch(":id")
    @ApiBody({ schema: plantSchemas.updateBody })
    @ApiOkResponse({ schema: plantSchemas.plant })
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(UpdatePlantRequestSchema))
        body: UpdatePlantRequest,
    ): Promise<Plant> {
        return this.plantsService.update(id, body);
    }

    @Delete(":id")
    remove(@Param("id", ParseIntPipe) id: number): Promise<void> {
        return this.plantsService.remove(id);
    }

    @Post(":id/image")
    @ApiConsumes("multipart/form-data")
    @ApiBody({ schema: plantSchemas.imageUploadBody })
    @ApiCreatedResponse({ schema: plantSchemas.plant })
    @UseInterceptors(
        FileInterceptor("image", {
            storage: undefined, // Use memory storage
            fileFilter: (_req, file, cb) => {
                if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
                    return cb(
                        new BadRequestException(
                            "Only image files (jpg, jpeg, png, gif) are allowed!",
                        ),
                        false,
                    );
                }
                cb(null, true);
            },
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
            },
        }),
    )
    async uploadImage(
        @Param("id", ParseIntPipe) id: number,
        @UploadedFile() file: Express.Multer.File,
    ): Promise<Plant> {
        if (!file) {
            throw new BadRequestException(
                "No image file uploaded. Please provide an image file.",
            );
        }

        return await this.plantsService.uploadImage(id, file);
    }
}
