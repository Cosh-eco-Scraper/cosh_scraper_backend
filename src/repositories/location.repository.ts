import databasePool from "../config/dbConnectionConfig";
import NotFoundError from "../domain/errors/NotFoundError";
import { locationQuerries } from "./queries/location.querries";


export const LocationRepository = {
    updateLocation: async (locationId?: number, street?: string, number?: string, postal_code?: string, city?: string, country?: string): Promise<number> => {
        try {
            const result = await databasePool.query(locationQuerries.updateLocation(locationId, street, number, postal_code, city, country));

            if (!result.rowCount) {
                throw new NotFoundError("Location not found");
            }
        } finally {
            return locationId as number;
        }
    }
}