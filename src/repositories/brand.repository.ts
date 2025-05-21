import databasePool from "../config/dbConnectionConfig"
import { Brand } from "../domain/Brand";
import { mapper } from "./mapper";
import { brandQueries } from "./queries/brands.queries";

export const BrandRepository = {
    updateBrand: async (brandId?: number, name?: string, label?: string): Promise<void> => {
        try {

            databasePool.connect();

            const result = await databasePool.query(brandQueries.updateBrand(brandId, name, label));

            console.log("Brand updated successfully", result);

            if (!result.rowCount) {
                throw new Error("Brand not found");
            }

        } catch (error) {
            console.error("Error updating brand:", error);
            throw new Error("Error updating brand");
        }
    }
};