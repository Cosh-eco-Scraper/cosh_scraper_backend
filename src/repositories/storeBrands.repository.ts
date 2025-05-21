import databasePool from "../config/dbConnectionConfig";
import { updateStore } from "../controllers/store.controller";
import NotFoundError from "../domain/errors/NotFoundError";
import { storeBrandsQueries } from "./queries/storeBrands.querries";

export const storeBrandsRepository = {
    updateStoreBrands: async (storeId: number, brandId: number): Promise<void> => {
        try {
            databasePool.connect();

            const result = await databasePool.query(
                storeBrandsQueries.updateStoreBrands(storeId, brandId)
            );

            if (!result.rowCount) {
                throw new NotFoundError('Store or brand not found');
            }
        } catch (error) {
            console.error('Error updating store brands:', error);
            throw new Error('Error updating store brands');
        }
    }
};