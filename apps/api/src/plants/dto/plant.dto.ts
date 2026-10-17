import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
    IsDateString,
    IsOptional,
    IsString,
    ValidateIf,
} from "class-validator";
import type { Express } from "express";

export class CreatePlantDto {
    @ApiProperty({
        description: "Human-friendly name of the plant",
        example: "Snake Plant",
        maxLength: 255,
    })
    @IsString()
    name: string;

    // May be left out, but not null: the column is NOT NULL with a default.
    @ApiPropertyOptional({
        description: "Path or URL to the plant image",
        example: "/static/plant_1_1712345678.png",
        maxLength: 500,
    })
    @ValidateIf((_, value) => value !== undefined)
    @IsString()
    imagePath?: string;

    @ApiPropertyOptional({
        description: "Last watering date in ISO 8601 format",
        example: "2025-09-20T10:30:00.000Z",
        format: "date-time",
    })
    @IsOptional()
    @IsDateString()
    lastWatered?: string;
}

// Every field may be left out. `skipNullProperties: false` keeps null from
// bypassing validation, so only `lastWatered` (nullable above) accepts it.
export class UpdatePlantDto extends PartialType(CreatePlantDto, {
    skipNullProperties: false,
}) {}

export class UploadImageDto {
    @ApiProperty({
        type: "string",
        format: "binary",
        description: "Image file to upload",
    })
    image: Express.Multer.File;
}
