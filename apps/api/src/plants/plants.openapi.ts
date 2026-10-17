import {
    CreatePlantRequestSchema,
    PlantListSchema,
    PlantSchema,
    UpdatePlantRequestSchema,
} from "@leaf/shared";
import type { ApiBody } from "@nestjs/swagger";
import * as z from "zod/mini";

/** What `@ApiBody`/`@ApiOkResponse` take as `schema` (not exported by name). */
type SchemaObject = Extract<
    NonNullable<Parameters<typeof ApiBody>[0]>,
    { schema: unknown }
>["schema"];

// The Swagger document is generated from the same schemas that validate
// requests here and responses in the web app, so it cannot drift from them.

function toOpenApi(
    schema: z.ZodMiniType,
    io: "input" | "output",
): SchemaObject {
    return z.toJSONSchema(schema, {
        target: "openapi-3.0",
        io,
        // Zod adds the regular expression behind every `format`; the format
        // alone reads better in Swagger UI.
        override: ({ jsonSchema }) => {
            if (jsonSchema.format !== undefined) {
                delete jsonSchema.pattern;
            }
        },
    }) as SchemaObject;
}

export const plantSchemas = {
    plant: toOpenApi(PlantSchema, "output"),
    plantList: toOpenApi(PlantListSchema, "output"),
    createBody: toOpenApi(CreatePlantRequestSchema, "input"),
    updateBody: toOpenApi(UpdatePlantRequestSchema, "input"),
    imageUploadBody: {
        type: "object",
        required: ["image"],
        properties: {
            image: {
                type: "string",
                format: "binary",
                description: "Image file to upload (jpg, jpeg, png or gif)",
            },
        },
    } satisfies SchemaObject,
};
