import { PlantListSchema, PlantSchema } from "@leaf/shared";

// The web app validates every plant it receives against these schemas from
// packages/shared. The assertions below hold the API to the same contract,
// and fail with the schema's own description of what does not match.

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
export function expectPlant(body: unknown): void {
    expect(issuesOf(PlantSchema.safeParse(body))).toEqual([]);
}

/** Asserts that a response body is a list of plants as the web app expects it. */
export function expectPlantList(body: unknown): void {
    expect(issuesOf(PlantListSchema.safeParse(body))).toEqual([]);
}
