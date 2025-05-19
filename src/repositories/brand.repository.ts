import databaseClient from "../config/dbConnectionConfig"
import { Brand } from "../domain/Brand";
import { brandMapper } from "./mapper";
import { brandQueries } from "./queries/brands.queries";

export const BrandRepository = {
    updateBrand: async (brandId: number, name: string, label: string) => {
        try {
            databaseClient.connect();
            const result = await databaseClient.query(brandQueries.updateBrand(brandId, name, label));

            if (!result.rowCount) {
                throw new Error("Brand not found");
            }

            const brand = brandMapper.mapBrands(result.rows[0]);
            return brand;
        } finally {
            databaseClient.end();
        }
    }
};