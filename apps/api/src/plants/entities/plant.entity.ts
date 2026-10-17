import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export const DEFAULT_PLANT_IMAGE_PATH = "/static/defaultPlant.png";

@Entity("plants")
export class Plant {
    @ApiProperty({ description: "Auto-incremented identifier", example: 1 })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({
        description: "Plant name",
        example: "Snake Plant",
        maxLength: 255,
    })
    @Column({ type: "varchar", length: 255 })
    name: string;

    @ApiProperty({
        description: "Image path served by the API",
        example: "/static/plant_1_1712345678.png",
        default: DEFAULT_PLANT_IMAGE_PATH,
        maxLength: 500,
    })
    @Column({ type: "varchar", length: 500, default: DEFAULT_PLANT_IMAGE_PATH })
    imagePath: string;

    @ApiProperty({
        description: "Last watering date",
        example: "2025-09-20T10:30:00.000Z",
        nullable: true,
    })
    @Column({ type: "datetime", nullable: true })
    lastWatered: Date;
}
