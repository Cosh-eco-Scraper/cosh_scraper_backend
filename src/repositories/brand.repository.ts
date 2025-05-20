import databaseClient from "../config/dbConnectionConfig"
import { Brand } from "../domain/Brand";
import { mapper } from "./mapper";
import { brandQueries } from "./queries/brands.queries";

export const BrandRepository = {
    updateBrand: async (brandId: number, name: string, label: string): Promise<void> => {
        try {

            console.log(databaseClient);
            databaseClient.connect();

            console.log(databaseClient);
            const result = await databaseClient.query(brandQueries.updateBrand(brandId, name, label));

            console.log("Brand updated successfully", result);

            if (!result.rowCount) {
                throw new Error("Brand not found");
            }

        } finally {
            databaseClient.end();
            console.log(databaseClient);
            console.log("Database connection closed");
        }
    }
};