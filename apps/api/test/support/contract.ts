import { type Plant, PlantListSchema, PlantSchema } from "@leaf/shared";

// The web app validates every plant it receives against these schemas from
// packages/shared. The assertions below hold the API to the same contract,
// fail with the schema's own description of what does not match, and return
// the body typed (supertest's `res.body` is `any`).

type SafeParseResult =
    | { success: true }
    | {
          success: false;
          error: { issues: { path: PropertyKey[]; message: string }[] };
      };

function issuesOf(result: SafeParseResult): string[] {
    if (result.success) {
        return [];
    }
    return result.error.issues.map(
        (issue) => `${issue.path.map(String).join(".")}: ${issue.message}`,
    );
}

/** Asserts that a response body is one plant as the web app expects it. */
export function expectPlant(body: unknown): Plant {
    expect(issuesOf(PlantSchema.safeParse(body))).toEqual([]);
    // The body itself, not the parse result: parsing would strip unknown
    // properties, hiding them from a test's `toEqual`.
    return body as Plant;
}

/** Asserts that a response body is a list of plants as the web app expects it. */
export function expectPlantList(body: unknown): Plant[] {
    expect(issuesOf(PlantListSchema.safeParse(body))).toEqual([]);
    return body as Plant[];
}
