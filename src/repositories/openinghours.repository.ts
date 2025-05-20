import databasePool from "../config/dbConnectionConfig";
import { openingHoursQueries } from "./queries/openinghours.queries";

export const openingHoursRespository = {
    updateOpeningHours: async (openingHoursId: number, day: string, startTime: string, endTime: string, store_id: number): Promise<void> => {
        try {
            databasePool.connect();
            const result = await databasePool.query(openingHoursQueries.updateOpeningHours(openingHoursId, day, startTime, endTime, store_id));

            if (!result.rowCount) {
                throw new Error("Opening hours not found");
            }
        } catch (error) {
            console.error("Error updating opening hours:", error);
            throw new Error("Database error");
        }
    }
}