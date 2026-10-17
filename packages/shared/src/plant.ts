// `zod/mini` with a namespace import keeps this tree-shakable: the web app
// pays for the validators it uses (~18 kB raw), not for all of Zod.
import * as z from "zod/mini";

/** A plant as the API returns it. */
export const PlantSchema = z.object({
    id: z
        .int()
        .check(
            z.positive(),
            z.meta({ description: "Auto-incremented identifier", example: 1 }),
        ),
    name: z
        .string()
        .check(z.meta({ description: "Plant name", example: "Snake Plant" })),
    imagePath: z.string().check(
        z.meta({
            description: "Image path, relative to the API's origin",
            example: "/static/plant_1_1712345678.png",
        }),
    ),
    lastWatered: z.nullable(z.iso.datetime()).check(
        z.meta({
            description: "Last watering, as an ISO 8601 UTC timestamp",
            example: "2025-09-20T10:30:00.000Z",
        }),
    ),
    wateringIntervalDays: z.nullable(z.int().check(z.positive())).check(
        z.meta({
            description:
                "Days between waterings, or null when no interval is set",
            example: 7,
        }),
    ),
});

export const PlantListSchema = z.array(PlantSchema);

export type Plant = z.infer<typeof PlantSchema>;

// The column is varchar(255). Only requests are limited: names stored before
// the limit existed may be longer, and the web app must still accept them.
const name = z.string().check(
    z.maxLength(255),
    z.meta({
        description: "Human-friendly name of the plant",
        example: "Snake Plant",
    }),
);

// A calendar date (what the web app sends) or a date-time, with or without
// an offset. `null` clears the date.
const lastWatered = z
    .nullable(
        z.union([z.iso.date(), z.iso.datetime({ offset: true, local: true })]),
    )
    .check(
        z.meta({
            description: "Last watering date in ISO 8601 format",
            example: "2025-09-20T10:30:00.000Z",
        }),
    );

// Whole days, up to a year. `null` clears the interval.
const wateringIntervalDays = z
    .nullable(z.int().check(z.positive(), z.lte(365)))
    .check(
        z.meta({
            description: "Days between waterings (1 to 365)",
            example: 7,
        }),
    );

// Strict: unknown properties are refused. There is no `imagePath`: only the
// upload endpoint sets it, and it names the file that is deleted when the
// image is replaced or the plant removed.
export const CreatePlantRequestSchema = z.strictObject({
    name,
    lastWatered: z.optional(lastWatered),
    wateringIntervalDays: z.optional(wateringIntervalDays),
});

export type CreatePlantRequest = z.infer<typeof CreatePlantRequestSchema>;

/** Every field may be left out; `lastWatered` and `wateringIntervalDays` accept `null`. */
export const UpdatePlantRequestSchema = z.partial(CreatePlantRequestSchema);

export type UpdatePlantRequest = z.infer<typeof UpdatePlantRequestSchema>;
