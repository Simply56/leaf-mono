import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";
import type { Express } from "express";

export class CreatePlantDto {
    @ApiProperty({
        description: "Human-friendly name of the plant",
        example: "Snake Plant",
        maxLength: 255,
    })
    @IsString()
    name: string;

    // No `imagePath`: only the upload endpoint sets it, and it names the file
    // that is deleted when the image is replaced or the plant removed.

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
