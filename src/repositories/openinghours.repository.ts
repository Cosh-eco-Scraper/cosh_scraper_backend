import databasePool from "../config/dbConnectionConfig";
import NotFoundError from "../domain/errors/NotFoundError";
import { openingHoursQueries } from "./queries/openinghours.queries";

export const openingHoursRespository = {
    updateOpeningHours: async (openingHoursId?: number, day?: string, startTime?: string, endTime?: string, store_id?: number): Promise<number> => {
        try {
            databasePool.connect();
            const result = await databasePool.query(openingHoursQueries.updateOpeningHours(openingHoursId, day, startTime, endTime, store_id));

            if (!result.rowCount) {
                throw new NotFoundError("Opening hours not found");
            }

            return openingHoursId as number;
        } catch (error) {
            console.error("Error updating opening hours:", error);
            throw new Error("Error updating opening hours");
        }
    }
}