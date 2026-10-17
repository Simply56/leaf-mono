import type { Plant as PlantResponse } from "@leaf/shared";

/**
 * A plant as the app uses it: the API's plant, checked against the shared
 * schema when it arrives (PlantsService), with `imagePath` turned into an
 * absolute URL and `lastWatered` parsed into a Date.
 */
export default interface Plant extends Omit<PlantResponse, "lastWatered"> {
    lastWatered: Date | null;
}
